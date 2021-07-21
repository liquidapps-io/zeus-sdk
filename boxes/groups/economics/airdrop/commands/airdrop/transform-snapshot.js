const { requireBox } = require('@liquidapps/box-utils');
var SnapshotHelpers = requireBox('airdrop/tools/snapshot-storage').default;

var cmd = 'transform-snapshot';

module.exports = {
    description: "transform airdrop snaphot",
    builder: (yargs) => {
        yargs.example(`$0 airdrop ${cmd} my-airdrop1`);
    },
    command: `${cmd} <name>`,
    handler: async (args) => {
        var snapshotHelpers = await SnapshotHelpers(args);
        var handler = snapshotHelpers.handler;
        var accounts = await handler.getOriginalAccounts();

        // var quantity = model.quantity;
        // var precisionParts = quantity.split('.');
        // var precision = 0;
        // if (precisionParts.length > 1) {
        //     precision = precisionParts[1].length;
        // }

        // var sum = accounts.reduce((currSum, currAccount) => {
        //     var currBalance = currAccount.balance;

        //     if (currBalance >= 1.0000) {
        //         currBalance = 10000000;
        //     }
        //     else currBalance = 0;
        //     // if (model.account_cap && currBalance > model.account_cap)
        //     //     currBalance = model.account_cap;

        //     return currSum + currBalance;
        // }, 0);
        // var ratio = sum / quantity;

        await handler.saveTransformed(accounts
            .map(account => {
                var name = account.account;
                var currBalance = account.balance;
                // if (model.account_cap && currBalance > model.account_cap)
                //     currBalance = model.account_cap;
                if (currBalance >= 1.0000) {
                    currBalance = 10000000;
                }
                else currBalance = 0;
                // todo: transform precision
                return {
                    account: name,
                    balance: currBalance
                }
            }));
        await handler.saveTransformedAsLatest();
    }
}
