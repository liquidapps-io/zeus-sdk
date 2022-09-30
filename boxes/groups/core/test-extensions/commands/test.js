const path = require('path');
const fs = require('fs');
const { requireBox, createDir, createLocalDir } = require('@liquidapps/box-utils');
const { execPromise, emojMap } = requireBox('seed-zeus-support/_exec');

// todo: move to seed-tests
const compileCommand = requireBox('build-extensions/commands/compile');
const startLocalEnvCommand = requireBox('localenv-extensions/commands/start-localenv');

module.exports = {
  description: 'test',
  builder: (yargs) => {
    yargs
      .option('wallet', {
        describe: 'keosd wallet to use',
        default: 'zeus',
        alias: 'w'
      }).option('creator-key', {
        describe: 'private key to set contract to',
        default: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
      }).option('creator', {
        describe: 'eos account to set contract to',
        default: 'eosio',
        alias: 'a'
      }).option('reset', {
        describe: 'reset local environment',
        default: true
      }).option('chain', {
        describe: 'chain to work on',
        default: ''
      }).option('network', {
        describe: 'network to work on',
        default: 'development'
      }).option('compile', {
        describe: 'compile contract(s)',
        alias: 'c',
        default: false
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
        default: '300',
        alias: 's'
      })
      .option('transfer', {
        describe: 'account staking amount',
        default: '1000'
      })
      .option('basic-env', {
        describe: 'min needed for EOSIO smart contract test',
        default: false,
        alias: 'b'
      })
      .option('services', {
        describe: 'service APIs to run',
        default: ''
      })
      .option('delete-logs', {
        describe: 'delete logs folder before starting test',
        default: false,
        alias: 'd'
      })
      .option('multi-evm', {
        describe: 'run multiple evm chains',
        default: false
      })
      .option('enable-features', {
        describe: 'enables eosio features',
        default: true
      })
      .option('enable-features-list', {
        describe: 'enables eosio features, list: KV_DATABASE,ACTION_RETURN_VALUE,CONFIGURABLE_WASM_LIMITS,BLOCKCHAIN_PARAMETERS,ONLY_BILL_FIRST_AUTHORIZER,DISALLOW_EMPTY_PRODUCER_SCHEDULE,ONLY_LINK_TO_EXISTING_PERMISSION,FIX_LINKAUTH_RESTRICTION,RAM_RESTRICTIONS,REPLACE_DEFERRED,NO_DUPLICATE_DEFERRED_ID,RESTRICT_ACTION_TO_SELF,FORWARD_SETCODE,GET_SENDER,WEBAUTHN_KEY,CONFIGURABLE_WASM_LIMITS2,WTMSIG_BLOCK_SIGNATURES,GET_CODE_HASH,CRYPTO_PRIMITIVES,GET_BLOCK_NUM',
        default: ''
      })
      .option('single-chain', {
        describe: 'run without LiquidX',
        default: false
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
      .option('kill-services', {
        describe: 'kill all current running nodes and services after running tests',
        default: true
      })
      .option('legacy-cdt', {
        describe: 'compile cmake files using cdt version < 3.0.0',
        default: false
      })
      .option('docker', {
        describe: 'enable to use docker',
        default: false
      })
      .example('$0 test contract')
      .example('$0 test')
      .example('$0 test --kill-services')
      .example('$0 test contract -c')
      .example('$0 test -c')
      .example('$0 test --services "ipfs,cron,oracle,sign,vaccounts"')
      .example('$0 test --services "ipfs,cron,oracle,sign,vaccounts" --chain eos --single-chain');
  },
  command: 'test [contract]',

  handler: async (args) => {
    try {
      createDir('test', 'test');
      createLocalDir('test');
    } catch (e) {
      console.log(e);
    }
    if (args.deleteLogs) {
      if (fs.existsSync(`logs`)) {
        await execPromise(`rm -rf logs`);
      }
    }
    if(args.services) {
      args.services = args.services.split(',');
    }
    if (args.compile) {
      await compileCommand.handler(args);
    }
    if (args.reset) {
      await startLocalEnvCommand.handler(args);
    }
    console.log(emojMap.zap + 'Running tests');
    try {
      const preNpmCommand = process.env.NPM || 'npm';
      const npmCommand = process.env.CI === 'true' ? 'run test-ci' : 'test';
      const subContractCommand = `-- test/${args.contract}.spec.js`;
      const contractCommand = `${args.contract ? subContractCommand : '-- test'}`;
      await execPromise(`${preNpmCommand} ${npmCommand} ${contractCommand}`, {
        env: {
          ...process.env,
          ZEUS_ARGS: JSON.stringify(args)
        },
        printOutStream: process.stdout,
        printErrStream: process.stderr
      });
      console.log(emojMap.ok + 'tests ok');
      try {
        if(args.killServices === true) {
          console.log(emojMap.ok + 'shutting down nodeos and all other services');
          await execPromise(`zeus start-localenv --kill`);
        }
      } catch(e) {}
    }
    catch (e) {
      try {
        if(args.killServices === true) {
          console.log(emojMap.ok + 'shutting down nodeos and all other services');
          await execPromise(`zeus start-localenv --kill`);
        }
      } catch(e) {}
      throw emojMap.white_frowning_face + 'Test failed';
    }
  }
};
