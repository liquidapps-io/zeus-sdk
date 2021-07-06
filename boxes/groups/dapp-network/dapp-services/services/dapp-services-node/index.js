#!/usr/bin/env node



if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }
const { genNode, genApp, paccount, processFn, forwardEvent, resolveProviderData, resolveProvider, resolveProviderPackage, getLinkedAccount } = require('./common');
const dal = require('./dal/dal');
const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
const { loadModels } = requireBox('seed-models/tools/models');

const actionHandlers = {
  'service_request': async (act, simulated, serviceName, handlers, isExternal) => {
    let { service, provider, sidechain, meta, action } = act.event;
    if (!sidechain && meta && meta.sidechain) {
      sidechain = sidechainsDict[meta.sidechain.name];
    }
    var payer = act.event.payer ? act.event.payer : act.receiver;
    // if we are replaying, skip processing package
    let isReplay = act.replay;
    if (isReplay && provider == '') {
      provider = paccount;
    }
    else {
      provider = await resolveProvider(payer, service, provider, sidechain);
    }
    var packageid = isReplay ? 'replaypackage' : await resolveProviderPackage(payer, service, provider, sidechain);
    
    if(process.env.DSP_VERBOSE_LOGS) logger.info(`received DSP API service request for ${service}:${action} payer ${payer} | DSP: ${provider}:${packageid} | exception: ${act.exception} | simulated: ${simulated} | service name: ${serviceName} | external: ${isExternal} | replay: ${isReplay}`)

    if (sidechain)
      service = await getLinkedAccount(null, null, service, sidechain.name, true);

    const models = await loadModels('dapp-services');
    const model = models.find(m => m.contract == service);
    if(process.env.DSP_ALLOW_API_NON_BROADCAST.toString() === "false" && !model.commands[action].broadcast && isExternal) {
      logger.warn(`Attempt to broadcast event for non broadcastable request, not processing trx, to enable non-broadcast events, set the allow_api_non_broadcast config.toml var to true under [dsp] section - ${JSON.stringify(act.event)}`);
      return;
    }
    if(isExternal && model.name === "sign") {
      logger.warn(`Sign request detected from external source, rejected`)
      return;
    }
  
    var providerData = await resolveProviderData(service, provider, packageid, sidechain);
    if (!providerData) { throw new Error('provider data not found'); }
    if (!model) { throw new Error('model not found'); }
    if (!act.exception && paccount !== provider)
      return;

    if (!act.exception && !simulated) {
      const account = act.account;
      let key = `${meta.txId}.${act.event.action}.${account}.${meta.eventNum}`;
      if (meta && meta.sidechain)
        key = `${meta.sidechain.name}.${key}`;
      while (true) {
        var serviceRequest = await dal.createServiceRequest(key);

        if (serviceRequest.request_block_num) {
          logger.debug(`DSP API request already exists ${key}`);
          return;
        }
        // save the req block num and the request itself incase we need
        // to dispatch it later
        serviceRequest.request_block_num = meta.blockNum;
        serviceRequest.data = { act, endpoint: providerData.endpoint };

        try {
          await serviceRequest.save();
        }
        catch (e) {
          if (e.name === 'SequelizeOptimisticLockError')
            continue;
          else throw e;
        }
        logger.info(`processing DSP API request: ${account}:${act.event.action}`);
        break;
      }
      // TODO: if not synced, aggregate and dispatch pending requests when syncd.
      // todo: send events in recovery mode.
    }
    act.sidechain = sidechain;
    return await forwardEvent(act, providerData.endpoint, act.exception && !act.event.broadcasted);
  },
  'service_signal': async (act, simulated) => {
    if (simulated) { return; }
    let { meta, service, provider, sidechain } = act.event;

    if (!sidechain && meta && meta.sidechain) {
      sidechain = sidechainsDict[meta.sidechain.name];
    }
    if (provider !== paccount)
      return;
    var packageid = act.event.package;
    const { cbevent, blockNum } = meta;
    if (cbevent && cbevent.request_id) {
      const key = cbevent.request_id;
      // if the service_request is simulated, this shouldn't update anything.
      while (true) {
        var serviceRequest = await dal.createServiceRequest(key);

        if (serviceRequest.signal_block_num) {
          logger.debug(`signal already exists ${key}`);
          return;
        }
        serviceRequest.signal_block_num = blockNum;
        try {
          await serviceRequest.save();
        }
        catch (e) {
          if (e.name === 'SequelizeOptimisticLockError')
            continue;
          else throw e;
        }
        if(process.env.DSP_VERBOSE_LOGS) logger.debug(`forwarding signal ${key}`);
        break;
      }
    }
    if (sidechain)
      service = await getLinkedAccount(null, null, service, sidechain.name, true);
    var providerData = await resolveProviderData(service, provider, packageid, sidechain);
    if (!providerData) { throw new Error('provider data not found'); }
    act.sidechain = sidechain;
    return await forwardEvent(act, providerData.endpoint);
  },
  'usage_report': async (act, simulated) => {
    if (simulated) { return; }
    let { service, provider, sidechain, meta } = act.event;
    if (!sidechain && meta && meta.sidechain) {
      sidechain = sidechainsDict[meta.sidechain.name];
    }
    if (sidechain)
      return;

    if (provider !== paccount)
      return;
    const { cbevent, blockNum } = meta;
    if (cbevent && cbevent.request_id) {
      const key = cbevent.request_id;
      // if the service_request is simulated, this shouldn't update anything.
      while (true) {
        var serviceRequest = await dal.createServiceRequest(key);

        if (serviceRequest.usage_block_num) {
          logger.debug(`usage already exists ${key}`);
          return;
        }
        serviceRequest.usage_block_num = blockNum;
        try {
          await serviceRequest.save();
        }
        catch (e) {
          if (e.name === 'SequelizeOptimisticLockError')
            continue;
          else throw e;
        }
        if(process.env.DSP_VERBOSE_LOGS) logger.debug(`forwarding usage ${key}`);
        break;
      }
    }
    var packageid = act.event.package;
    if (sidechain)
      service = await getLinkedAccount(null, null, service, sidechain.name, true);
    var providerData = await resolveProviderData(service, provider, packageid, sidechain);
    if (!providerData) { throw new Error('provider data not found'); }
    act.sidechain = sidechain;
    return await forwardEvent(act, providerData.endpoint);
  }
};

var sidechainsDict = {};

async function genAllNodes() {
  const sidechains = await loadModels('eosio-chains');
  sidechains.forEach(sc => sidechainsDict[sc.name] = sc);
  const scName = process.env.SIDECHAIN;
  // if sidechain gateway (identified by ^)
  if (scName) {
    const sidechain = sidechains.find(sc => sc.name === scName);
    if (!sidechain) throw new Error(`could not find sidechain ${scName} under models/eosio-chains`);
    await genNode(actionHandlers, process.env.PORT || 3116, 'services', undefined, undefined, sidechain);
  } else {
    await genNode(actionHandlers, process.env.PORT || 3115, 'services');
  }
}
genAllNodes();

const bootTime = Date.now();
let inRecoveryMode = false;
const appWebHookListener = genApp();
appWebHookListener.post('/', async (req, res) => {
  req.body.replay = inRecoveryMode;
  try {
    await processFn(actionHandlers, req.body);
  } catch (e) {
    logger.error(`gateway error processing demux hook: ${JSON.stringify(e)}`);
    res.send(JSON.stringify(`gateway error processing webhook`));
    return;
  }
  res.send(JSON.stringify('ok'));
});

appWebHookListener.listen(process.env.WEBHOOK_DAPP_PORT || 8812, () => console.log(`service node webhook listening on port ${process.env.WEBHOOK_DAPP_PORT || 8812}!`));