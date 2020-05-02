const { requireBox } = require('@liquidapps/box-utils');
var scaffoldHandler = requireBox('templates-extensions/commands/scaffold');

module.exports = {
  description: 'generates an empty DSP service',
  builder: (yargs) => {
    yargs.example('$0 create dsp-service mysvc');
  },
  command: 'dsp-service <servicename>',
  handler: async (args) => {
    args.templateName = "dsp-service";
    await scaffoldHandler.handler(args);
  }
};
