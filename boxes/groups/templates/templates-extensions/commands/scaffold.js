const { requireBox } = require('@liquidapps/box-utils');
var { scaffold } = requireBox('templates-extensions/tools/templates');
const { execPromise } = requireBox('seed-zeus-support/_exec');
const fs = require("fs");

module.exports = {
  description: 'scaffold a template',
  builder: (yargs) => {
    yargs.example('$0 scaffold somegenerator --somearg');
  },
  command: 'scaffold <template_name>',
  handler: async (args) => {
    await scaffold(args.templateName, args);
    if (fs.existsSync(`zeus_boxes/contracts/eos/${args.contractname}/main.cpp`)) {
      await execPromise(`mv zeus_boxes/contracts/eos/${args.contractname}/main.cpp zeus_boxes/contracts/eos/${args.contractname}/${args.contractname}.cpp`);
    }
    console.log(`scaffolded ${args.templateName}`);
  }
};