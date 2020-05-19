var mapping = require('../helpers/_mapping');

module.exports = {
  description: 'list boxes in mapping',
  builder: (yargs) => {
    yargs.option('show-versions', {
      // describe: '',
      default: true
    }).example('$0 list-boxes --no-show-versions');
  },
  command: 'list-boxes',
  handler: async (args) => {

    const builtInBoxes = Object.keys(mapping.getBuiltin()).sort();
    console.log("Builtin Boxes:");
    if (!args.showVersions) {
      console.log(builtInBoxes.join('\n'));
    } else {
      for (let box of builtInBoxes) {
        for (let version of Object.keys(mapping.getBuiltin()[box]).sort()) {
          console.log(box + "@" + version);
        }
      }
    }

    const localBoxes = Object.keys(mapping.getLocal(args.storagePath)).sort();
    if (localBoxes.length > 0) {
      console.log("\nLocal Boxes:");
      if (!args.showVersions) {
        console.log(localBoxes.join('\n'));
      } else {
        for (let box of localBoxes) {
          for (let version of Object.keys(mapping.getLocal(args.storagePath)[box]).sort()) {
            console.log(box + "@" + version);
          }
        }
      }
    }
  }
};