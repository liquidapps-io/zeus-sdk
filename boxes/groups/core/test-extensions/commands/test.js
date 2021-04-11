const path = require('path');
const fs = require('fs');
const { requireBox, createDir } = require('@liquidapps/box-utils');
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
        default: 'eos'
      }).option('network', {
        describe: 'network to work on',
        default: 'development'
      }).option('compile', {
        describe: 'compile contract(s)',
        alias: 'c',
        default: false
      }).option('verbose-rpc', {
        describe: 'verbose logs for blockchain communication',
        default: false
      })
      .option('storage-path', {
        describe: 'path for persistent storage',
        default: path.join(require('os').homedir(), '.zeus')
      })
      .option('stake', {
        describe: 'account staking amount',
        default: '300.0000',
        alias: 's'
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
      .example('$0 test contract')
      .example('$0 test')
      .example('$0 test contract -c')
      .example('$0 test -c');
  },
  command: 'test [contract]',

  handler: async (args) => {
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
      createDir('test', 'test');
      // copy unit testing files over to root test folder
      await execPromise(`cp -rf zeus_boxes/test test`)
      const preNpmCommand = process.env.NPM || 'npm';
      const npmCommand = process.env.CI === 'true' ? 'run test-ci' : 'test';
      const subContractCommand = `-- zeus_boxes/test/${args.contract}.spec.js`;
      const contractCommand = `${args.contract ? subContractCommand : '-- zeus_boxes/test'}`;
      await execPromise(`${preNpmCommand} ${npmCommand} ${contractCommand}`, {
        env: {
          ...process.env,
          ZEUS_ARGS: JSON.stringify(args)
        },
        printOutStream: process.stdout,
        printErrStream: process.stderr
      });
      console.log(emojMap.ok + 'tests ok');
    }
    catch (e) {
      throw emojMap.white_frowning_face + 'Test failed';
    }
  }
};
