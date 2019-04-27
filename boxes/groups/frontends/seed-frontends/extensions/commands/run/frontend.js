var path = require('path');
var os = require('os');
var fs = require('fs');
var exec = require('child_process').exec;
var { execPromise, emojMap } = require('../../helpers/_exec');

var cmd = 'frontend';

module.exports = {
  description: 'run frontend',
  builder: (yargs) => {
    yargs.option('port', {
      // describe: '',
      default: 3015
    }).option('host', {
      // describe: '',
      default: '0.0.0.0'
    }).example(`$0 ${cmd}`);
  },
  command: `${cmd} <frontend>`,
  handler: async (args) => {
    if (args.frontend) {
      console.log(emojMap.zap + `running frontend ${args.frontend}. listening on ${args.host}:${args.port}`);
      process.env.HOST = args.host;
      process.env.PORT = args.port;
      var stdout = await execPromise(`${process.env.NPM || 'npm'} start`, {
        // cwd: path.resolve("./contracts/eos")
        env: process.env,
        cwd: path.join(path.resolve('./frontends'), args.frontend)
      });
      console.log(stdout);
    } else {
      throw new Error('all not supported yet');
    }
  }
};
