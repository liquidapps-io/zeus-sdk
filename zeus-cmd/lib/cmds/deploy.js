var path = require('path');
var fs = require('fs');

const cmd = 'deploy';
module.exports = {
  description: `${cmd} a component`,
  builder: (yargs) => {
    var extPath = path.join(path.resolve('.'), 'commands', cmd);
    var myPath = path.resolve(__dirname, '../cmds', cmd);
    yargs = yargs.commandDir(myPath);
    if (fs.existsSync(extPath) && global.enableExt) {
      yargs = yargs.commandDir(extPath);
    }
    return yargs;
  },
  usage: `${cmd} <command>`,
  handler: (args) => { }
};
