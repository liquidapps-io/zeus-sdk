var cmd = 'init';
var SnapshotHelpers = require('../../tools/snapshot-storage').default;

module.exports = {
    description: "init airdrop",
    builder: (yargs) => {
        yargs.option('contract-key', {
                describe: 'active private key for airdrop contract'
            }).option('network', {
                describe: 'network to work on',
                default: 'development'
            })
            .demandOption(['contract-key'])
            .example(`$0 airdrop ${cmd} my-airdrop`);
    },
    command: `${cmd} <name>`,
    handler: async(args) => {

        var key = args['contract-key'];
        var snapshotHelpers = await SnapshotHelpers(args);
        var handler = snapshotHelpers.handler;
        var url_prefix = await handler.getLatestURLPrefix()
        var contractAccount = snapshotHelpers.model.airdrop_contract;
        var contract = await snapshotHelpers.eos.contract(contractAccount); // get contract

        // transform memo
        var memo = snapshotHelpers.format(snapshotHelpers.model.grab_memo, snapshotHelpers.model);

        await contract.init({
            issuer: snapshotHelpers.model.issuer,
            token_contract: snapshotHelpers.model.token_contract,
            token_symbol: snapshotHelpers.model.token_symbol,
            url_prefix,
            memo
        }, {
            authorization: `${contractAccount}@active`,
            broadcast: true,
            sign: true,
            keyProvider: [key]
        });
        // call contract.init 

    }
}
