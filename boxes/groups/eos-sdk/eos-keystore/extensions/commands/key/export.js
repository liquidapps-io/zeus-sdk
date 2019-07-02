const safe = require('../../helpers/safe');
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
        default: false
      })
      .option('storage-path', {
        describe: 'path to where the key is stored',
        type: 'string',
        default: `${home}/.zeus/networks`
      })
      .option('network', {
        describe: 'network',
        type: 'string',
        default: 'development'
      })
      .option('password', {
        describe: 'password to decrypt the keypair',
        type: 'string'
      })
      .example('zeus key export eosio')
  },
  command: `${cmd} <account>`,
  handler: async (args) => {
    try {
      const keyDir = args.encrypted ? 'encrypted-accounts' : 'accounts';
      const fullPath = `${args['storage-path']}/${args.network}/${keyDir}`;
      const accountPath = `${fullPath}/${args.account}.json`;
      let keys;

      if (!fs.existsSync(accountPath)){
        return console.log(`Account ${args.account} does not exist on network ${args.network}`);
      }

      if (!args.encrypted) {
        keys = JSON.parse(fs.readFileSync(accountPath));
        return console.log(keys);
      }

      if (!args.password){
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
