const { requireBox } = require('@liquidapps/box-utils');
const { execPromise, emojMap } = requireBox('seed-zeus-support/_exec');
const { createClient } = requireBox('client-lib-base/client/dist/src/dapp-client-lib');
const { PrivateKey } = require('eosjs-ecc');
const safe = requireBox('eos-keystore/helpers/safe');
const fetch = require('isomorphic-fetch');
const os = require('os');;
const fs = require('fs');
const home = os.homedir();

module.exports = {
  description: 'Push a LiquidAccount action',
  builder: (yargs) => {
    yargs
      .option('dsp-url', {
        describe: 'DAPP Service Provider endpoint',
        alias: 'u',
        default: 'http://127.0.0.1:13015'
      })
      .option('private-key', {
        describe: 'LiquidAccount private key, can be provided or auto generated',
        alias: 'k',
        default: ''
      })
      .option('encrypted', {
        describe: 'Encrypt the LiquidAccount keys with a password',
        type: 'boolean',
        alias: 'e',
        default: false
      })
      .option('password', {
        describe: 'password to encrypt the LiquidAccount keys with',
        type: 'string',
        alias: 'p'
      })
      .option('network', {
        describe: 'network LiquidAccount contract deployed on',
        type: 'string',
        alias: 'n',
        default: 'development'
      })
      .option('storage-path', {
        describe: 'path to the wallet which will store the LiquidAccount key',
        type: 'string',
        alias: 's',
        default: `${home}/.zeus/networks`
      })
      .option('time-to-live', {
        describe: 'time in seconds before transaction expires',
        type: 'number',
        alias: 't',
        default: 120
      })
      .example(`$0 vaccounts push-action test1v regaccount '{"vaccount":"vaccount1"}'`)
      .example(`$0 vaccounts push-action vacctstst123 regaccount '{"vaccount":"testing11"}' --private-key 5KJL... -u https://kylin-dsp-1.liquidapps.io`)
      .example(`$0 vaccounts push-action vacctstst123 regaccount '{"vaccount":"t2"}' -u http://kylin-dsp-2.liquidapps.io/ --encrypted --network=kylin --password=password`)
  },
  command: 'push-action <contract> <action> <payload>',

  handler: async (args) => {
    // setup client
    const getClient = async () => {
      return await createClient({ httpEndpoint: args.dspUrl, fetch });
    };

    // check if args passed
    if (!args.contract) throw new Error(`Must pass contract name LiquidAccount code is deployed to, see (zeus vaccounts push-action --help)`);
    if (!args.action) throw new Error(`Must pass contract action name (regaccount, hello, etc..), see (zeus vaccounts push-action --help)`);
    if (!args.payload) throw new Error(`Must pass payload argument, see (zeus vaccounts push-action --help)`);
    args.payload = JSON.parse(args.payload)
    if (!args.payload.vaccount) throw new Error(`Must pass vaccount in payload with syntax '{"vaccount":"vaccountname", ... }', see (zeus vaccounts push-action --help)`);

    // setup dir
    const keyDir = args.encrypted ? `encrypted-vaccounts` : `vaccounts`;
    const fullPath = `${args['storage-path']}/${args.network}/${keyDir}`;
    const accountPath = `${fullPath}/${args.payload.vaccount}.json`;

    // check if keys were imported already
    const checkExistingKeys = () => {
      if (!args.encrypted)
        args.privateKey = JSON.parse(fs.readFileSync(accountPath)).owner.privateKey;
      if (!args.password && args.encrypted)
        args.privateKey = JSON.parse(safe.promptDecryptData(accountPath)).owner.privateKey;
      else if (args.password && args.encrypted)
        args.privateKey = JSON.parse(safe.decryptData(accountPath, args.password)).owner.privateKey;
      console.log(emojMap.ok + `Fetched keys for ${args.payload.vaccount}`);
    }

    // if no private key, fetch keys or create keys and store in ${home}/.zeus/networks
    if (!args.privateKey) {
      // if no keys path and not regaccount, throw error because regaccount needed or keys needed from previous regaccount
      if (!fs.existsSync(accountPath) && args.action !== 'regaccount')
        throw new Error(emojMap.white_frowning_face + `Could not find ${args.payload.vaccount} keys at: ${accountPath}, please import keys or regaccount`);
      // if vaccount key file exist, pull keys from it
      if (fs.existsSync(accountPath))
        await checkExistingKeys();
      else {
        // create new keypair and import
        await PrivateKey.randomKey().then(privateKey => args.privateKey = privateKey.toWif())
        const encrypted = args.encrypted ? `--encrypted=${args.encrypted}` : '';
        const password = args.password ? `--password=${args.password}` : '';
        const storagePath = args.storagePath ? `--storage-path=${args.storagePath}` : '';
        const network = args.network ? `--network=${args.network}` : '';
        await execPromise(`zeus key import ${args.payload.vaccount} --vaccount=true --owner-private-key ${args.privateKey} --active-private-key ${args.privateKey} ${encrypted} ${password} ${storagePath} ${network}`);
        console.log(`New keypair imported to ${accountPath}\nPublic Key: ${await PrivateKey.fromString(args.privateKey).toPublic().toString()}`)
      }
    }

    // setup vaccounts dapp-client service and push trx
    try {
      console.log(emojMap.zap + 'Pushing LiquidAccount transaction');
      const service = await (await getClient()).service('vaccounts', args.contract);
      await service.push_liquid_account_transaction(
        args.contract,
        args.privateKey,
        args.action,
        args.payload,
        {
          time_to_live: args.timeToLive
        }
      );
      console.log(emojMap.ok + 'Transaction successful');
    }
    catch (e) {
      console.log(`${emojMap.white_frowning_face} Transaction failed\n`)
      throw e;
    }
  }
};
