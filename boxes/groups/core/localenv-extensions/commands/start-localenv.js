var path = require('path');
var { requireBox, createDir, getBoxesDir } = require('@liquidapps/box-utils');
var { execScripts, emojMap, execPromise } = requireBox('seed-zeus-support/_exec');

var cmd = 'start-localenv';

module.exports = {
  description: 'runs eosio node for local development',
  builder: (yargs) => {
    yargs
      .option('all', {
        describe: 'compile all contracts',
        default: true
      }).option('wallet', {
        // describe: '',
        default: 'zeus'
      }).option('creator-key', {
        // describe: '',
        default: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
      }).option('creator', {
        // describe: '',
        default: 'eosio'
      }).option('network', {
        describe: 'network to work on',
        default: 'development'
      }).option('chain', {
        describe: 'chain to work on',
        default: 'eos'
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
      .option('stake', {
        describe: 'account staking amount',
        default: '300'
      })
      .option('transfer', {
        describe: 'account staking amount',
        default: '1000'
      })
      .option('multi-evm', {
        describe: 'run multiple evm chains',
        default: false
      })
      .option('kill', {
        describe: 'kill all current running nodes and services',
        default: false
      })
      .option('enable-features', {
        describe: 'enables eosio features',
        default: false
      })
      .option('single-chain', {
        describe: 'run without LiquidX',
        default: false
      })
      .option('basic-env', {
        describe: 'min needed for EOSIO smart contract test',
        default: false,
        alias: 'b'
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
      .option('phase', {
        describe: 'phase of local env step to start',
        default: ''
      }).example(`$0 ${cmd}`);
  },
  command: cmd,
  handler: async (args) => {
    if(args.services && typeof(args.services) === "string") {
      args.services = args.services.split(',');
    }
    const boxesDir = getBoxesDir();
    createDir('start-localenv', 'commands/start-localenv');
    if(args.basicEnv){
      await execPromise(`zeus start-localenv --phase 02-a-eos-local-nodeos; zeus start-localenv --phase 05-a-eos-local-bios`, {
        env: {
          ...process.env,
          ZEUS_ARGS: JSON.stringify(args)
        },
        printOutStream: process.stdout,
        printErrStream: process.stderr
      });
    } else {
      await execScripts(path.join(boxesDir, 'start-localenv'), (script) => {
        console.log(emojMap.anchor + 'Setup environment', path.basename(script).green);
        return [args];
      }, args, args.phase ? args.phase : undefined);
    }
  }
}

