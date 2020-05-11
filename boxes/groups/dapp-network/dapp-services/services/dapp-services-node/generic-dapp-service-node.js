#!/usr/bin/env node
if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }
const path = require('path');
const fs = require('fs');
const { requireBox, getBoxesDir } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const logger = requireBox('log-extensions/helpers/logger');
const { dappServicesContract, getContractAccountFor } = requireBox('dapp-services/tools/eos/dapp-services');
const { deserialize, generateABI, genNode, paccount, forwardEvent, resolveProviderData, resolveProvider, getProviders, resolveProviderPackage, paccountPermission, emitUsage, detectXCallback, getTableRowsSec, getLinkedAccount, parseEvents, pushTransaction, getEosForSidechain, eosMainnet } = require('./common');

var sidechainsDict = {};

const actionHandlers = {
  'service_request': async (act, simulated, serviceName, handlers) => {
    let isReplay = act.replay;
    let { service, payer, provider, action, data, broadcasted, sidechain, meta } = act.event;

    if (!sidechain && meta && meta.sidechain) {
      sidechain = sidechainsDict[meta.sidechain.name];
    }
    logger.info(`service_request ${provider} ${service} ${payer} ${sidechain ? sidechain.name : ""}`)
    var handler = handlers[action];
    var models = await loadModels('dapp-services');
    var serviceContractForLookup = service;
    var thisService = models.find(m => m.name == serviceName).contract;
    if (sidechain) {
      serviceContractForLookup = await getLinkedAccount(null, null, service, sidechain.name, true);
    }
    var model = models.find(m => m.contract == serviceContractForLookup);
    if (sidechain) {
      // get sidechain contract if sidechain exists
      service = await getContractAccountFor(model, sidechain);
      thisService = await getContractAccountFor(models.find(m => m.name == serviceName), sidechain);
    }
    if (isReplay && provider == '') {
      provider = paccount;
      if (!(getContractAccountFor(model, sidechain) == service && handler)) { return; }
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
      let providers = await resolveProviderPackage(payer, service, false, sidechain, true);
      logger.debug(`providers: ${JSON.stringify(providers)}`)
      const dspResponses = await Promise.all(providers.map(async (prov) => {
        // could return just promise if no need to log
        const eventRes = await forwardEvent(act, prov.data.endpoint, false);
        return eventRes;
      }));
      // maybe check for consistency?
      return dspResponses[0] || 'retry';
    }
    provider = await resolveProvider(payer, service, provider, sidechain);
    var packageid = isReplay ? 'replaypackage' : await resolveProviderPackage(payer, service, provider, sidechain);
    if (provider !== paccount || service !== thisService) {
      if (service !== thisService)
        logger.warn("WARNING - Service Mixup: %s requested inside %s, forwarding event.", service, thisService);
      var providerData = await resolveProviderData(service, provider, packageid, sidechain);
      if (!providerData) { return; }
      return await forwardEvent(act, providerData.endpoint, act.exception);
    }
    if (!simulated) {
      if (!(getContractAccountFor(model, sidechain) == service && handler)) { return; }
      const res = await handleRequest(handler, act, packageid, model.name, handlers.abi);
      return res;
    }
    if (!act.exception) { return; }
    if (getContractAccountFor(model, sidechain) == service && handler) {
      const res = await handleRequest(handler, act, packageid, model.name, handlers.abi);
      if (res) {
        return res;
      } else {
        logger.warn(`retry after handle ${action}`);
        return 'retry';
      }
    }
  },
  'service_signal': async (act, simulated, serviceName, handlers) => {
    if (simulated) { return; }
    let { action, data } = act.event;
    let { sidechain, meta } = act.event;

    if (!sidechain && meta && meta.sidechain) {
      sidechain = sidechainsDict[meta.sidechain.name];
    }
    var typeName = `sig_${action}`;
    var handler = handlers[typeName];
    var sigData = deserialize(handlers.abi, data, typeName);

    // todo: verify sig and usage for each xaction
    if (!handler && !sigData) {
      // console.log('unhandled signal', act);
      return;
    }
    logger.debug(`service_signal handler`)
    await handler(sigData);
  },
  'usage_report': async (act, simulated, serviceName, handlers) => {
    if (simulated) { return; }
    var handler = handlers[`_usage`];
    let { sidechain, meta } = act.event;
    if (!sidechain && meta && meta.sidechain) {
      sidechain = sidechainsDict[meta.sidechain.name];
    }
    // todo: handle quota and verify sig and usage for each xaction
    if (handler) {
      logger.debug(`usage_report handler`)
      await handler(act.event);
    }
    else {
      // console.log('unhandled usage_report', act.event);
    }
  }
};

let enableXCallback = null;

const extractUsageQuantity = async (e) => {
  const details = e.json.error.details;
  const jsons = details[details.length - 1].message.split(': ', 2)[1].split('\n').filter(a => a.trim() != '');
  if (!jsons.length) {
    throw new Error('usage event not found');
  }
  const events = (await parseEvents(jsons.join('\n'))).filter(e => e.etype === 'usage_report');

  if (!events.length) {
    logger.warn(`is verbose-http-errors = true enabled in the nodeos config.ini?`);
    throw new Error('usage event not found');
  }
  var usage_report_event = events[0];
  return { usageQuantity: usage_report_event.quantity, service: usage_report_event.service, provider: usage_report_event.provider, payer: usage_report_event.payer };
}

const handleRequest = async (handler, act, packageid, serviceName, abi) => {
  let { sidechain, event } = act;
  let { service, payer, provider, action, data } = event;
  const metadata = act.event.meta;
  data = deserialize(abi, data, action);
  if (!data) { return; }
  if (!sidechain && metadata && metadata.sidechain) {
    const models = await loadModels('eosio-chains');
    sidechain = models.find(m => m.name == metadata.sidechain.name);
  }
  let sidechain_provider_on_mainnet = paccount;
  act.event.current_provider = paccount;
  act.event.packageid = packageid;
  const eosMain = await eosMainnet();
  let eosSideChain = eosMain;
  if (sidechain) {
    const models = await loadModels('liquidx-mappings');
    let mapEntry;
    models.forEach(m => {
      if (m.sidechain_name === sidechain.name && m.mainnet_account === paccount) {
        mapEntry = m;
      }
    })
    if (!mapEntry) {
      throw new Error('mapping not found')
    }

    sidechain_provider_on_mainnet = mapEntry.chain_account;
    act.event.current_provider = sidechain_provider_on_mainnet;
    eosSideChain = await getEosForSidechain(sidechain, sidechain_provider_on_mainnet);
  }
  const account = act.account || payer;
  // for provisioning
  var requestId = "";
  var meta = {};
  if (metadata) {
    // is async
    requestId = `${metadata.txId}.${act.event.action}.${account}.${metadata.eventNum}`;
    if (metadata.sidechain)
      requestId = `${metadata.sidechain.name}.${requestId}`;
  }

  let responses = await handler(act, data);
  if (!responses) { return; }
  if (!Array.isArray(responses)) // needs conversion from a normal object
    responses = respond(act.event, packageid, responses);

  let mainnet_account = account;
  let service_on_mainnet = service;
  let dappServicesSisterContract = dappServicesContract;
  if (sidechain) {
    logger.info(`getting mappings for ${sidechain.name} ${dappServicesSisterContract} ${service} ${account} ${sidechain_provider_on_mainnet} ${dappServicesContract} ${payer}`);
    mainnet_account = await getLinkedAccount(eosSideChain, eosMain, account, sidechain.name);
    service_on_mainnet = await getLinkedAccount(eosSideChain, eosMain, service, sidechain.name, true);
    dappServicesSisterContract = await getLinkedAccount(eosSideChain, eosMain, 'dappservices', sidechain.name);
  }

  try {
    await Promise.all(responses.map(async (response) => {
      if (enableXCallback === null) {
        enableXCallback = await detectXCallback(eosSideChain, dappServicesSisterContract);
      }
      if (enableXCallback) {
        let e = await pushTransaction(
          eosSideChain,
          dappServicesSisterContract,
          payer,
          sidechain_provider_on_mainnet,
          response.action,
          response.payload,
          requestId,
          meta,
          true
        );
        const details = e.json.error.details;
        // update to 'abort' in contract and here, or something generic
        // returns at location 0, but may need to find dynamically if message is not at position 0
        if (details[0].message.includes('abort_service_request')) {
          logger.info(`abort_service_request`);
          let abortError = new Error(`abort_service_request`);
          abortError.details = details;
          throw abortError;
        }

        logger.info("CONFIRMING USAGE:\n%j", e);

        // verify transaction emits usage
        const usage_report = await extractUsageQuantity(e);
        if (usage_report.service !== service) {
          logger.warn(`wrong service ${usage_report.service} ${service}`);
        }
        if (usage_report.provider !== act.event.current_provider) {
          logger.warn(`wrong provider ${usage_report.provider} ${act.event.current_provider}`);
        }
        if (usage_report.payer !== payer) {
          logger.warn(`wrong payer ${usage_report.payer} ${payer}`);
        }
        if (sidechain)
          await emitUsage(mainnet_account, service_on_mainnet, usage_report.usageQuantity, meta, requestId); // verify quota on provisioning chain    
      }

      try {
        let tx = await pushTransaction(
          eosSideChain,
          dappServicesSisterContract,
          payer,
          sidechain_provider_on_mainnet,
          response.action,
          response.payload,
          requestId,
          meta,
          false
        );
        logger.debug("REQUEST\n%j\nRESPONSE: [%s]\n%j", act, tx.transaction_id, response);
      } catch (e) {
        if (e.json)
          e.error = e.json.error;
        logger.warn("REQUEST\n%j\nRESPONSE: [FAILED]\n%j", act, e);
        if (e.toString().indexOf('duplicate') == -1) {
          throw e;
        }
      }
      // dispatch on chain response - call response.action with params with paccount permissions
    }));
  } catch (e) {
    logger.error(e);
    if (e.message.includes("abort_service_request")) {
      return { message: e.message, shouldAbort: true, details: e.details };
    }
    throw e;
  }
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

const loadIfExists = async (serviceName, suffix) => {
  const reqPath = path.resolve(`${getBoxesDir()}${serviceName}-dapp-service/services/${serviceName}-dapp-service-node/${suffix}`)
  if (fs.existsSync(reqPath + ".js"))
    return require(reqPath)
}

const nodeFactory = async (serviceName, handlers) => {
  var models = await loadModels('dapp-services');
  var model = models.find(m => m.name == serviceName);
  logger.info(`nodeFactory starting ${serviceName}`);
  var sidechains = await loadModels('eosio-chains');
  for (var i = 0; i < sidechains.length; i++) {
    var sidechain = sidechains[i];
    sidechainsDict[sidechain.name] = sidechain;
  }
  return genNode(actionHandlers, process.env.SVC_PORT || model.port, serviceName, handlers, await generateABI(model));
};

const nodeAutoFactory = async (serviceName) => {
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
      let authClient, AuthClientSetup;
      if (authentication && authentication.type === 'payer') {
        AuthClientSetup = requireBox('auth-dapp-service/tools/auth-client');
        var apiID = `${paccount}-${serviceName}`;
        authClient = new AuthClientSetup(apiID, authentication.contract);
      }

      apiCommands[apiName] = (async ({ apiName, apiHandler, authClient }, opts, res) => {
        const sidechain = opts.body.sidechain;
        if (authentication && authentication.type === 'payer') {
          var apiID = `${paccount}-${serviceName}`;
          authClient = new AuthClientSetup(apiID, authentication.contract, null, null, sidechain);
        }
        try {
          if (!apiHandler)
            throw new Error('not implemented yet');
          if (authClient) {
            logger.info(`validating auth`);
            await authClient.validate({ ...opts.body, req: opts.req, allowClientSide: false }, async ({ clientCode, payload, account, permission }) => {
              try {
                let body = JSON.parse(payload);
                body = {
                  ...body,
                  sidechain
                }
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
    handlers[requestName] = (async ({ requestName, dspRequestHandler }, opts, req) => {
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
