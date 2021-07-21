var path = require('path');
var { requireBox } = require('@liquidapps/box-utils');
var { execScripts } = requireBox('seed-zeus-support/_exec');

module.exports = {
  description: 'preprocess code',
  builder: (yargs) => {
    yargs
      .example('$0 preprocess helloworld');
  },
  command: 'preprocess <contract>',
  handler: async (args) => {
    await execScripts(path.resolve(__dirname, './preprocess'), (script) => {
      console.log('running preprocessor', path.basename(script));
      return [args];
    }, args);
  }
};
