var path = require('path');
var fs = require('fs');

module.exports = (cmd, description) => {
  return {
    description: description || `"${cmd} a component"`,
    builder: (yargs) => {

      if (global.enableExt) {
        if (fs.existsSync(path.resolve('.', 'zeus_boxes'))) {
          var list = fs.readdirSync(path.resolve('.', 'zeus_boxes'), { withFileTypes: true });
          list.forEach(function (dirent) {
            if (dirent.isDirectory()) {
              extPath = path.join(path.resolve('.', 'zeus_boxes', dirent.name, 'commands', cmd));
              if (fs.existsSync(extPath)) { yargs = yargs.commandDir(extPath); }
            }
          });
        }
      }
      return yargs;
    },
    usage: `${cmd} <command>`,
    handler: (args) => { }
  };
};
