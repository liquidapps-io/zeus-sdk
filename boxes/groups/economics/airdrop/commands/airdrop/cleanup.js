const { requireBox } = require('@liquidapps/box-utils');
var SnapshotHelpers = requireBox('airdrop/tools/snapshot-storage').default;
var cmd = 'cleanup';

module.exports = {
    description: "cleanup airdrop",
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
    handler: async (args) => {
        // get all claimed
        var key = args['contract-key'];
        var snapshotHelpers = await SnapshotHelpers(args);
        var handler = snapshotHelpers.handler;
        var contractAccount = snapshotHelpers.model.airdrop_contract;
        var contract = await snapshotHelpers.eos.contract(contractAccount); // get contract
        var accounts = await handler.getTransformedAccounts();
        for (var i = 0; i < accounts.length; i++) {
            var account = accounts[i];
            var claimed = false; //check if claimed
            if (claimed) {
                account.balance = 0;
                await handler.populateSingle(account);
                // call contract.cleanup
                await contract.cleanup({
                    owner: account.name,
                    token_contract: snapshotHelpers.model.token_contract
                }, {
                    authorization: `${contractAccount}@active`,
                    broadcast: true,
                    sign: true,
                    keyProvider: [key]
                });
            }
        }
        await handler.saveLatest(accounts)

    }
}
