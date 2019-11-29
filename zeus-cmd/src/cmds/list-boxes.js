var mapping = require('../mapping');

module.exports = {
  description: 'list canned boxes',
  builder: (yargs) => {
    yargs.example('$0 list-boxes');
  },
  command: 'list-boxes',
  handler: async (args) => {
    const boxes = mapping.load(args);
    console.log(Object.keys(boxes).join('\n'));
  }
};
