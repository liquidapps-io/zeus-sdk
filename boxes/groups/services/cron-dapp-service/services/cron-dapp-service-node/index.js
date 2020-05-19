const { requireBox } = require('@liquidapps/box-utils');
var { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, pushTransaction, getEosForSidechain, paccount, getLinkedAccount, emitUsage } = requireBox('dapp-services/services/dapp-services-node/common');
const logger = requireBox('log-extensions/helpers/logger');
const { dappServicesContract } = requireBox('dapp-services/tools/eos/dapp-services');
const { loadModels } = requireBox('seed-models/tools/models');

let timers = {};
nodeFactory('cron', {
  schedule: async ({ rollback, replay, event, exception }, { timer, payload, seconds }) => {
    if (exception || replay || rollback || process.env.PASSIVE_DSP_NODE) { return; }

    const { payer, packageid, current_provider, meta } = event;
    const { sidechain } = meta;
    logger.debug("Received event: %j", event);
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
          // now have to pass all settings all the way through.. and make generic
          logger.info(`got reschedule request, resetting for ${seconds}`);
          timers[`${payer}_${timer}`] = setTimeout(() => fn(n), seconds * 1000);
          return;
        }
        if (sidechain) {
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
          // schedule cron based on interval specified as a guarantee, if fail, exponential backoff
          const nextTrySeconds = Math.min(seconds, Math.pow(2, n)) * 1000;
          logger.info(`scheduling callback with payload ${payload} on timer ${payer + '_' + timer} for ${nextTrySeconds} from now`);
          timers[`${payer}_${timer}`] = setTimeout(() => fn(n + 1), nextTrySeconds);
          // does not give up any more
        }
      }
    });
    timers[`${payer}_${timer}`] = setTimeout(() => fn(0), seconds * 1000);
  }
});
