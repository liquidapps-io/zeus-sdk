var { saveModel } = require('../../tools/models');
var cmd = 'contract-deployment';

module.exports = {
  description: `create ${cmd}`,
  builder: (yargs) => {
    yargs.example(`$0 create ${cmd} helloworld myeosaccount`);
  },
  command: `${cmd} <contract> <account>`,
  handler: async (args) => {
    saveModel(`${cmd}s`, args.account, { contract: args.contract, account: args.account });
  }
};
