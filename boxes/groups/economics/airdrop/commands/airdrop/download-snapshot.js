const { requireBox } = require('@liquidapps/box-utils');
var SnapshotHelpers = requireBox('airdrop/tools/snapshot-storage').default;
var cmd = 'download-snapshot';

module.exports = {
    description: "download airdrop snapshot",
    builder: (yargs) => {
        yargs.example(`$0 airdrop ${cmd} my-airdrop1`);
    },
    command: `${cmd} <name>`,
    handler: async (args) => {
        var snapshotHelpers = await SnapshotHelpers(args);
        await snapshotHelpers.handler.cacheSnapshot();
    }
}
