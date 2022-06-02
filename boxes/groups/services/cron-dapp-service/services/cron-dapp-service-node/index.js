const { requireBox } = require('@liquidapps/box-utils');
var { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, pushTransaction, getEosForSidechain, paccount, getLinkedAccount, emitUsage } = requireBox('dapp-services/services/dapp-services-node/common');
const logger = requireBox('log-extensions/helpers/logger');
const { dappServicesContract } = requireBox('dapp-services/tools/eos/dapp-services');
const { loadModels } = requireBox('seed-models/tools/models');
const dal = requireBox('dapp-services/services/dapp-services-node/dal/dal');

const delay = ms => new Promise(res => setTimeout(res, ms));

let timers = {}, startup=true, data;

const intervalCallback = (async (event, { timer, payload, seconds }) => {

  const { payer, packageid, current_provider, meta } = event;
  const { sidechain } = meta;
  let eosMain = await eosDSPGateway();
  let dapp = dappServicesContract;

  if (sidechain) {
      dapp = await getLinkedAccount(null, null, dappServicesContract, sidechain.name);
      eosMain = await getEosForSidechain(sidechain, current_provider, true);
  }
  data = {
      current_provider,
      timer,
      'package': packageid,
      payload,
      seconds
  };
  if(process.env.DSP_VERBOSE_LOGS) logger.info(`firing interval ${payer} ${timer} ${sidechain ? sidechain.name : ''}`);
  let res, error = false;
  try {
      res = await pushTransaction(eosMain, dapp, payer, current_provider, "xinterval", data);
  }
  catch (e) {
    error = true;
    let strErr = JSON.stringify(e);
    if (strErr.includes('duplicate') 
        || strErr.includes('abort_service_request') 
        || strErr.includes('required service') 
        || strErr.includes('to account does not exist') 
        || strErr.includes('tx_cpu_usage_exceeded')
        || strErr.includes('tx_net_usage_exceeded')
        || strErr.includes('string is too long to be a valid name')
    ) {
      let message;
      if(strErr.includes('duplicate')) {
        message = `duplicate trx detected ${payer} ${timer}`
      } else if(strErr.includes('abort_service_request')) {
        message = `abort service request detected ${payer} ${timer}`
      } else if(strErr.includes('required service')) {
        message = `required service error detected, DSP unable to fulfill request ${payer} ${timer} ${process.env.DSP_VERBOSE_LOGS ? strErr : ''}`
      } else if(strErr.includes('tx_cpu_usage_exceeded') || strErr.includes('tx_net_usage_exceeded')) {
        message = `STAKE MORE CPU/NET resetting timer ${payer} ${timer}`
      } else if(strErr.includes('string is too long to be a valid name') || strErr.includes('tx_net_usage_exceeded')) {
        message = `invalid name ${payer} ${timer}`
      } else {
        message = `to account does not exist ${payer} ${timer}`
      }
      if(process.env.DSP_VERBOSE_LOGS) logger.warn(message);
    } else {
      console.error("error:", e);
      logger.error(`Error executing interval transaction: ${e.json ? JSON.stringify(e.json) : strErr}`);
    }
  }
  if (sidechain && error === false) {
      let loadedExtensions = await loadModels("dapp-services");
      let service = loadedExtensions.find(a => a.name == "cron").contract;
      let mainnet_account = await getLinkedAccount(null, null, payer, sidechain.name);
      await emitUsage(mainnet_account, service);
  }
});

nodeFactory('cron', {
  schedule: async ({ rollback, replay, event, exception }, { timer, payload, seconds }) => {
    if (exception || replay || rollback || process.env.PASSIVE_DSP_NODE) { 
      logger.debug(`exception: ${exception} || replay: ${replay} || rollback: ${rollback} || PASSIVE_DSP_NODE: ${process.env.PASSIVE_DSP_NODE} hit, not running cron`)
      return; 
    }

    const { payer, packageid, current_provider, meta } = event;
    const { sidechain } = meta;
    // logger.debug("Received event: %j", event);
    logger.info(`setting timer SCHEDULE_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"} for ${seconds} seconds from now`);
    const timerId = timers[`SCHEDULE_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`];
    if (timerId) {
      clearTimeout(timerId);
    }

    if (seconds == 0) {
      // log error since cron not being fired
      logger.error(`cron not being scheduled because cron interval is ${seconds} for ${payer}, must be > ${seconds}`);
      return
    }

    const fn = (async (n) => {
      delete timers[`SCHEDULE_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`];
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
        logger.info(`firing timer SCHEDULE_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`);
        const res = await pushTransaction(eosMain, dapp, payer, current_provider, "xschedule", data);
        if (sidechain) {
          let loadedExtensions = await loadModels("dapp-services");
          let service = loadedExtensions.find(a => a.name == "cron").contract;
          let mainnet_account = await getLinkedAccount(null, null, payer, sidechain.name);
          await emitUsage(mainnet_account, service);
        }
        //TODO: verify usage, emit if sidechain
      }
      catch (e) {
        const nextTrySeconds = Math.min(seconds, Math.pow(2, n)) * 1000;
        if (JSON.stringify(e).includes('duplicate') 
            || JSON.stringify(e).includes('abort_service_request') 
            || JSON.stringify(e).includes('required service') 
            || JSON.stringify(e).includes('to account does not exist') 
            || JSON.stringify(e).includes('tx_cpu_usage_exceeded')
            || JSON.stringify(e).includes('tx_net_usage_exceeded')
            || JSON.stringify(e).includes('string is too long to be a valid name')
            || JSON.stringify(e).includes('leeway_deadline_exception')
            || JSON.stringify(e).includes('expired_tx_exception')
        ) {
          // schedule cron based on interval specified as a guarantee, if fail, exponential backoff
          
          let message;
          if(JSON.stringify(e).includes('duplicate')) {
            message = `duplicate trx detected, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else if(JSON.stringify(e).includes('abort_service_request')) {
            message = `abort service request detected, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else if(JSON.stringify(e).includes('required service')) {
            message = `required service error detected, DSP unable to fulfill request, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else if(JSON.stringify(e).includes('tx_cpu_usage_exceeded') || JSON.stringify(e).includes('tx_net_usage_exceeded')) {
            message = `STAKE MORE CPU/NET resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else if(JSON.stringify(e).includes('string is too long to be a valid name') || JSON.stringify(e).includes('tx_net_usage_exceeded')) {
            message = `invalid name, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else if(JSON.stringify(e).includes('leeway_deadline_exception')) {
            message = `Transaction reached the deadline set due to leeway on account CPU limits, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          } else if(JSON.stringify(e).includes('expired_tx_exception')) {
            message = `Transaction expired, resetting timer ${payer} ${timer} for ${nextTrySeconds} ${process.env.DSP_EOSIO_TRANSACTION_EXPIRATION}`
          } else {
            message = `to account does not exist, resetting timer ${payer} ${timer} for ${nextTrySeconds}`
          }
          if(process.env.DSP_VERBOSE_LOGS) logger.warn(message);
          timers[`SCHEDULE_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`] = setTimeout(() => fn(n + 1), nextTrySeconds);
          // does not give up any more
        } else {
          console.error("error:", e);
          logger.error(`Error executing schedule transaction: ${e.json ? JSON.stringify(e.json) : JSON.stringify(e)}`);
          if(process.env.DSP_CRON_SCHEDULE_RETRY_ON_FAILURE.toString() === "true") {
            if(process.env.DSP_VERBOSE_LOGS) logger.warn(`cron schedule retry on failure enabled, retrying`,process.env.DSP_CRON_SCHEDULE_RETRY_ON_FAILURE)
            timers[`SCHEDULE_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`] = setTimeout(() => fn(n + 1), nextTrySeconds);
          }
        }
      }
    });
    timers[`SCHEDULE_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`] = setTimeout(() => fn(0), seconds * 1000);
  },
  interval: async ({ rollback, replay, event, exception }, { timer, payload, seconds }) => {
    if (exception || replay || rollback || process.env.PASSIVE_DSP_NODE) { 
      logger.debug(`exception: ${exception} || replay: ${replay} || rollback: ${rollback} || PASSIVE_DSP_NODE: ${process.env.PASSIVE_DSP_NODE} hit, not running cron`)
      return; 
    }

    const { payer, packageid, current_provider, meta } = event;
    const { sidechain } = meta;

    if (seconds == 0) {
        // log error since cron not being fired
        logger.error(`cron not being scheduled because cron interval is ${seconds} for ${payer}, must be > ${seconds}`);
        return
    }
    const timerId = timers[`INTERVAL_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`];
    if (timerId) {
      // logger.debug(`interval already set INTERVAL_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`)
      return;
    }
    const interval = await dal.fetchCronInterval(`INTERVAL_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`);
    if (interval) {
      logger.debug(`interval already set fetchCronInterval INTERVAL_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`)
      return
    }
    logger.warn(`INTERVAL_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`)
    const serviceRequest = await dal.createCronInterval(`INTERVAL_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`, timer, payload, seconds, event);

    while (true) {
      try {
        await serviceRequest.save();
      }
      catch (e) {
        if (e.name === 'SequelizeOptimisticLockError') {
          logger.warn(`SequelizeOptimisticLockError error`)
          await delay(10);
          continue;
        } else {
          throw e;
        }
      }
      logger.info(`Cron Interval created for: INTERVAL_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`);
      break;
    }
    timers[`INTERVAL_${payer}_${timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`] = setInterval(() => intervalCallback(event, { timer, payload, seconds }), seconds * 1000);
  },
  rminterval: async ({ rollback, replay, event, exception }, { timer }) => {
    if (replay || rollback || process.env.PASSIVE_DSP_NODE) { 
        logger.debug(`exception: ${exception} || replay: ${replay} || rollback: ${rollback} || PASSIVE_DSP_NODE: ${process.env.PASSIVE_DSP_NODE} hit, not running cron`)
        return; 
    }
    let sidechain_name;
    if(event.meta && event.meta.sidechain && event.meta.sidechain.name) {
      sidechain_name = event.meta.sidechain.name
    }
    logger.warn(`removing INTERVAL_${event.payer}_${timer}_${sidechain_name ? sidechain_name : "PROVISIONING_X"}`)
    const timerId = timers[`INTERVAL_${event.payer}_${timer}_${sidechain_name ? sidechain_name : "PROVISIONING_X"}`];
    let counter = 0;
    while (true && counter++ < 5) {
      try {
        let res = await dal.removeCronInterval(`INTERVAL_${event.payer}_${timer}_${sidechain_name ? sidechain_name : "PROVISIONING_X"}`);
        if(res) logger.info('interval removed');
        if(!res) {
          logger.warn('interval not removed, retrying');
          continue;
        } 
      }
      catch (e) {
        if (e.name === 'SequelizeOptimisticLockError'){ 
          continue;
        } else {
          throw e;
        }
      }
      break;
    }
    clearTimeout(timerId);
    delete timers[`INTERVAL_${event.payer}_${timer}_${sidechain_name ? sidechain_name : "PROVISIONING_X"}`];
    return {
      timer
    };
  }
});

(async () => {
  if(startup===false) return;
  logger.info('fetching initial intervals from db')
  let intervals = await dal.fetchAllCronInterval();
  for(const el of intervals) {
    // await dal.removeCronInterval(el.key);
    const { payer, packageid, current_provider, meta } = el.event;
    const { sidechain } = meta;
    logger.warn(`INTERVAL_${payer}_${el.timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`)
    timers[`INTERVAL_${payer}_${el.timer}_${sidechain ? sidechain.name : "PROVISIONING_X"}`] = setInterval(() => intervalCallback(el.event, {timer: el.timer, payload: el.payload, seconds: el.seconds}), el.seconds * 1000);
  }
  startup=false;
})().catch((e) => { logger.error(e); });