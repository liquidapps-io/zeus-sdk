var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { deserialize, generateABI, genNode, eosPrivate, eosDSPGateway, paccount, forwardEvent, resolveProviderData, resolveProvider, resolveProviderPackage } = require('../dapp-services-node/common');
const { getCreateKeys } = require('../../extensions/helpers/key-utils');
const logger = require('../../extensions/helpers/logger');

var timers = {

};
nodeFactory('cron', {
  schedule: async({ rollback, replay, event, exception }, { timer, payload, seconds }) => {
    if (exception || replay || rollback || process.env.PASSIVE_DSP_NODE) { return; }

    const { payer, packageid, current_provider } = event;
    logger.info(`setting timer ${payer} ${timer}`);
    const timerId = timers[`${payer}_${timer}`];
    if (timerId) {
      clearTimeout(timerId);
    }
    if (seconds == 0) return;
    logger.info(`firing timer ${payer} ${timer}`);

    var fn = (async(n) => {
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
          keyProvider: [process.env.DSP_PRIVATE_KEY ? process.env.DSP_PRIVATE_KEY : key.active.privateKey]
        });
      }
      catch (e) {
        if (e.toString().indexOf('duplicate') == -1) {
          logger.error(`response error, could not call contract timer callback ${payer} ${timer} ${e.toString()}`, e);
          if (n < 10) {
            const nextTrySeconds = (Math.pow(2, n)) * 1000;
            logger.info(`scheduling callback with payload ${payload} on timer ${payer+'_'+timer} for ${nextTrySeconds} from now`);
            timers[`${payer}_${timer}`] = setTimeout(() => fn(n + 1), );
          }
          logger.error(`failed callback for timer ${payer+'_'+timer} too many times, giving up`, e);
          // throw e;
        }

      }
    });
    timers[`${payer}_${timer}`] = setTimeout(() => fn(0), seconds * 1000);
  }
});
