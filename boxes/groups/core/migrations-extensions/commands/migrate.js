var path = require('path');
var { requireBox, createDir } = require('@liquidapps/box-utils');
var { execScripts, emojMap } = requireBox('seed-zeus-support/_exec');
var compileCommand = requireBox('build-extensions/commands/compile');
var startEnv = requireBox('localenv-extensions/commands/start-localenv');
var cmd = 'migrate [contract]';

module.exports = {
  description: 'run migration scripts',
  builder: (yargs) => {
    yargs
      .option('compile-all', {
        describe: 'compile all contracts',
        default: true
      }).option('wallet', {
        describe: 'keosd wallet to use',
        default: 'zeus'
      }).option('creator-key', {
        describe: 'private key to set contract to',
        default: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
      }).option('creator', {
        describe: 'eos account to set contract to',
        default: 'eosio'
      }).option('reset', {
        describe: 'reset local environment',
        default: true
      }).option('chain', {
        describe: 'chain to work on',
        default: 'eos'
      }).option('network', {
        describe: 'network to work on',
        default: 'development'
      })
      .option('services', {
        describe: 'service APIs to run',
        default: ''
      })
      // .option('verbose-rpc', {
      //   describe: 'verbose logs for blockchain communication',
      //   default: false
      // })
      .option('storage-path', {
        describe: 'path for persistent storage',
        default: path.join(require('os').homedir(), '.zeus')
      })
      .option('sidechain', {
        describe: 'sidechain name to use for liquidx',
        default: ''
      })
      .option('transfer', {
        describe: 'account staking amount',
        default: '1000'
      })
      .option('custom-token', {
        describe: 'custom chain token',
        default: ''
      })
      .option('custom-token-precision', {
        describe: 'custom chain token permission',
        default: 4
      })
      .option('evm-host', {
        describe: 'custom evm host',
        default: '127.0.0.1'
      })
      .option('evm-port', {
        describe: 'custom evm port',
        default: 8545
      })
      .option('evm-sister-host', {
        describe: 'custom evm sister host',
        default: '127.0.0.1'
      })
      .option('evm-sister-port', {
        describe: 'custom evm sister port',
        default: 8546
      })
      .option('external-evm-endpoint', {
        describe: 'external evm endpoint',
        default: ''
      })
      .option('external-evm-private-key', {
        describe: 'external evm private key',
        default: ''
      })
      .option('external-evm-sister-endpoint', {
        describe: 'external evm sister endpoint',
        default: ''
      })
      .option('external-evm-sister-private-key', {
        describe: 'external evm sister private key',
        default: ''
      })
      .option('stake', {
        describe: 'account staking amount',
        default: '300'
      }).example(`$0 ${cmd} --no-compile-all --no-reset`);
  },
  command: cmd,
  handler: async (args) => {
    if (args.creator == 'eosio' && args.network !== 'development') {
      // throw new Error(`must pass a creator when not using development network ${args.creator} ${args.network}`);
    }
    if(args.services) {
      args.services = args.services.split(',');
    }
    if (args.compileAll) {
      await compileCommand.handler(args);
    }
    if (args.reset) {
      await startEnv.handler(args);
    }
    createDir('migrations', 'migrations');
    global.chain = 'eos';
    try {
      await execScripts(path.resolve(__dirname, './migrate'), (script) => {
        console.log(emojMap.cloud + 'Migrator', path.basename(script).green);
        return [args];
      }, args);

      await execScripts(path.resolve('./zeus_boxes/migrations'), (script) => {
        console.log(emojMap.cloud + 'Migration', path.basename(script).cyan);
        return [args];
      }, args);
    }
    catch (e) {
      if((typeof(e) == "object" ? JSON.stringify(e) : e).includes('does not have signatures for it')) {
        console.log(`${emojMap.bangbang} must import key first with "zeus key import" or provide with "--creator-key"`)
      }
      console.log(emojMap.white_frowning_face + 'Migration failed');
      throw e;
    }
    console.log(emojMap.ok + 'Done migrating');
  }
};
