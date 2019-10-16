#!/usr/bin/env node

require('babel-core/register');
require('babel-polyfill');
if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }
const logger = require('../../extensions/helpers/logger');
const { genNode, genApp, paccount, processFn, forwardEvent, resolveProviderData, resolveProvider, resolveProviderPackage } = require('./common');
const dal = require('./dal/dal');

const actionHandlers = {
  'service_request': async(act, simulated) => {
    let { service, provider } = act.event;
    var payer = act.event.payer ? act.event.payer : act.receiver;
    let isReplay = act.replay;
    if (isReplay && provider == '') {
      provider = paccount;
    }
    else {
      provider = await resolveProvider(payer, service, provider);
    }
    var packageid = isReplay ? 'replaypackage' : await resolveProviderPackage(payer, service, provider);
    var providerData = await resolveProviderData(service, provider, packageid);
    if (!providerData) { throw new Error('provider data not found'); }
    if (!act.exception && paccount !== provider)
      return;

    if (!act.exception && !simulated) {
      const meta = act.event.meta;
      const account = act.account;
      const key = `${meta.txId}.${act.event.action}.${account}.${meta.eventNum}`;
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
    return await forwardEvent(act, providerData.endpoint, act.exception);


  },
  'service_signal': async(act, simulated) => {
    if (simulated) { return; }
    let { service, provider } = act.event;
    if (provider !== paccount)
      return;
    var packageid = act.event.package;
    const meta = act.event.meta;
    const { cbevent, blockNum } = meta;
    if (cbevent && cbevent.request_id) {
      const key = cbevent.request_id;
      // logger.debug(`got service response (signal) :\nkey: ${key} value: ${blockNum} - ${JSON.stringify(act.event)}`);
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
    var providerData = await resolveProviderData(service, provider, packageid);
    if (!providerData) { throw new Error('provider data not found'); }
    return await forwardEvent(act, providerData.endpoint);
  },
  'usage_report': async(act, simulated) => {
    if (simulated) { return; }
    let { service, provider } = act.event;
    if (provider !== paccount)
      return;
    const meta = act.event.meta;
    const { cbevent, blockNum } = meta;
    if (cbevent && cbevent.request_id) {
      const key = cbevent.request_id;
      // logger.info(`got usage report:\nkey: ${key} value: ${blockNum}`);
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
    var providerData = await resolveProviderData(service, provider, packageid);
    if (!providerData) { throw new Error('provider data not found'); }
    return await forwardEvent(act, providerData.endpoint);
  }
};

genNode(actionHandlers, process.env.PORT || 3115, 'services');

const bootTime = Date.now();
let inRecoveryMode = false;
const appWebHookListener = genApp();
appWebHookListener.post('/', async(req, res) => {
  req.body.replay = inRecoveryMode;
  await processFn(actionHandlers, req.body);
  res.send(JSON.stringify('ok'));
});

appWebHookListener.listen(process.env.WEBHOOK_DAPP_PORT || 8812, () => console.log(`service node webhook listening on port ${process.env.WEBHOOK_DAPP_PORT || 8812}!`));
