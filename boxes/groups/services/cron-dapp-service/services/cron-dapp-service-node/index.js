var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { deserialize, generateABI, genNode, eosPrivate, eosDSPGateway, paccount, forwardEvent, resolveProviderData, resolveProvider, resolveProviderPackage } = require('../dapp-services-node/common');
const { getCreateKeys } = require('../../extensions/tools/eos/utils');

var timers = {

};
nodeFactory('cron', {
  schedule: async ({ rollback, replay, event, exception }, { timer, payload, seconds }) => {
    if (exception || replay || rollback || process.env.PASSIVE_DSP_NODE) { return; }

    const { payer, packageid, current_provider } = event;
    console.log('setting timer', payer, timer);
    const timerId = timers[`${payer}_${timer}`];
    if (timerId) {
      clearTimeout(timerId);
    }
    if (seconds == 0) return;
    timers[`${payer}_${timer}`] = setTimeout(async () => {
      console.log('firing timer', payer, timer);
      let key;
      delete timers[`${payer}_${timer}`];
      var contract = await eosDSPGateway.contract(payer);
      if (!process.env.DSP_PRIVATE_KEY) { key = await getCreateKeys(paccount); }
      try {
        await contract.xschedule({
          current_provider: current_provider,
          timer,
          'package': packageid,
          payload,
          seconds
        }, {
          authorization: `${paccount}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [process.env.DSP_PRIVATE_KEY || key.privateKey]
        });
      } catch (e) {
        if (e.toString().indexOf('duplicate') == -1) {
          console.log('response error, could not call contract callback', e);
          // throw e;
        }
      }
    }, seconds * 1000);
  }
});
