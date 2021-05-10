const { requireBox } = require('@liquidapps/box-utils');
const { saveModel } = requireBox('seed-models/tools/models');
var cmd = 'contract-deployment';

module.exports = {
  description: `create ${cmd}`,
  builder: (yargs) => {
    yargs.example(`$0 create ${cmd} helloworld myeosaccount`);
  },
  command: `${cmd} <contract> <account> [network]`,
  handler: async (args) => {
    saveModel(`${cmd}s`, args.account, { contract: args.contract, account: args.account, network: args.network || 'development' });
  }
};
