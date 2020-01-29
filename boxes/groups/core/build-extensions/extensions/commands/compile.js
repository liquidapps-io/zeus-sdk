const fs = require('fs');
const { execScripts, emojMap } = require('../helpers/_exec');

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
        describe: 'select compile option [dapp-services-eos, npm, eos]',
        default: ''
      }).example('$0 compile --all').example('$0 compile helloworld');
  },
  command: 'compile [contract]',
  handler: async (args) => {
    if(args.phase) {
      if(fs.existsSync(`${__dirname}/compile/${args.phase}.js`)) {
        const module = require((__dirname, `./compile/${args.phase}`));
        await module.call(module, args);
      } else {
        throw new Error(emojMap.white_frowning_face + `${args.phase}.js file does not exist in ${__dirname}/compile/${args.phase}`);
      }
    } else {
      if(fs.existsSync(`${__dirname}/compile/dapp-services-eos.js`)) {
        const module = require((__dirname, `./compile/dapp-services-eos`));
        await module.call(module, args);
      } 
      if(fs.existsSync(`${__dirname}/compile/eos.js`)){
        const module = require((__dirname, `./compile/eos`));
        await module.call(module, args);
      } 
      if(fs.existsSync(`${__dirname}/compile/npm.js`)){
        const module = require((__dirname, `./compile/npm`));
        await module.call(module, args);
      }
    }
  }
};
