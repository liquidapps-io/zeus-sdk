const { requireBox } = require('@liquidapps/box-utils');
var scaffoldHandler = requireBox('templates-extensions/commands/scaffold');

module.exports = {
  description: 'generates an empty contract',
  builder: (yargs) => {
    yargs.option('chain', {
      default: 'eos'
    }).option('language', {
      default: 'cpp'
    }).option('template-prefix', {
      default: 'emptycontract'
    }).example('$0 create contract testcontract --chain=eos --language=cpp --template-prefix=emptycontract');
  },
  command: 'contract <contractname>',
  handler: async (args) => {
    args.templateName = `${args['template-prefix']}-${args.chain}-${args.language}`;
    await scaffoldHandler.handler(args);
  }
};
