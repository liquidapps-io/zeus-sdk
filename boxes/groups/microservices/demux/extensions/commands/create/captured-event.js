var {saveUniqueModel} = require('../../tools/models');
var cmd = 'captured-event';
module.exports = {
    description: "capture event in demux",
    builder: (yargs) => {
        yargs.option('contract', {})
            .option('receiver', {})
            .option('method', {});
    },
    command: `${cmd} <event_type> <webhook>`,
    handler:async (args)=>{
       var eventObj = {eventType:args.eventName, contract:args.contract, receiver:args.receiver, method:args.method, webhook:args.webhook};
       await saveUniqueModel(`captured-events`, eventObj);
    }
}
