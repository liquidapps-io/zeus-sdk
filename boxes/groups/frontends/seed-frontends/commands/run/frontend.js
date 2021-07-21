var path = require('path');
var os = require('os');
var fs = require('fs');
var exec = require('child_process').exec;
const { requireBox, createDir } = require('@liquidapps/box-utils');
const { execPromise, emojMap } = requireBox('seed-zeus-support/_exec');

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
      createDir(`frontends`,`frontends`)
      console.log(emojMap.zap + `running frontend ${args.frontend}. listening on ${args.host}:${args.port}`);
      process.env.HOST = args.host;
      process.env.PORT = args.port;
      var stdout = await execPromise(`${process.env.NPM || 'npm'} start`, {
        // cwd: path.resolve("./contracts/eos")
        env: process.env,
        cwd: path.join(path.resolve('./zeus_boxes/frontends'), args.frontend)
      });
      console.log(stdout);
    } else {
      throw new Error('all not supported yet');
    }
  }
};
