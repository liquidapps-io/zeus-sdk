var path = require('path');
var { requireBox, createDir, getBoxesDir } = require('@liquidapps/box-utils');
var { execScripts, emojMap } = requireBox('seed-zeus-support/_exec');

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
      .option('verbose-rpc', {
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
      }).example(`$0 ${cmd}`);
  },
  command: cmd,
  handler: async (args) => {
    const boxesDir = getBoxesDir();
    createDir('start-localenv', 'commands/start-localenv');
    await execScripts(path.join(boxesDir, 'start-localenv'), (script) => {
      console.log(emojMap.anchor + 'Setup environment', path.basename(script).green);
      return [args];
    }, args);
  }
}

