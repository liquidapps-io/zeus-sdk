var path = require('path');
var fs = require('fs');

module.exports = (cmd, description, thePath) => {
  return {
    description: description || `"${cmd} a component"`,
    builder: (yargs) => {
      var extPath = thePath || path.join(path.resolve('.'), 'extensions/commands', cmd);

      if (fs.existsSync(extPath) && global.enableExt) {
        yargs = yargs.commandDir(extPath);
      }
      return yargs;
    },
    usage: `${cmd} <command>`,
    handler: (args) => {}
  };
};
