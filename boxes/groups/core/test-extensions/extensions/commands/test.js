var path = require('path');
var { execPromise, emojMap } = require('../helpers/_exec');

// todo: move to seed-tests
var compileCommand = require('./compile');
var startLocalEnvCommand = require('./start-localenv');

module.exports = {
  description: 'test',
  builder: (yargs) => {
    yargs
      .option('wallet', {
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
      }).option('compile-all', {
        describe: 'compile all contracts',
        default: true
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
        default: '300.0000'
      }).example('$0 test contract.spec.js').example('$0 test').example('$0 test --compile-all');
  },
  command: 'test [testfile]',

  handler: async(args) => {
    let stdout;
    if (args.compileAll) {
      await compileCommand.handler(args);
    }
    if (args.reset) {
      await startLocalEnvCommand.handler(args);
    }
    console.log(emojMap.zap + 'Running tests');
    try {
      var npmCommand = process.env.CI == 'true' ? 'run test-ci' : 'test';
      stdout = await execPromise(`${process.env.NPM || 'npm'} ${npmCommand} ${args.testfile || ''}`, {
        // cwd: path.resolve("./contracts/eos")
        env: { ...process.env,
          ZEUS_ARGS: JSON.stringify(args)
        },
        printOutStream: process.stdout,
        printErrStream: process.stderr
      });
      // console.log(stdout);
      console.log(emojMap.ok + 'tests ok');
    }
    catch (e) {
      throw emojMap.white_frowning_face + 'Test failed';
    }
  }
};
