var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, pushTransaction } = require('../dapp-services-node/common');
const logger = require('../../extensions/helpers/logger');

var timers = {};

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
      delete timers[`${payer}_${timer}`];
      const eosMain = await eosDSPGateway();
      let data = {
        current_provider,
        timer,
        'package': packageid,
        payload,
        seconds
      };
      try {
        await pushTransaction(eosMain,payer,current_provider, "xschedule", data);
      }
      catch (e) {
        console.error("error:", e);
        logger.error(`Error executing cron transaction: ${e.json ? JSON.stringify(e.json) : JSON.stringify(e)}`);
                
        if (e.toString().indexOf('duplicate') == -1) {
          logger.error(`response error, could not call contract timer callback ${payer} ${timer} ${e.toString()}`, e);
          if (n < 10) {
            const nextTrySeconds = (Math.pow(2, n)) * 1000;
            logger.info(`scheduling callback with payload ${payload} on timer ${payer+'_'+timer} for ${nextTrySeconds} from now`);
            timers[`${payer}_${timer}`] = setTimeout(() => fn(n+1), nextTrySeconds);
          }
          logger.error(`failed callback for timer ${payer+'_'+timer} too many times, giving up`, e);
          // throw e;
        }

      }
    });
    timers[`${payer}_${timer}`] = setTimeout(() => fn(0), seconds * 1000);
  }
});
