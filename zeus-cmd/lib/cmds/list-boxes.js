var mapping = require('../helpers/_mapping');

module.exports = {
  description: 'list canned boxes',
  builder: (yargs) => {
    yargs.example('$0 list-boxes');
  },
  command: 'list-boxes',
  handler: async (args) => {
    console.log("Builtin Boxes:");
    console.log(Object.keys(mapping.getBuiltin()).join('\n'));
    var localBoxes = Object.keys(mapping.getLocal(args.storagePath));
    if (localBoxes.length > 0) {
      console.log("\nLocal Boxes:");
      console.log(localBoxes.join('\n'));
    }
  }
};