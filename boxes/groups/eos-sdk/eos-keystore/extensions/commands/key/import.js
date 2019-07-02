var { execPromise } = require('../../helpers/_exec');
const safe = require('../../helpers/safe');
const eosjs = require('eosjs-ecc');
const fs = require('fs');
const os = require('os');

const home = os.homedir();

module.exports = {
  description: 'Imports a key to your zeus wallet',
  builder: (yargs) => {
    yargs
      .option('encrypted', {
        describe: 'Encrypt the account keys with a password',
        type: 'boolean',
        default: false
      })
      .option('storage-path', {
        describe: 'path to the wallet which will store the key',
        type: 'string',
        default: `${home}/.zeus/networks`
      })
      .option('network', {
        describe: 'network',
        type: 'string',
        default: 'development'
      })
      .option('password', {
        describe: 'password to encrypt the keys with',
        type: 'string'
      })
      .example(`$0 key import eosio --owner-private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3 --active-private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3`)
  },
  command: `import <account>`,
  handler: async (args) => {
    const keyDir = args.encrypted ? 'encrypted-accounts' : 'accounts';
    const fullPath = `${args['storage-path']}/${args.network}/${keyDir}`;
    const accountPath = `${fullPath}/${args.account}.json`;
    
    // active private key defaults to active owner key
    args['active-private-key'] = args['active-private-key'] || args['owner-private-key'];

    // if the dir doesn't exist yet, create it
    if (!fs.existsSync(fullPath)){
      await execPromise(`mkdir -p ${fullPath}`);
    }

    let ownerPublicKey, activePublicKey;
    try {
      ownerPublicKey = eosjs.privateToPublic(args['owner-private-key']);
      activePublicKey = eosjs.privateToPublic(args['active-private-key']);
    } catch(e) {
      return console.log('Invalid keys provided');
    }

    // should we have two files of this format for each keypair (owner/active)
    // to stick with current convention, or keep all 4 keys in one file
    const data = {
      owner: {
        privateKey: args['owner-private-key'],
        publicKey: ownerPublicKey
      },
      active: {
        privateKey: args['active-private-key'],
        publicKey: activePublicKey
      }
    }
    if (!args.encrypted) {
      // write the file as plaintext in ${storage-path}/${account}.json
      fs.writeFileSync(accountPath, JSON.stringify(data));
      return;
    }

    if (!args.password) {
      // if no password is passed, prompt the user to encrypt the file
      safe.promptEncryptData(JSON.stringify(data), accountPath); 
    } else {
      safe.encryptData(JSON.stringify(data), accountPath, args.password);
    }
  }
};

