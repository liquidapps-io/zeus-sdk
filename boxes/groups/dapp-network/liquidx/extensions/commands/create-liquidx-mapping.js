const { createLiquidXMapping } = require('../tools/eos/dapp-services');

module.exports = {
    description: 'create liquidx mapping',
    builder: (yargs) => {
        yargs
            .option('oneway', {
                describe: 'creates a oneway mapping',
                default: false
            }).example('$0 create-liquidx-mapping wax gooddsponeos gooddspwax --oneway');
    },
    command: 'create-liquidx-mapping <sidechain-name> <mainnet-account> <chain-account>',
    handler: async (args) => {
        createLiquidXMapping(args.sidechainName, args.mainnetAccount, args.chainAccount, args.oneway);
    }
};
