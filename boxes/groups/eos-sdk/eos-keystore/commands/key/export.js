const { requireBox } = require('@liquidapps/box-utils');
const safe = requireBox('eos-keystore/helpers/safe');
const fs = require('fs');
const os = require('os');

const cmd = 'export'
const home = os.homedir();

module.exports = {
  description: 'Exports a key that was imported by zeus',
  builder: (yargs) => {
    yargs
      .option('encrypted', {
        describe: 'exports encrypted key',
        type: 'boolean',
        alias: 'e',
        default: false
      })
      .option('storage-path', {
        describe: 'path to where the key is stored',
        type: 'string',
        alias: 's',
        default: `${home}/.zeus/networks`
      })
      .option('network', {
        describe: 'network',
        type: 'string',
        alias: 'n',
        default: 'development'
      })
      .option('password', {
        describe: 'password to decrypt the keypair',
        alias: 'p',
        type: 'string'
      })
      .option('vaccount', {
        describe: 'vaccount or not',
        type: 'boolean',
        alias: 'v',
        default: false
      })
      .example(`$0 key export eosio`)
      .example(`$0 key export eosio --encrypted=true`)
      .example(`$0 key export eosio --encrypted=true --password=password`)
      .example(`$0 key export vaccountname --vaccount=true`)
      .example(`$0 key export vaccountname --vaccount=true --encrypted=true`)
      .example(`$0 key export vaccountname --vaccount=true  --encrypted=true --password=password`)
  },
  command: `${cmd} <account>`,
  handler: async (args) => {
    try {
      const vaccountPrefix = args.vaccount ? 'v' : '';
      const keyDir = args.encrypted ? `encrypted-${vaccountPrefix}accounts` : `${vaccountPrefix}accounts`;
      const fullPath = `${args['storage-path']}/${args.network}/${keyDir}`;
      const accountPath = `${fullPath}/${args.account}.json`;
      let keys;

      if (!fs.existsSync(accountPath)) {
        return console.log(`Account ${args.account} does not exist on network ${args.network}`);
      }

      if (!args.encrypted) {
        keys = JSON.parse(fs.readFileSync(accountPath));
        return console.log(keys);
      }

      if (!args.password) {
        // if no password is given prompt the user
        keys = safe.promptDecryptData(accountPath);
        return console.log(keys);
      } else {
        keys = safe.decryptData(accountPath, args.password);
        return console.log(keys);
      }
    } catch (e) {
      if (args.encrypted)
        throw new Error('Encountered an error while trying to export keys. Perhaps the keys aren\'t encrypted?')
      else
        throw new Error('Encountered an error while trying to export keys. Perhaps the keys are encrypted?')
    }
  }
};
