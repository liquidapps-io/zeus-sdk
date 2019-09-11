#!/usr/bin/env node

require('babel-core/register');
require('babel-polyfill');
if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }
const logger = require('../../extensions/helpers/logger');
const { genNode, genApp, paccount, processFn, forwardEvent, resolveProviderData, resolveProvider, resolveProviderPackage } = require('./common');
const dal = require('./dal/dal');

const actionHandlers = {
  'service_request': async(act, simulated) => {
    console.log('dsp svc req')
    console.log(JSON.stringify(act))
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
    if (act.exception || paccount == provider) {
      if (!act.exception && !simulated) {
        const meta = act.event.meta;
        const account = act.account;
        const key = `${meta.txId}.${act.event.action}.${account}.${meta.eventNum}`;
        const value = { 'request_block_num': meta.blockNum };
        console.log(`Storing service request in db:`)
        console.log('key', key)
        console.log('value', value)
        await dal.createServiceRequest(key, value);
      }
      return await forwardEvent(act, providerData.endpoint, act.exception);
    }
  },
  'service_signal': async(act, simulated) => {
    console.log('dsp svc sig')
    if (simulated) { return; }
    let { service, provider } = act.event;
    var packageid = act.event.package;
    if (paccount != provider) { return; }
    var providerData = await resolveProviderData(service, provider, packageid);
    if (!providerData) { throw new Error('provider data not found'); }
    return await forwardEvent(act, providerData.endpoint);
  },
  'usage_report': async(act, simulated) => {
    console.log('dsp usg rep')
    if (simulated) { return; }
    let { service, provider } = act.event;
    if (paccount != provider) { return; }
    var packageid = act.event.package;
    var providerData = await resolveProviderData(service, provider, packageid);
    if (!providerData) { throw new Error('provider data not found'); }
    return await forwardEvent(act, providerData.endpoint);
  }
};

genNode(actionHandlers, process.env.PORT || 3115, 'services');
var isReplay = false;
const appWebHookListener = genApp();
appWebHookListener.post('/', async(req, res) => {
  // var account = req.body.account;
  // var method = req.body.method;
  // var receiver = req.body.receiver;
  var event = req.body.event;
  var body = req.body;
  // var data = req.body.data;
  // console.log("req.body",req.body);
  // logger.debug("WEBHOOK: [%s:%s][%s:%s]\tTXID:%s\tDATA:%s", body.receiver, body.method, event.etype, event.action || '---', event.txid, event.data);
  req.body.replay = isReplay;
  await processFn(actionHandlers, req.body);
  res.send(JSON.stringify('ok'));
});

appWebHookListener.listen(process.env.WEBHOOK_DAPP_PORT || 8812, () => console.log(`service node webhook listening on port ${process.env.WEBHOOKPORT || 8812}!`));
