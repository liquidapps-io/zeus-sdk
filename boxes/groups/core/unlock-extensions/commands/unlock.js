const { unlockWallet } = require('../helpers/walletUtils');

module.exports = {
  description: 'unlocks wallet',
  builder: (yargs) => {
    yargs.option('network', {
      default: 'development'
    })
      .option('wallet', {
        description: 'the wallet to unlock',
        default: 'zeus'
      });
  },
  usage: 'unlock',
  command: 'unlock',
  handler: async (args) => {
    await unlockWallet(args.wallet, args.network, args['storage-path']);
  }
};
