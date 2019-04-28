var { scaffold } = require('../tools/templates');

module.exports = {
  description: 'scaffold a template',
  builder: (yargs) => {
    yargs.example('$0 scaffold somegenerator --somearg');
  },
  command: 'scaffold <template_name>',
  handler: async (args) => {
    await scaffold(args.templateName, args);
    console.log(`scaffolded ${args.templateName}`);
  }
};
