var mapping = require('../helpers/_mapping');

module.exports = {
  description: 'list canned boxes',
  builder: (yargs) => {
    yargs.example('$0 list-boxes');
  },
  command: 'list-boxes',
  handler: async (args) => {
    const boxes = mapping.load(args.storagePath);
    console.log(Object.keys(boxes).join('\n'));
  }
};
