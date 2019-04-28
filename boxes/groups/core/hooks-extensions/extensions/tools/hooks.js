var path = require('path');

var { execScripts } = require('../helpers/_exec');

module.exports = (hookName) => {
  return {
    description: `${hookName} hook`,
    builder: (yargs) => {
    },
    command: `${hookName}`,
    handler: async (args, zeusBoxJson, location) => {
      await execScripts(path.resolve(`./extensions/hooks/${hookName}`), (script) => {
      // console.log(`running ${hookName} hook ${path.basename(script)}`);
        return [args, zeusBoxJson, location];
      }, args);
    }
  };
};
