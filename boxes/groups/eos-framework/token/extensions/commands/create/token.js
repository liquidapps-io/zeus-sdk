var {saveModel} = require('../../tools/models');
var cmd = 'token';

module.exports = {
    description: `create ${cmd}`,
    builder: (yargs) => {
        yargs.example(`$0 create ${cmd} mytoken SYM`);
    },
    command: `${cmd} <account> <symbol>`,
    handler:async (args)=>{
        await saveModel(`${cmd}s`, `${args.account}-${args.symbol}`,{symbol:args.symbol, account:args.account});
    }
}