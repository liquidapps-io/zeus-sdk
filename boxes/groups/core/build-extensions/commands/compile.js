const path = require('path');
const fs = require('fs');
const { requireBox, getBoxesDir, createDir, createLocalDir } = require('@liquidapps/box-utils');

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
      }).option('sidechain', {
        describe: 'sidechain name to use for liquidx',
        default: ''
      }).option('phase', {
        describe: 'select compile option [dapp-services-eos, eos]',
        default: ''
      }).option('docker', {
        describe: 'enable to use docker',
        default: false
      }).option('legacy-cdt', {
        describe: 'unbox cmake files using cdt version < 3.0.0',
        default: false
      }).example('$0 compile --all').example('$0 compile helloworld');
  },
  command: 'compile [contract]',
  handler: async (args) => {
    if (args.phase) {
      if (args.phase == 'dapp-services-eos') {
        const module = requireBox('dapp-services/commands/compile/dapp-services-eos');
        await module.call(module, args);
      }
      else if (args.phase == 'eos') {
        const module = requireBox('eos-extensions/commands/compile/eos');
        await module.call(module, args);
      }
      else if (args.phase == 'truffle' || args.phase == 'eth' || args.phase == 'evm') {
        const module = requireBox('eth-extensions/commands/compile/truffle');
        await module.call(module, args);
      }
    } else {
      var boxesDir = getBoxesDir();
      createLocalDir('contracts');
      if (fs.existsSync(boxesDir)) {
        let modules = [
          'dapp-services/commands/compile/dapp-services-eos',
          'eos-extensions/commands/compile/eos',
          'eth-extensions/commands/compile/truffle'
        ];
        for (let moduleDir of modules) {
          if (fs.existsSync(path.join(boxesDir, moduleDir + '.js'))) {
            var module = requireBox(moduleDir);
            await module.call(module, args);
          }
        }
      }
    }
  }
}
