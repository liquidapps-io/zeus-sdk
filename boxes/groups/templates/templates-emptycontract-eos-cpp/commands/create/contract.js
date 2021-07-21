const { requireBox } = require('@liquidapps/box-utils');
var scaffoldHandler = requireBox('templates-extensions/commands/scaffold');
const { emojMap } = requireBox('seed-zeus-support/_exec');

module.exports = {
  description: 'generates an empty contract',
  builder: (yargs) => {
    yargs.option('chain', {
      default: 'eos'
    }).option('language', {
      default: 'cpp'
    }).option('template', {
      default: 'emptycontract'
    }).example('$0 create contract testcontract --chain=eos --language=cpp --template=emptycontract');
  },
  command: 'contract <contractname>',
  handler: async (args) => {
    args.templateName = `${args['template']}-${args.chain}-${args.language}`;
    console.log(`${emojMap.zap}creating template ${args.templateName}, contract ${args.contractname}`)
    await scaffoldHandler.handler(args);
  }
};
