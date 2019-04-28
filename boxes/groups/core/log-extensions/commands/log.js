
module.exports = {
  description: 'display logs',
  builder: (yargs) => {
    yargs.option('network', {
      default: 'development'
    });
  },
  usage: 'log',
  command: 'log',
  handler: async (args) => {
  }
};
