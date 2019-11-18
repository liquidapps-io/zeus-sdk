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
const { deserialize, generateABI, genNode, paccount, forwardEvent, resolveProviderData, resolveProvider, getProviders, resolveProviderPackage, paccountPermission, emitUsage, detectXCallback } = require('./common');


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
      logger.debug(`retry after broadcast ${action} to ${providers.length} providers`);

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
      logger.debug(`retry after handle ${action}`);
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
const getLinkedAccount = async(eosSideChain, eosMain, account, sidechainName, isSisterChain) => {
  if (!isSisterChain)
    return account;

  // TODO: resolve mapping if sidechain is sister chain (not same permissions)
  // eosSideChain get linkedaccount
  // eosMain get linkedaccount for sidechain_name
  throw new Error('not implemented yet');
}
let enableXCallback = null;
const handleRequest = async(handler, act, packageid, serviceName, abi) => {
  var { sidechain, event } = act;
  let { service, payer, provider, action, data } = event;
  const metadata = act.event.meta;
  data = deserialize(abi, data, action);
  if (!data) { return; }
  if (!sidechain && metadata && metadata.sidechain) {
    var models = await loadModels('local-sidechains');
    sidechain = models.find(m => m.name == metadata.sidechain);
  }

  act.event.current_provider = paccount;
  act.event.packageid = packageid;
  const account = act.account;

  // for provisioning

  var eosSideChain = await getEosWrapper({
    expireInSeconds: 120,
    sign: true,
    broadcast: true,
    blocksBehind: 10,
    httpEndpoint: sidechain ? sidechain.nodeos_endpoint : `http${process.env.NODEOS_SECURED === 'true' || false ? 's':''}://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_PORT || 8888}`,
    keyProvider: process.env.DSP_PRIVATE_KEY || (await getCreateKeys(paccount, null, false, sidechain)).active.privateKey
  });

  var requestId = "";
  var meta = {};
  if (metadata) {
    // is async
    requestId = `${metadata.txId}.${act.event.action}.${account}.${metadata.eventNum}`;
    if (metadata.sidechain)
      requestId = `${metadata.sidechain}.${requestId}`;
  }



  let responses = await handler(act, data);
  if (!responses) { return; }
  if (!Array.isArray(responses)) // needs conversion from a normal object
    responses = respond(act.event, packageid, responses);



  let sidechain_provider = paccount;
  if (sidechain) {
    const eosMain = await getEosWrapper({
      chainId: process.env.NODEOS_CHAINID, // 32 byte (64 char) hex string
      expireInSeconds: 120,
      sign: true,
      broadcast: true,
      blocksBehind: 10,
      httpEndpoint: `http${process.env.NODEOS_SECURED === 'true' || false ? 's':''}://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_PORT || 8888}`,
      keyProvider: process.env.DSP_PRIVATE_KEY || (await getCreateKeys(paccount)).active.privateKey
    });
    const mainnet_account = await getLinkedAccount(eosSideChain, eosMain, account, sidechain.name, sidechain.is_sister_chain);
    sidechain_provider = await getLinkedAccount(eosSideChain, eosMain, paccount, sidechain.name, sidechain.is_sister_chain);
    await emitUsage(mainnet_account, service, 1, sidechain, meta, requestId);
  }
  await Promise.all(responses.map(async(response) => {


    var actions = [];
    if (enableXCallback === null) {
      enableXCallback = await detectXCallback(eosSideChain);
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
          provider: sidechain_provider,
          request_id: requestId,
          meta: JSON.stringify(meta)
        },
      });
    }
    actions.push({
      account: payer,
      name: response.action,
      authorization: [{
        actor: sidechain_provider,
        permission: 'active',
      }],
      data: response.payload,
    });


    try {
      let tx = await eosSideChain.transact({
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
      const authentication = model.api[apiName].authentication;
      let authClient;
      if (authentication && authentication.type === 'payer') {
        var apiID = `${paccount}-${serviceName}`;
        var AuthClient = require('../../extensions/tools/auth-client');
        authClient = new AuthClient(apiID, authentication.contract);
      }


      apiCommands[apiName] = (async({ apiName, apiHandler, authClient }, opts, res) => {
        try {
          if (!apiHandler)
            throw new Error('not implemented yet');
          if (authClient) {
            logger.debug(`validating auth`);

            await authClient.validate({ ...opts.body, req: opts.req, allowClientSide: false }, async({ clientCode, payload, account, permission }) => {
              try {
                const body = JSON.parse(payload);
                if (permission !== authentication.permission) throw new Error(`wrong permissions (${authentication.permission} != ${permission})`);

                const result = await apiHandler(body, state, model, { account, permission, clientCode });
                res.send(JSON.stringify(result));
              }
              catch (e) {
                logger.error(`${e.toString()}`);
                res.status(400);
                res.send(JSON.stringify({ error: e.toString() }));
              }

            });
            return;
          }
          const result = await apiHandler(opts.body, res, model, state);
          res.send(JSON.stringify(result));
        }
        catch (e) {
          logger.error(`${e.toString()}`);
          res.status(400);
          res.send(JSON.stringify({ error: e.toString() }));
        }
      }).bind(handlers, { apiName, apiHandler, authClient });
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
        throw e;
      }
    }).bind(handlers, { requestName, dspRequestHandler });
  }
  return nodeFactory(serviceName, handlers);
}

module.exports = { nodeAutoFactory, nodeFactory, respond };
