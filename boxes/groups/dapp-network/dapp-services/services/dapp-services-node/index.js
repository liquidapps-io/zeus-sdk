#!/usr/bin/env node



if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }
const logger = require('../../extensions/helpers/logger');
const { genNode, genApp, paccount, processFn, forwardEvent, resolveProviderData, resolveProvider, resolveProviderPackage, getLinkedAccount } = require('./common');
const dal = require('./dal/dal');
const { loadModels } = require('../../extensions/tools/models');

const actionHandlers = {
  'service_request': async(act, simulated) => {
    let { service, provider, sidechain, meta } = act.event;
    if (!sidechain && meta && meta.sidechain) {
      sidechain = sidechainsDict[meta.sidechain.name];
    }
    logger.debug(`service_request to: ${service}`)

    var payer = act.event.payer ? act.event.payer : act.receiver;
    let isReplay = act.replay;
    if (isReplay && provider == '') {
      provider = paccount;
    }
    else {
      provider = await resolveProvider(payer, service, provider, sidechain);
    }
    var packageid = isReplay ? 'replaypackage' : await resolveProviderPackage(payer, service, provider, sidechain);
    if (sidechain)
      service = await getLinkedAccount(null, null, service, sidechain.name, true);
    var providerData = await resolveProviderData(service, provider, packageid, sidechain);
    if (!providerData) { throw new Error('provider data not found'); }
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
          logger.debug(`request already exists ${key}`);
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
        logger.info(`processing request: key: ${key} value: ${meta.blockNum}`);
        break;
      }
      // TODO: if not synced, aggregate and dispatch pending requests when syncd.
      // todo: send events in recovery mode.
    }
    logger.debug(`forwarding to: ${providerData.endpoint}`);
    act.sidechain = sidechain;
    return await forwardEvent(act, providerData.endpoint, act.exception && !act.event.broadcasted);


  },
  'service_signal': async(act, simulated) => {
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
        logger.debug(`forwarding signal ${key}`);
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
  'usage_report': async(act, simulated) => {
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
        logger.debug(`forwarding usage ${key}`);
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
  const sidechains = await loadModels('local-sidechains');
  sidechains.forEach(sc => sidechainsDict[sc.name] = sc);
  const scName = process.env.SIDECHAIN;
  // if sidechain gateway (identified by ^)
  if(scName) {
      const sidechain = sidechains.find(sc => sc.name === scName);
      if (!sidechain) throw new Error(`could not find sidechain ${scName} under models/local-sidechains`);
      await genNode(actionHandlers, process.env.PORT || 3116, 'services', undefined, undefined, sidechain);
  } else {
    await genNode(actionHandlers, process.env.PORT || 3115, 'services');
  }
}
genAllNodes();

const bootTime = Date.now();
let inRecoveryMode = false;
const appWebHookListener = genApp();
appWebHookListener.post('/', async(req, res) => {
  req.body.replay = inRecoveryMode;
  await processFn(actionHandlers, req.body);
  res.send(JSON.stringify('ok'));
});

appWebHookListener.listen(process.env.WEBHOOK_DAPP_PORT || 8812, () => console.log(`service node webhook listening on port ${process.env.WEBHOOK_DAPP_PORT || 8812}!`));