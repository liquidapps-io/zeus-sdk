var { scaffold } = require('../tools/templates');
var { execPromise } = require('../helpers/_exec');
const fs = require("fs");

module.exports = {
  description: 'scaffold a template',
  builder: (yargs) => {
    yargs.example('$0 scaffold somegenerator --somearg');
  },
  command: 'scaffold <template_name>',
  handler: async (args) => {
    await scaffold(args.templateName, args);
    if(fs.existsSync(`contracts/eos/${args.contractname}/main.cpp`)) {
      await execPromise(`mv contracts/eos/${args.contractname}/main.cpp contracts/eos/${args.contractname}/${args.contractname}.cpp`);
    }
    console.log(`scaffolded ${args.templateName}`);
  }
};
