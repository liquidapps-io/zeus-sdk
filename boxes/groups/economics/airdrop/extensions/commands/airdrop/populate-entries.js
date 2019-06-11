var SnapshotHelpers = require('../../tools/snapshot-storage').default;

var cmd = 'populate-entries';

module.exports = {
    description: "populates airdrop dataset as individual files",
    builder: (yargs) => {
        yargs.example(`$0 airdrop ${cmd} my-airdrop1`);
    },
    command: `${cmd} <name>`,
    handler: async(args) => {
        var snapshotHelpers = await SnapshotHelpers(args);
        await snapshotHelpers.handler.populateLatest();
    }
}
