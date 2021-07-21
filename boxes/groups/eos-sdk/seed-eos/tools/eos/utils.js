const { requireBox } = require('@liquidapps/box-utils');
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { getEosWrapper } = require('./eos-wrapper');
const eosjs = require('eosjs');
const { createKeys, getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getUrl } = require('./networks');
const fetch = require('node-fetch');
const { emojMap, execPromise } = requireBox('seed-zeus-support/_exec');

async function createAccount(wallet, creator, account, args = getDefaultArgs(), sidechain) {
  if (!args)
    args = getDefaultArgs();
  var newKeys = await getCreateKeys(account, args, null, sidechain);
  var eos = await getEos(creator, args, sidechain);
  var pubkey = newKeys.active.publicKey;
  await eos.transact({
    actions: [{
      account: 'eosio',
      name: 'newaccount',
      authorization: [{
        actor: creator,
        permission: 'active',
      }],
      data: {
        creator,
        name: account,
        owner: {
          threshold: 1,
          keys: [{
            key: pubkey,
            weight: 1
          }],
          accounts: [],
          waits: []
        },
        active: {
          threshold: 1,
          keys: [{
            key: pubkey,
            weight: 1
          }],
          accounts: [],
          waits: []
        },
      },
    }]
  }, {
    expireSeconds: 30,
    sign: true,
    broadcast: true,
    blocksBehind: 3
  });
  newKeys.account = account;
  return newKeys;
}

async function getCreateAccount(account, args = getDefaultArgs(), dontCreateIfHaveKeys, sidechain) {
  if (!args)
    args = getDefaultArgs();
  const { creator, stake, transfer } = args;
  var existingKeys = await getCreateKeys(account, args, dontCreateIfHaveKeys, sidechain);
  // import keys if needed

  // import keys if needed ${process.env.EOSIO_CUSTOM_TOKEN_PRECISION ? process.env.EOSIO_CUSTOM_TOKEN_PRECISION :4},${}
  var systemToken = args.customToken?args.customToken:(args.creator !== 'eosio') ? 'EOS' : 'SYS';
  let precisionString = '';
  for(let i = 0; i <  args.customTokenPrecision; i++) {
    precisionString += '0';
  }
  var staking = stake;
  if (creator != account) {
    try {
      var eos = await getEos(creator, args, sidechain);
      var pubkey = existingKeys.active.publicKey;
      // console.log(account,existingKeys);
      // await eos.transaction(tr => {
      const result = await eos.transact({
        actions: [{
          account: 'eosio',
          name: 'newaccount',
          authorization: [{
            actor: creator,
            permission: 'active',
          }],
          data: {
            creator,
            name: account,
            owner: {
              threshold: 1,
              keys: [{
                key: pubkey,
                weight: 1
              }],
              accounts: [],
              waits: []
            },
            active: {
              threshold: 1,
              keys: [{
                key: pubkey,
                weight: 1
              }],
              accounts: [],
              waits: []
            },
          },
        },
        {
          account: 'eosio',
          name: 'buyram',
          authorization: [{
            actor: creator,
            permission: 'active',
          }],
          data: {
            payer: creator,
            receiver: account,
            quant: `${staking}.${precisionString} ${systemToken}`,
          },
        },
        {
          account: 'eosio',
          name: 'delegatebw',
          authorization: [{
            actor: creator,
            permission: 'active',
          }],
          data: {
            from: creator,
            receiver: account,
            stake_net_quantity: `${staking}.${precisionString} ${systemToken}`,
            stake_cpu_quantity: `${staking}.${precisionString} ${systemToken}`,
            transfer: false,
          }
        },
        {
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{
            actor: creator,
            permission: 'active',
          }],
          data: {
            from: creator,
            to: account,
            quantity: `${transfer}.${precisionString} ${systemToken}`,
            memo: "don't spend it all in one place",
          }
        }
        ]
      }, {
        blocksBehind: 3,
        expireSeconds: 30,
      });
      // });
      // eos.newaccount(creator,account,existingKeys.publicKey,existingKeys.publicKey,`${staking} ${systemToken}`);
    }
    catch (e) { 
      if(JSON.stringify(e).includes('Cannot create account named')) {

      } else {
        console.log(e); 
      }
    }
  }
  // give some SYS/EOS
  return existingKeys;
}
const getEos = async (account, args = getDefaultArgs(), sidechain) => {
  if (!args)
    args = getDefaultArgs();
  var selectedNetwork = getNetwork(args, sidechain);
  var config = {
    chainId: selectedNetwork.chainId
  };

  if (account) {
    if (account == args.creator && args.creatorKey) {
      config.keyProvider = args.creatorKey;
    }
    else {
      var keys = await getCreateKeys(account, args, true, sidechain);
      config.keyProvider = keys.active.privateKey;
    }
  }

  var endpoint = getUrl(args, sidechain);
  config.httpEndpoint = endpoint;
  config.authorization = `${account}@active`;
  return await getEosWrapper(config);
};

const uploadContract = async (args, name, contract, sidechain) => {
  var wasm = fs.readFileSync(`./contracts/eos/${path.basename(contract)}/${path.basename(contract)}.wasm`);
  var abi = fs.readFileSync(`./contracts/eos/${path.basename(contract)}/${path.basename(contract)}.abi`, "utf-8");
  var eos = await getEos(name, args, sidechain);
  // Publish contract to the blockchain
  try {
    const result = await eos.transact({
      actions: [{
        account: 'eosio',
        name: 'setcode',
        authorization: [{
          actor: name,
          permission: 'active',
        }],
        data: {
          account: name,
          vmtype: 0,
          vmversion: 0,
          code: Buffer.from(wasm).toString('hex')
        },
      },

      ]
    }, {
      blocksBehind: 0,
      expireSeconds: 30,

    });
  }
  catch (e) {
    var eobj = e.json;
    if (eobj && eobj.code == 500 && eobj.error.name == 'set_exact_code') {
      
    }
    else {
      throw e;
    }
  }
  const buffer = new eosjs.Serialize.SerialBuffer({
    textEncoder: eos.textEncoder,
    textDecoder: eos.textDecoder,
  });
  abi = JSON.parse(abi);
  let abiDefinition = eos.abiTypes.get('abi_def');
  abi = abiDefinition.fields.reduce(
    (acc, { name: fieldName }) => Object.assign(acc, {
      [fieldName]: acc[fieldName] || []
    }),
    abi,
  );
  abiDefinition.serialize(buffer, abi);
  const contractAbi = Buffer.from(buffer.asUint8Array()).toString(`hex`);
  const result = await eos.transact({
    actions: [{
      account: 'eosio',
      name: 'setabi',
      authorization: [{
        actor: name,
        permission: 'active',
      }],
      data: {
        account: name,
        abi: contractAbi
      },
    }

    ]
  }, {
    blocksBehind: 0,
    expireSeconds: 30,
  });
  console.log(`${emojMap.zap}uploaded contract ${path.basename(contract)} to account ${name}`);
};

const uploadSystemContract = async (args, name, contract, sidechain) => {
  contract = contract || name;
  await uploadContract(args, name, `${path.resolve('.')}/contracts/eos/${contract}`, sidechain);
};

const getLocalDSPEos = async (account, sidechain, local = false) => {
  // create token
  var selectedNetwork = getNetwork(getDefaultArgs());
  var config = {
    expireInSeconds: 120,
    sign: true,
    chainId: selectedNetwork.chainId,
    httpEndpoint: `http://localhost:${local? '8888' : '13015'}`
  };
  if (account) {
    var keys = await getCreateKeys(account);
    config.keyProvider = keys.active.privateKey;
  }

  return getEosWrapper(config);

}

const getTestContract = async (code, sidechain, local) => {
  var eos = await getLocalDSPEos(code, sidechain, local);
  return await eos.contract(code);
}

const enableEosioFeature = async (args, name, feature_digest, sidechain) => {
    const eos = await getEos(name, args, sidechain);
    // Publish contract to the blockchain
    try {
      await eos.transact({
        actions: [{
          account: 'eosio',
          name: 'activate',
          authorization: [{
            actor: name,
            permission: 'active',
          }],
          data: {
            feature_digest
          },
        },
        ]
      }, {
        blocksBehind: 0,
        expireSeconds: 30,

      });
    }
    catch (e) {
      var eobj = e.json;
      if (eobj && eobj.code == 500 && eobj.error.name == 'set_exact_code') {
        
      } else if(JSON.stringify(e).includes('is unrecognized')) {
        // don't throw 
      }
      else {
        throw e;
    }
  }
}

const eosioFeatures = [
  {"KV_DATABASE": "825ee6288fb1373eab1b5187ec2f04f6eacb39cb3a97f356a07c91622dd61d16"},
  {"ACTION_RETURN_VALUE": "c3a6138c5061cf291310887c0b5c71fcaffeab90d5deb50d3b9e687cead45071"},
  {"CONFIGURABLE_WASM_LIMITS": "bf61537fd21c61a60e542a5d66c3f6a78da0589336868307f94a82bccea84e88"},
  {"BLOCKCHAIN_PARAMETERS": "5443fcf88330c586bc0e5f3dee10e7f63c76c00249c87fe4fbf7f38c082006b4"},
  {"ONLY_BILL_FIRST_AUTHORIZER": "8ba52fe7a3956c5cd3a656a3174b931d3bb2abb45578befc59f283ecd816a405"},
  {"DISALLOW_EMPTY_PRODUCER_SCHEDULE": "68dcaa34c0517d19666e6b33add67351d8c5f69e999ca1e37931bc410a297428"},
  {"ONLY_LINK_TO_EXISTING_PERMISSION": "1a99a59d87e06e09ec5b028a9cbb7749b4a5ad8819004365d02dc4379a8b7241"},
  {"FIX_LINKAUTH_RESTRICTION": "e0fb64b1085cc5538970158d05a009c24e276fb94e1a0bf6a528b48fbc4ff526"},
  {"RAM_RESTRICTIONS": "4e7bf348da00a945489b2a681749eb56f5de00b900014e137ddae39f48f69d67"},
  // disabled by default
  // {"REPLACE_DEFERRED": "ef43112c6543b88db2283a2e077278c315ae2c84719a8b25f25cc88565fbea99"},
  // {"NO_DUPLICATE_DEFERRED_ID": "4a90c00d55454dc5b059055ca213579c6ea856967712a56017487886a4d4cc0f"},
  // {"RESTRICT_ACTION_TO_SELF": "ad9e3d8f650687709fd68f4b90b41f7d825a365b02c23a636cef88ac2ac00c43"},
  // {"FORWARD_SETCODE": "2652f5f96006294109b3dd0bbde63693f55324af452b799ee137a81a905eed25"},
  // {"GET_SENDER": "f0af56d2c5a48d60a4a5b5c903edfb7db3a736a94ed589d0b797df33ff9d3e1d"},
  // {"WEBAUTHN_KEY": "4fca8bd82bbd181e714e283f83e1b45d95ca5af40fb89ad3977b653c448f78c2"},
  {"WTMSIG_BLOCK_SIGNATURES": "299dcb6af692324b899b39f16d5a530a33062804e41f09dc97e9f156b4476707"},
]

const enableEosioFeatures = async (args, name, sidechain, alternativeFeatureList = []) => {
  const list = alternativeFeatureList.length ? alternativeFeatureList : eosioFeatures
  for(const el of list) {
    console.log(`${emojMap.zap}enabling: ${Object.keys(el)}`)
    await enableEosioFeature(args, name, el[Object.keys(el)], sidechain)
  }
}

const setPriv = async (args, sidechain) => {
  const name = 'eosio';
  const eos = await getEos(name, args, sidechain);
  // Publish contract to the blockchain
  console.log(`${emojMap.zap}setting up system token ${args.customTokenPrecision ? args.customTokenPrecision :4},${args.customToken?args.customToken:(args.creator !== 'eosio') ? 'EOS' : 'SYS'}`)
  try {
    await eos.transact({
      actions: [{
        account: 'eosio',
        name: 'setpriv',
        authorization: [{
          actor: name,
          permission: 'active',
        }],
        data: {
          account: 'eosio.msig',
          is_priv: 1
        },
      },
      ]
    }, {
      blocksBehind: 0,
      expireSeconds: 30,
    });
    await eos.transact({
      actions: [{
        account: 'eosio',
        name: 'init',
        authorization: [{
          actor: name,
          permission: 'active',
        }],
        data: {
          version: "0",
          core: `${args.customTokenPrecision ? args.customTokenPrecision :4},${args.customToken?args.customToken:(args.creator !== 'eosio') ? 'EOS' : 'SYS'}`
        },
      },
      ]
    }, {
      blocksBehind: 0,
      expireSeconds: 30,
    });
  }
  catch (e) {
    var eobj = e.json;
    if (eobj && eobj.code == 500 && eobj.error.name == 'set_exact_code') {
      
    }
    else {
      throw e;
    }
  }
}

const preactiveChain = async (sidechain) => {
  const body = {"protocol_features_to_activate": ["0ec7e080177b2c02b278d5088611686b49d739925a92d9bfcacd7fc6b74053bd"]}
  await fetch(`http://127.0.0.1:${sidechain ? 2424 : 8888}/v1/producer/schedule_protocol_feature_activations`, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" }
  })
}

const genRandomId = () => Array.apply(null, { length: 64 }).map(Function.call, () => Math.floor(9 * Math.random())).join('')

module.exports = { execPromise, createKeys, createAccount, getCreateAccount, getNetwork, getUrl, uploadSystemContract, uploadContract, getEos, getLocalDSPEos, getCreateKeys, getTestContract, genRandomId, enableEosioFeatures, preactiveChain, setPriv };
