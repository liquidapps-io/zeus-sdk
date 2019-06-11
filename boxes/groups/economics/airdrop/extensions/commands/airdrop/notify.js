var SnapshotHelpers = require('../../tools/snapshot-storage').default;

var cmd = 'notify';


module.exports = {
    description: "notify airdrop",
    builder: (yargs) => {
        yargs.option('issuer-key', {
                describe: 'active private key for airdrop issuer'
            }).option('network', {
                describe: 'network to work on',
                default: 'development'
            })
            .demandOption(['issuer-key'])
            .example(`$0 airdrop ${cmd} my-airdrop`);
    },
    command: `${cmd} <name>`,
    handler: async(args) => {
        var key = args['issuer-key'];
        var snapshotHelpers = await SnapshotHelpers(args);
        var contractAccount = snapshotHelpers.model.airdrop_contract;
        var contract = await snapshotHelpers.eos.contract(contractAccount); // get contract
        var token_symbol = snapshotHelpers.model.token_symbol;
        var quantity = snapshotHelpers.model.quantity;

        var precision = 0;
        var precisionParts = quantity.split('.');
        if (precisionParts.length > 1) {
            precision = precisionParts[1].length;
        }
        // iterate, call issueairdrop
        var accounts = await snapshotHelpers.handler.getTransformedAccounts();
        for (var i = 0; i < accounts.length; i++) {
            var account = accounts[i];
            // transform memo
            var memo = snapshotHelpers.format(snapshotHelpers.model.grab_memo, { ...snapshotHelpers.model, ...account });
            // todo: transform precision
            var balance = account.balance;
            if (balance == 0)
                continue;
            balance = "1000.0000";

            await contract.issueairdrop({
                owner: account.name,
                token_contract: contractAccount,
                quantity: `${balance} ${token_symbol}`,
                memo
            }, {
                authorization: `${snapshotHelpers.model.issuer}@active`,
                broadcast: true,
                sign: true,
                keyProvider: [key]
            });

            // todo: report progress
            // todo: save progress in s3?
        }
    }
}
