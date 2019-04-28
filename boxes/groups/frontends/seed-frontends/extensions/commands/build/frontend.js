var path = require('path');
var os = require('os');
var fs = require('fs');
var { emojMap, execPromise } = require('../../helpers/_exec');

var cmd = 'frontend';
// todo: move to seed-frontends
module.exports = {
  description: 'build frontend',
  builder: (yargs) => {
    yargs.example(`$0 ${cmd}`);
  },
  command: `${cmd} <frontend>`,
  handler: async (args) => {
    if (args.frontend) {
      console.log(emojMap.gear + 'building frontend:', args.frontend);
      var stdout = await execPromise(`${process.env.NPM || 'npm'} run build`, {
        // cwd: path.resolve("./contracts/eos")
        env: process.env,
        cwd: path.join(path.resolve('./frontends'), args.frontend)
      });
    } else {
      throw new Error('all not supported yet');
    }
  }
};
