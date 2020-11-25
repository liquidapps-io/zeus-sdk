const { requireBox } = require('@liquidapps/box-utils');
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { getEosWrapper } = require('./eos-wrapper');
const eosjs = require('eosjs');
const { createKeys, getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getUrl } = require('./networks');

const execPromise = function (cmd, options) {
  return new Promise(function (resolve, reject) {
    exec(cmd, options, function (err, stdout) {
      if (err) {
        err.stdout = stdout;
        return reject(err);
      }
      resolve(stdout);
    });
  });
};

async function createAccount(wallet, creator, account, args = getDefaultArgs(), sidechain) {
  if (!args)
    args = getDefaultArgs();
  var newKeys = await getCreateKeys(account, args, sidechain);
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
  const { creator, stake } = args;
  var existingKeys = await getCreateKeys(account, args, dontCreateIfHaveKeys, sidechain);
  // import keys if needed

  // import keys if needed
  var systemToken = (creator !== 'eosio') ? 'EOS' : 'SYS';
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
            quant: `${staking} ${systemToken}`,
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
            stake_net_quantity: `${staking} ${systemToken}`,
            stake_cpu_quantity: `${staking} ${systemToken}`,
            transfer: false,
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
    catch (e) { }
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
    if (account == args.creator) {
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
  var wasm = fs.readFileSync(`./zeus_boxes/contracts/eos/${path.basename(contract)}/${path.basename(contract)}.wasm`);
  var abi = fs.readFileSync(`./zeus_boxes/contracts/eos/${path.basename(contract)}/${path.basename(contract)}.abi`, "utf-8");
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
};

const uploadSystemContract = async (args, name, contract, sidechain) => {
  contract = contract || name;
  await uploadContract(args, name, `${path.resolve('.')}/contracts/eos/${contract}`, sidechain);
};

const getLocalDSPEos = async (account, sidechain) => {
  // create token
  var selectedNetwork = getNetwork(getDefaultArgs());
  var config = {
    expireInSeconds: 120,
    sign: true,
    chainId: selectedNetwork.chainId,
    httpEndpoint: "http://localhost:13015"
  };
  if (account) {
    var keys = await getCreateKeys(account);
    config.keyProvider = keys.active.privateKey;
  }

  return getEosWrapper(config);

}

const getTestContract = async (code, sidechain) => {
  var eos = await getLocalDSPEos(code, sidechain);
  return await eos.contract(code);

}

const genRandomId = () => Array.apply(null, { length: 64 }).map(Function.call, () => Math.floor(9 * Math.random())).join('')

module.exports = { execPromise, createKeys, createAccount, getCreateAccount, getNetwork, getUrl, uploadSystemContract, uploadContract, getEos, getLocalDSPEos, getCreateKeys, getTestContract, genRandomId };
