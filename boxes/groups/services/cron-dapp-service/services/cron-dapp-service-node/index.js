var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, pushTransaction, getEosForSidechain, paccount, getLinkedAccount, emitUsage } = require('../dapp-services-node/common');
const logger = require('../../extensions/helpers/logger');
const { dappServicesContract } = require('../../extensions/tools/eos/dapp-services');
const { loadModels } = require("../../extensions/tools/models");

var timers = {};

nodeFactory('cron', {
  schedule: async({ rollback, replay, event, exception }, { timer, payload, seconds }) => {
    if (exception || replay || rollback || process.env.PASSIVE_DSP_NODE) { return; }

    const { payer, packageid, current_provider, meta } = event;
    const { sidechain } = meta;
    logger.debug("Received event: %j", event);
    logger.info(`setting timer ${payer} ${timer} for ${seconds} seconds from now`);
    const timerId = timers[`${payer}_${timer}`];
    if (timerId) {
      clearTimeout(timerId);
    }
    if (seconds == 0) return;

    var fn = (async(n) => {
      delete timers[`${payer}_${timer}`];
      let eosMain = await eosDSPGateway();
      let dapp = dappServicesContract;

      
      if(sidechain) {
        dapp = await getLinkedAccount(null, null, dappServicesContract, sidechain.name);
        eosMain = await getEosForSidechain(sidechain,current_provider,true);
      }
      let data = {
        current_provider,
        timer,
        'package': packageid,
        payload,
        seconds
      };
      try {        
        logger.info(`firing timer ${payer} ${timer}`);
        await pushTransaction(eosMain,dapp,payer,current_provider, "xschedule", data);
        if(sidechain) {
          let loadedExtensions = await loadModels("dapp-services");
          let service = loadedExtensions.find(a => a.name == "cron").contract;
          let mainnet_account = getLinkedAccount(null, null, payer, sidechain.name);
          await emitUsage(mainnet_account, service);
        }
        //TODO: verify usage, emit if sidechain
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
