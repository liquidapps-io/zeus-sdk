const { requireBox } = require('@liquidapps/box-utils');
const { saveModel } = requireBox('seed-models/tools/models');
var cmd = 'bancor-relay';

module.exports = {
    description: `create ${cmd}`,
    builder: (yargs) => {
        yargs.example(`$0 create ${cmd} converter1 mytoken SYM mytokenrly SYMRLY 0`);
    },
    command: `${cmd} <converter_contract> <token> <symbol> <smart_token_contract> <smart_symbol> <fee>`,
    handler: async (args) => {
        var model = { token: args.token, symbol: args.symbol, smart_token_contract: args.smart_token_contract, smart_symbol: args.smart_symbol, converter_contract: args.converter_contract, fee: args.fee };
        await saveModel(`${cmd}s`, `${args.converter_contract}`, model);
    }
}