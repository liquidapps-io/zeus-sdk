const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');
const path = require('path');

module.exports = (filePath) => {
  var cmd = path.basename(filePath, '.js');
  return {
    description: `runs the ${cmd} utilility`,
    builder: (yargs) => {
      yargs.example(`$0 run ${cmd}`);
    },
    command: `${cmd}`,
    handler: async (args) => {
      var stdout = await execPromise(`node utils/${cmd}/dist/index.js`);
    }
  };
};
