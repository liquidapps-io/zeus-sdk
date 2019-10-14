#!/usr/bin/env node

require('babel-core/register');
require('babel-polyfill');
if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }
const path = require('path');
const fs = require('fs');
const logger = require('../../extensions/helpers/logger');
const { loadModels } = require('../../extensions/tools/models');
const { getCreateKeys } = require('../../extensions/helpers/key-utils');
const { dappServicesContract, getContractAccountFor } = require('../../extensions/tools/eos/dapp-services');
const { getEosWrapper } = require('../../extensions/tools/eos/eos-wrapper');
const { deserialize, generateABI, genNode, eosPrivate, paccount, forwardEvent, resolveProviderData, resolveProvider, getProviders, resolveProviderPackage, paccountPermission } = require('./common');


const actionHandlers = {
  'service_request': async(act, simulated, serviceName, handlers) => {
    let isReplay = act.replay;
    let { service, payer, provider, action, data, broadcasted } = act.event;

    var handler = handlers[action];
    var models = await loadModels('dapp-services');
    var model = models.find(m => m.contract == service);
    if (isReplay && provider == '') {
      provider = paccount;
      if (!(getContractAccountFor(model) == service && handler)) { return; }
      await handleRequest(handler, act, packageid, serviceName, handlers.abi);
      return;
    }
    if (!model.commands[action]) {
      logger.error(`not found in model ${action} in ${model.name} - ${service}`);
      throw new Error(`not found in model ${action} in ${model.name} - ${service}`);
    }
    if (model.commands[action].broadcast && !broadcasted) {
      //this is a broadcast action - spam all relevant DSPs in parallel
      //including ourselves
      act.event.broadcasted = true;
      let providers = await getProviders(payer, service, false);
      await Promise.all(providers.map(async(prov) => {
        let packageid = await resolveProviderPackage(payer, service, prov.provider);
        let providerData = await resolveProviderData(service, prov.provider, packageid);
        if (!providerData) return;
        await forwardEvent(act, providerData.endpoint, false);
      }));
      return 'retry';
    }

    provider = await resolveProvider(payer, service, provider);

    var packageid = isReplay ? 'replaypackage' : await resolveProviderPackage(payer, service, provider);
    if (provider !== paccount) {
      var providerData = await resolveProviderData(service, provider, packageid);
      if (!providerData) { return; }
      return await forwardEvent(act, providerData.endpoint, act.exception);
    }

    if (!simulated) {
      if (!(getContractAccountFor(model) == service && handler)) { return; }
      await handleRequest(handler, act, packageid, model.name, handlers.abi);
      return;
    }
    if (!act.exception) { return; }
    if (getContractAccountFor(model) == service && handler) {
      await handleRequest(handler, act, packageid, model.name, handlers.abi);
      return 'retry';
    }
  },
  'service_signal': async(act, simulated, serviceName, handlers) => {
    if (simulated) { return; }
    let { action, data } = act.event;
    var typeName = `sig_${action}`;
    var handler = handlers[typeName];
    var sigData = deserialize(handlers.abi, data, typeName);

    // todo: verify sig and usage for each xaction
    if (!handler && !sigData) {
      // console.log('unhandled signal', act);
      return;
    }
    await handler(sigData);
  },
  'usage_report': async(act, simulated, serviceName, handlers) => {
    if (simulated) { return; }
    var handler = handlers[`_usage`];
    // todo: handle quota and verify sig and usage for each xaction
    if (handler) {
      await handler(act.event);
    }
    else {
      // console.log('unhandled usage_report', act.event);
    }
  }
};
const detectXCallback = async(eos) => {
  var contract = await eos.contract(dappServicesContract);
  if (contract.xcallback)
    return true;
  else return false;
}
let enableXCallback = null;
const handleRequest = async(handler, act, packageid, serviceName, abi) => {
  let { service, payer, provider, action, data } = act.event;
  data = deserialize(abi, data, action);
  if (!data) { return; }

  act.event.current_provider = paccount;
  act.event.packageid = packageid;
  const metadata = act.event.meta;
  const account = act.account;
  const eosPrivate = await getEosWrapper({
    chainId: process.env.NODEOS_CHAINID, // 32 byte (64 char) hex string
    expireInSeconds: 120,
    sign: true,
    broadcast: true,
    blocksBehind: 10,
    httpEndpoint: `http${process.env.NODEOS_SECURED === 'true' || false ? 's':''}://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_PORT || 8888}`,
    keyProvider: process.env.DSP_PRIVATE_KEY || (await getCreateKeys(paccount)).active.privateKey
  });

  let responses = await handler(act, data);
  if (!responses) { return; }
  if (!Array.isArray(responses)) // needs conversion from a normal object
  { responses = respond(act.event, packageid, responses); }
  var meta = {};
  await Promise.all(responses.map(async(response) => {

    var requestId = "";
    if (metadata) {
      // is async
      requestId = `${metadata.txId}.${act.event.action}.${account}.${metadata.eventNum}`;
    }
    var actions = [];
    if (enableXCallback === null) {
      enableXCallback = await detectXCallback(eosPrivate);
    }
    if (enableXCallback === true) {
      actions.push({
        account: dappServicesContract,
        name: "xcallback",
        authorization: [{
          actor: paccount,
          permission: 'active',
        }],
        data: {
          provider: paccount,
          request_id: requestId,
          meta: JSON.stringify(meta)
        },
      });
    }
    actions.push({
      account: payer,
      name: response.action,
      authorization: [{
        actor: paccount,
        permission: 'active',
      }],
      data: response.payload,
    });



    try {
      let tx = await eosPrivate.transact({
        actions
      }, {
        expireSeconds: 120,
        sign: true,
        broadcast: true,
        blocksBehind: 10
      });
      logger.debug("REQUEST\n%j\nRESPONSE: [%s]\n%j", act, tx.transaction_id, response);


    }
    catch (e) {
      if (e.json)
        e.error = e.json.error;

      logger.warn("REQUEST\n%j\nRESPONSE: [FAILED]\n%j", act, e);
      if (e.toString().indexOf('duplicate') == -1) {
        console.log(`response error, could not call contract callback for ${response.action}`, e);
        throw e;
      }
    }
    // dispatch on chain response - call response.action with params with paccount permissions
  }));
};

const respond = (request, packageid, payload) => {
  payload.current_provider = request.current_provider;
  payload.package = packageid;
  return [{
    action: `x${request.action}`,
    payload,
    request
  }];
};

const loadIfExists = async(serviceName, suffix) => {
  var reqPath = path.resolve(__dirname, `../${serviceName}-dapp-service-node/${suffix}`);
  if (fs.existsSync(reqPath + ".js"))
    return require(reqPath)
}

const nodeFactory = async(serviceName, handlers) => {
  var models = await loadModels('dapp-services');
  var model = models.find(m => m.name == serviceName);
  logger.info(`nodeFactory starting ${serviceName}`);
  return genNode(actionHandlers, process.env.SVC_PORT || model.port, serviceName, handlers, await generateABI(model));
};

const nodeAutoFactory = async(serviceName) => {
  var state = {};
  logger.info(`nodeAutoFactory starting ${serviceName}`);

  var apiCommands = {};
  var models = await loadModels('dapp-services');
  var model = models.find(m => m.name == serviceName);
  var stateHandler = await loadIfExists(serviceName, 'state-init'); // load from file
  if (stateHandler)
    await stateHandler(state);


  if (model.api) {
    var apiActions = Object.keys(model.api);
    for (var i = 0; i < apiActions.length; i++) {
      var apiName = apiActions[i];
      var apiHandler = await loadIfExists(serviceName, `api/${apiName}`); // load from file
      logger.debug(`registering api ${serviceName} ${apiName}`);
      apiCommands[apiName] = (async({ apiName, apiHandler }, opts, res) => {
        try {
          if (apiHandler)
            throw new Error('not implemented yet');
          const result = await apiHandler(opts, res, state);
          res.send(JSON.stringify(result));
        }
        catch (e) {
          res.status(400);
          console.error("error:", e);
          res.send(JSON.stringify({ error: e.toString() }));
        }
      }).bind(handlers, { apiName, apiHandler });
    }
  }

  var handlers = {
    api: apiCommands
  }
  var dspCommands = Object.keys(model.commands);
  for (var i = 0; i < dspCommands.length; i++) {
    var requestName = dspCommands[i];
    var dspRequestHandler = await loadIfExists(serviceName, `chain/${requestName}`); // load from file
    logger.debug(`registering chain handler ${serviceName} ${requestName}`);
    handlers[requestName] = (async({ requestName, dspRequestHandler }, opts, req) => {
      if (!dspRequestHandler)
        throw new Error('not implemented yet');
      logger.debug(`running chain handler ${serviceName} ${requestName}`);
      try {
        return await dspRequestHandler(opts, req, state);
      }
      catch (e) {
        logger.error(e);
      }
    }).bind(handlers, { requestName, dspRequestHandler });
  }
  return nodeFactory(serviceName, handlers);
}

module.exports = { nodeAutoFactory, nodeFactory, respond };
