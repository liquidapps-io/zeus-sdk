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
    if(!fs.existsSync('contracts')) {
        await execPromise(`zeus compile ${args.legacyCdt ? '--legacy-cdt':''}`);
        console.log(`Compiled contracts/eos/`);
    }
    await scaffold(args.templateName, args);
    if (fs.existsSync(`contracts/eos/${args.contractname}/main.cpp`)) {
      await execPromise(`mv contracts/eos/${args.contractname}/main.cpp contracts/eos/${args.contractname}/${args.contractname}.cpp`);
    }
    console.log(`Created contracts/eos/${args.contractname}/${args.contractname}.cpp with template: ${args.templateName}`);
    console.log(`Created test/${args.contractname}.spec.js with template: ${args.templateName}`);
  }
};