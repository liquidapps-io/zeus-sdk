var cmd = 'sample-cmd';

module.exports = {
  description: cmd,
  builder: (yargs) => {
    yargs
      .option('test', {
        // describe: '',
        default: 'zeus'
      }).example(`$0 ${cmd}`);
  },
  command: `${cmd} [arg]`,

  handler: async (args) => {

  }
};
