var path = require('path');
var { execScripts, emojMap } = require('../helpers/_exec');

module.exports = {
  description: 'compile contracts',
  builder: (yargs) => {
    yargs
      .option('all', {
        describe: 'compile all contracts',
        default: true
      }).option('chain', {
        describe: 'chain to work on',
        default: 'eos'
      }).option('phase', {
        describe: 'select compile option [dapp-services-eos, npm, eos]',
        default: ''
      }).example('$0 compile --all').example('$0 compile helloworld');
  },
  command: 'compile [contract]',
  handler: async (args) => {
    if(args.phase) {
      const module = require((__dirname, `./compile/${args.phase}`));
      await module.call(module, args);
    } else {
      let module = require((__dirname, `./compile/dapp-services-eos`));
      await module.call(module, args);
      module = require((__dirname, `./compile/eos`));
      await module.call(module, args);
      module = require((__dirname, `./compile/npm`));
      await module.call(module, args);
    }
  }
};
