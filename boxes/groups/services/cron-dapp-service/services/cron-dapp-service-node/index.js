const { requireBox } = require('@liquidapps/box-utils');
var { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, pushTransaction, getEosForSidechain, paccount, getLinkedAccount, emitUsage } = requireBox('dapp-services/services/dapp-services-node/common');
const logger = requireBox('log-extensions/helpers/logger');
const { dappServicesContract } = requireBox('dapp-services/tools/eos/dapp-services');
const { loadModels } = requireBox('seed-models/tools/models');

let timers = {};
nodeFactory('cron', {
  schedule: async ({ rollback, replay, event, exception }, { timer, payload, seconds }) => {
    if (exception || replay || rollback || process.env.PASSIVE_DSP_NODE) { 
      logger.debug(`exception: ${exception} || replay: ${replay} || rollback: ${rollback} || PASSIVE_DSP_NODE: ${process.env.PASSIVE_DSP_NODE} hit, not running cron`)
      return; 
    }

    const { payer, packageid, current_provider, meta } = event;
    const { sidechain } = meta;
    // logger.debug("Received event: %j", event);
    logger.info(`setting timer ${payer} ${timer} for ${seconds} seconds from now`);
    const timerId = timers[`${payer}_${timer}`];
    if (timerId) {
      clearTimeout(timerId);
    }

    if (seconds == 0) {
      // log error since cron not being fired
      logger.error(`cron not being scheduled because cron interval is ${seconds} for ${payer}, must be > ${seconds}`);
      return
    }

    const fn = (async (n) => {
      delete timers[`${payer}_${timer}`];
      let eosMain = await eosDSPGateway();
      let dapp = dappServicesContract;

      if (sidechain) {
        dapp = await getLinkedAccount(null, null, dappServicesContract, sidechain.name);
        eosMain = await getEosForSidechain(sidechain, current_provider, true);
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
        const res = await pushTransaction(eosMain, dapp, payer, current_provider, "xschedule", data);
        if (res.shouldAbort) {
          logger.warn(`do we ever get here?`)
          // now have to pass all settings all the way through.. and make generic
          logger.info(`abort service request detected, resetting timer ${payer} ${timer} for ${seconds}`);
          timers[`${payer}_${timer}`] = setTimeout(() => fn(n), seconds * 1000);
          return;
        }
        if (sidechain) {
          let loadedExtensions = await loadModels("dapp-services");
          let service = loadedExtensions.find(a => a.name == "cron").contract;
          let mainnet_account = await getLinkedAccount(null, null, payer, sidechain.name);
          await emitUsage(mainnet_account, service);
        }
        //TODO: verify usage, emit if sidechain
      }
      catch (e) {
        if (JSON.stringify(e).includes('duplicate') || JSON.stringify(e).includes('abort_service_request') || JSON.stringify(e).includes('required service') || JSON.stringify(e).includes('to account does not exist')) {
          // schedule cron based on interval specified as a guarantee, if fail, exponential backoff
          const nextTrySeconds = Math.min(seconds, Math.pow(2, n)) * 1000;
          let message;
          if(JSON.stringify(e).includes('duplicate')) {
            message = `duplicate trx detected, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else if(JSON.stringify(e).includes('abort_service_request')) {
            message = `abort service request detected, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else if(JSON.stringify(e).includes('required service')) {
            message = `required service error detected, DSP unable to fulfill request, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else {
            message = `to account does not exist, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          }
          logger.info(message);
          timers[`${payer}_${timer}`] = setTimeout(() => fn(n + 1), nextTrySeconds);
          // does not give up any more
        } else {
          console.error("error:", e);
          logger.error(`Error executing cron transaction: ${e.json ? JSON.stringify(e.json) : JSON.stringify(e)}`);
        }
      }
    });
    timers[`${payer}_${timer}`] = setTimeout(() => fn(0), seconds * 1000);
  }
});
