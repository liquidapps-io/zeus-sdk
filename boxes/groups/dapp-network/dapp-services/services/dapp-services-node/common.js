const paccount = process.env.DSP_ACCOUNT || process.env.PROOF_PROVIDER_ACCOUNT || 'pprovider1';
const paccountPermission = process.env.DSP_ACCOUNT_PERMISSIONS || 'active';
const fetch = require('node-fetch');
const { requireBox } = require('@liquidapps/box-utils');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { dappServicesContract, dappServicesLiquidXContract, getContractAccountFor } = requireBox('dapp-services/tools/eos/dapp-services');

const { loadModels } = requireBox('seed-models/tools/models');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const httpProxy = require('http-proxy');
const { BigNumber } = require('bignumber.js');
const logger = requireBox('log-extensions/helpers/logger');
const eosjs2 = require('eosjs');
const { Serialize } = eosjs2;
const { TextDecoder, TextEncoder } = require('text-encoding');
const { Long } = require('bytebuffer')
const mainnetDspKey = process.env.DSP_PRIVATE_KEY;
if (!mainnetDspKey) console.warn('must provide DSP_PRIVATE_KEY if not using utils');
const nodeosMainnetEndpoint = process.env.NODEOS_MAINNET_ENDPOINT || 'http://localhost:8888';
const dspGatewayMainnetEndpoint = process.env.DSP_GATEWAY_MAINNET_ENDPOINT || 'http://localhost:13015';
const nodeosLatest = process.env.NODEOS_LATEST || true;

//dfuse settings
const mainnetDfuseEnable = process.env.DFUSE_PUSH_ENABLE || false;
const mainnetDfuseGuarantee = process.env.DFUSE_PUSH_GUARANTEE || 'in-block';
const mainnetDfuseApiKey = process.env.DFUSE_API_KEY || '';
const mainnetDfuseNetwork = process.env.DFUSE_NETWORK || 'mainnet';

const WebSocketClient = require("ws");
const { createDfuseClient } = require("@dfuse/client");


async function webSocketFactory(url, protocols) {
  const webSocket = new WebSocketClient(url, protocols, {
    handshakeTimeout: 30 * 1000, // 30s
    maxPayload: 200 * 1024 * 1000 * 1000 // 200Mb
  })
  const onUpgrade = (response) => {
    logger.debug(`Socket upgrade response status code. ${response.statusCode}`)

    // You need to remove the listener at some point since this factory
    // is called at each reconnection with the remote endpoint!
    webSocket.removeListener("upgrade", onUpgrade)
  }
  webSocket.on("upgrade", onUpgrade)
  return webSocket
}

const client = mainnetDfuseApiKey ? createDfuseClient({ apiKey: mainnetDfuseApiKey, network: mainnetDfuseNetwork,
  httpClientOptions: {
    fetch
  },
  graphqlStreamClientOptions: {
    socketOptions: {
      // The WebSocket factory used for GraphQL stream must use this special protocols set
      // We intend on making the library handle this for you automatically in the future,
      // for now, it's required otherwise, the GraphQL will not connect correctly.
      webSocketFactory: (url) => webSocketFactory(url, ["graphql-ws"]),
      reconnectDelayInMs: 250 // document every 5s
    }
  },
  streamClientOptions: {
    socketOptions: {
      // webSocketFactory: (url) => webSocketFactory(url)
      webSocketFactory: (url) => webSocketFactory(url)
    }
  }
}) : '';

const proxy = httpProxy.createProxyServer();
proxy.on('error', function (err, req, res) {
  if (err) {
    logger.error('proxy error:');
    logger.error(err);
  }
  if (!res) { return; }
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });

  res.end('DSP Proxy error.');
});
const charmap = '.12345abcdefghijklmnopqrstuvwxyz'
const charidx = ch => {
  const idx = charmap.indexOf(ch)
  if (idx === -1)
    throw new TypeError(`Invalid character: '${ch}'`)

  return idx
}

function encodeName(name, littleEndian = true) {
  if (typeof name !== 'string')
    throw new TypeError('name parameter is a required string')

  if (name.length > 12)
    throw new TypeError('A name can be up to 12 characters long')

  let bitstr = ''
  for (let i = 0; i <= 12; i++) { // process all 64 bits (even if name is short)
    const c = i < name.length ? charidx(name[i]) : 0
    const bitlen = i < 12 ? 5 : 4
    let bits = Number(c).toString(2)
    if (bits.length > bitlen) {
      throw new TypeError('Invalid name ' + name)
    }
    bits = '0'.repeat(bitlen - bits.length) + bits
    bitstr += bits
  }
  const value = Long.fromString(bitstr, true, 2)
  // convert to LITTLE_ENDIAN
  let leHex = ''
  const bytes = littleEndian ? value.toBytesLE() : value.toBytesBE()
  for (const b of bytes) {
    const n = Number(b).toString(16)
    leHex += (n.length === 1 ? '0' : '') + n
  }
  const ulName = Long.fromString(leHex, true, 16).toString()
  return ulName.toString()
}

function ULong(value, unsigned = true, radix = 10) {
  if (typeof value === 'number') {
    // Some JSON libs use numbers for values under 53 bits or strings for larger.
    // Accomidate but double-check it..
    if (value > Number.MAX_SAFE_INTEGER)
      throw new TypeError('value parameter overflow')

    value = Long.fromString(String(value), unsigned, radix)
  }
  else if (typeof value === 'string') {
    value = Long.fromString(value, unsigned, radix)
  }
  else if (!Long.isLong(value)) {
    throw new TypeError('value parameter is a requied Long, Number or String')
  }
  return value
}

function decodeName(value, littleEndian = true) {
  value = ULong(value)

  // convert from LITTLE_ENDIAN
  let beHex = ''
  const bytes = littleEndian ? value.toBytesLE() : value.toBytesBE()
  for (const b of bytes) {
    const n = Number(b).toString(16)
    beHex += (n.length === 1 ? '0' : '') + n
  }
  beHex += '0'.repeat(16 - beHex.length)

  const fiveBits = Long.fromNumber(0x1f, true)
  const fourBits = Long.fromNumber(0x0f, true)
  const beValue = Long.fromString(beHex, true, 16)

  let str = ''
  let tmp = beValue

  for (let i = 0; i <= 12; i++) {
    const c = charmap[tmp.and(i === 0 ? fourBits : fiveBits)]
    str = c + str
    tmp = tmp.shiftRight(i === 0 ? 4 : 5)
  }
  str = str.replace(/\.+$/, '') // remove trailing dots (all of them)
  return str
}

const eosMainnet = async () => {
  const mainnetConfig = {
    httpEndpoint: nodeosMainnetEndpoint,
    keyProvider: mainnetDspKey,
    dfuseEnable: mainnetDfuseEnable,
    dfuseGuarantee: mainnetDfuseGuarantee,
    dfusePushApiKey: mainnetDfuseApiKey ? await getDfuseJwt() : '',
    dfuseNetwork: mainnetDfuseNetwork
  }
  return getEosWrapper(mainnetConfig);
}

const eosDSPGateway = async () => {
  let config = {
    httpEndpoint: dspGatewayMainnetEndpoint,
    keyProvider: mainnetDspKey
  }
  return getEosWrapper(config);
}

var eosDSPEndpoint = getEosWrapper({
  httpEndpoint: dspGatewayMainnetEndpoint
});

const getEosForSidechain = async (sidechain, account = paccount, dspEndpoint = null) => {
  let config = {
    httpEndpoint: dspEndpoint ? `http://localhost:${sidechain.dsp_port}` : sidechain.nodeos_endpoint, //TODO: do we need to check for https?
    keyProvider: process.env[`DSP_PRIVATE_KEY_${sidechain.name.toUpperCase()}`] || (await getCreateKeys(account, null, nodeosLatest.toString() === "true" ? true : false, sidechain)).active.privateKey //TODO: any reason not to include authorization here?
  }
  if(!dspEndpoint) {
    config = {
      ...config,
      dfuseEnable: [`DFUSE_PUSH_ENABLE_${sidechain.name.toUpperCase()}`],
      dfuseGuarantee: [`DFUSE_PUSH_GUARANTEE_${sidechain.name.toUpperCase()}`] || 'in-block',
      dfusePushApiKey: mainnetDfuseApiKey ? await getDfuseJwt() : '',
      dfuseNetwork: [`DFUSE_NETWORK_${sidechain.name.toUpperCase()}`]
    }
  }
  return getEosWrapper(config);
}

const getDfuseJwt = async () => {
  const jwtApiKey = await client.getTokenInfo();
  return jwtApiKey.token
}

const forwardEvent = async (act, endpoint, redirect) => {
  if (redirect) { return endpoint; }
  const r = await fetch(endpoint + '/event', { method: 'POST', body: JSON.stringify(act) });
  const rtxt = await r.text();
  return rtxt;
};

const resolveBackendServiceData = async (service, provider, packageid, sidechain, balance) => {
  if (balance !== undefined) {
    const eos = await eosMainnet();
    const packages = await getTableRowsSec(eos.rpc, dappServicesContract, "package", dappServicesContract, [null, packageid, service, provider], 1, 'sha256', 2);
    const result = packages.filter(a => (a.provider === provider || !provider) && a.package_id === packageid && a.service === service);
    if (result.length === 0) throw new Error(`resolveBackendServiceData failed ${provider} ${service} ${packageid}`);
    if (Number(balance.substring(0, balance.length - 5)) < Number(result[0].min_stake_quantity.substring(0, result[0].min_stake_quantity.length - 5)))
      logger.warn(`DAPP Balance is less than minimum stake quantity for provider: ${provider}, service: ${service}, packageid: ${packageid}: ${Number(result[0].min_stake_quantity.substring(0, result[0].min_stake_quantity.length - 5)) - Number(balance.substring(0, balance.length - 5))} more DAPP must be staked to meet threshold`);
  }
  // read from local service models
  var loadedExtensions = await loadModels('dapp-services');
  var loadedExtension = loadedExtensions.find(a => getContractAccountFor(a) == service);
  if (!loadedExtension) return null;
  var host = process.env[`DAPPSERVICE_HOST_${loadedExtension.name.toUpperCase()}`];
  var port = process.env[`DAPPSERVICE_PORT_${loadedExtension.name.toUpperCase()}`];
  if (!host) host = 'localhost';
  if (!port) port = loadedExtension.port;
  return {
    internal: true,
    endpoint: `http://${host}:${port}`
  };
};

const resolveExternalProviderData = async (service, provider, packageid, sidechain, balance) => {
  const eos = await eosMainnet();
  const packages = await getTableRowsSec(eos.rpc, dappServicesContract, "package", dappServicesContract, [null, packageid, service, provider], 1, 'sha256', 2);
  logger.debug(`resolveExternalProviderData packages: ${JSON.stringify(packages)}`);
  const result = packages.filter(a => (a.provider === provider || !provider) && a.package_id === packageid && a.service === service);
  if (result.length === 0) throw new Error(`resolveExternalProviderData failed ${provider} ${service} ${packageid}`);
  if (!result[0].enabled) throw new Error(`Provider: ${provider} Service: ${service} Package ${packageid}: Packages must be enabled for DSP services to function. The enablepkg command must be run by the DSP to enable this package.`);
  if (balance !== undefined)
    if (Number(balance.substring(0, balance.length - 5)) < Number(result[0].min_stake_quantity.substring(0, result[0].min_stake_quantity.length - 5)))
      logger.warn(`DAPP Balance is less than minimum stake quantity for provider: ${provider}, service: ${service}, packageid: ${packageid}: ${Number(result[0].min_stake_quantity.substring(0, result[0].min_stake_quantity.length - 5)) - Number(balance.substring(0, balance.length - 5))} more DAPP must be staked to meet threshold`);
  return {
    internal: false,
    endpoint: result[0].api_endpoint
  };
};

const resolveProviderData = async (service, provider, packageid, sidechain, balance) =>
  ((paccount === provider) ? resolveBackendServiceData : resolveExternalProviderData)(service, provider, packageid, sidechain, balance);

const toBound = (numStr, bytes) =>
  `${(new Array(bytes * 2 + 1).join('0') + numStr).substring(numStr.length).toUpperCase()}`;

const getTableRowsSec = async (rpc, code, table, scope, keys, limit = 1, key_type, index_position) => {
  if (!key_type) {
    switch (keys.length) {
      case 0:
      case 1:
        key_type = 'i64'
        break;
      case 2:
        key_type = 'i128'
        break;
      case 4:
        key_type = 'sha256'
        break;
      default:
        throw new Error('unknown key length');
      // code
    };
  }
  if (index_position === undefined)
    index_position = key_type == 'i64' ? 1 : 2;
  const payload = {
    'json': true,
    'scope': scope,
    'code': code,
    'table': table,
    'key_type': key_type,
    'index_position': index_position,
    'limit': limit
  };
  let encodedKeys, hexKeys;
  if (nodeosLatest.toString() === "true") {
    hexKeys = keys.map(v => (v !== null) ? v : 0).map(v => typeof (v) === 'string' ? encodeName(v) : v).map(v => toBound(new BigNumber(v).toString(16), 8));
    encodedKeys = hexKeys;
  } else {
    encodedKeys = keys.map(v => (v !== null) ? v : 0).map(v => typeof (v) === 'string' ? encodeName(v, true) : v).map(v => new BigNumber(v)).map(v => toBound(v.toString(16), 8));
  }
  switch (key_type) {
    case 'sha256':
      if (nodeosLatest.toString() === "true" && hexKeys) {
        encodedKeys = hexKeys.map(k => k.match(/.{2}/g).reverse().join(''));
        payload.lower_bound = encodedKeys[0] + encodedKeys[1] + encodedKeys[2] + encodedKeys[3];
      } else {
        payload.lower_bound = encodedKey[1] + encodedKey[0] + encodedKey[3] + encodedKey[2];
      }
      // for sha256/i128 where the keys are name we split them pairwise and reverse
      // this is how eosio internally encodes name values..
      payload.encode_type = 'hex';
      // in code:           0ULL, package_id.value, service.value, provider.value
      break;
    case 'i128':
      if (nodeosLatest.toString() === "true" && hexKeys) {
        encodedKeys = hexKeys.map(k => k.match(/.{2}/g).reverse().join(''));
        payload.encode_type = 'hex';
        payload.lower_bound = "0x" + encodedKeys[0] + encodedKeys[1];
      } else {
        payload.encode_type = 'dec';
        payload.lower_bound = "0x" + encodedKey[1] + encodedKey[0];
      }
      break;
    case 'i64':
      if (encodedKeys.length) {
        payload.lower_bound = "0x" + encodedKeys[0];
        payload.encode_type = 'dec';
      }
      break;
    default:
    // code
  }
  if (nodeosLatest.toString() === "true") {
    let finalRes = [];
    let result = await rpc.get_table_rows(payload);
    finalRes = result.rows;
    while (finalRes.length < limit && result.more) {
      logger.debug(`got ${finalRes.length} responses, theres more`);
      payload.lower_bound = result.next_key;
      payload.limit = limit - finalRes.length;
      result = await rpc.get_table_rows(payload);
      finalRes = [...finalRes, ...result.rows];
    }
    return finalRes;
  } else {
    const result = await rpc.get_table_rows(payload);
    const rowsResult = result.rows;
    return rowsResult;
  }
};

const getProviders = async (payer, service, provider, sidechain) => {
  if (sidechain) {
    const sidechainName = sidechain.name;
    service = await getLinkedAccount(null, null, service, sidechainName, true);

    payer = await getLinkedAccount(null, null, payer, sidechainName);
  }
  const eos = await eosMainnet();
  const serviceWithStakingResult = await getTableRowsSec(eos.rpc, dappServicesContract, "accountext", "DAPP", [payer, service], 50, 'i128', 3);

  const result = serviceWithStakingResult.filter(a => (a.provider === provider || !provider) && a.account === payer && a.service === service);
  if (result.length === 0) { throw new Error(`getProviders failed - no stakes for payer - ${payer} ${provider} ${service} ${!sidechain ? 'mainnet' : sidechain.name}`); }
  return result;
};

const resolveProviderPackage = async (payer, service, provider, sidechain, getEvery = false) => {
  logger.debug('resolving provider package');
  logger.debug(JSON.stringify({ payer, service, provider, sidechain, getEvery }));
  let providers = [];
  const serviceWithStakingResult = await getProviders(payer, service, provider, sidechain);
  logger.debug(`got svc with staking results - ${JSON.stringify(serviceWithStakingResult)}`)
  //we must iterate over staked packages and ensure they are enabled
  if (sidechain) {
    const sidechainName = sidechain.name;
    service = await getLinkedAccount(null, null, service, sidechainName, true);
  }
  let selectedPackage = null;
  for (let i = 0; i < serviceWithStakingResult.length; i++) {
    let checkProvider = serviceWithStakingResult[i];
    let checkPackage = checkProvider.package ? checkProvider.package : checkProvider.pending_package;
    let checkBalance = checkProvider.balance;
    try {
      let providerData = await resolveProviderData(service, checkProvider.provider, checkPackage, sidechain, checkBalance);
      providers.push({
        provider: checkProvider.provider,
        package: checkPackage,
        data: providerData
      })
      selectedPackage = checkPackage;
      if (!getEvery) break;
    }
    catch (e) {
      logger.error(`Provider ${checkProvider.provider} package ${checkPackage} does not exist or is disabled`);
      logger.error(e);
    }
  }
  if (!selectedPackage) { throw new Error(`resolveProviderPackage failed - no enabled packages - ${provider} ${service}`); }
  if (getEvery) return providers;
  return selectedPackage;
};

const resolveProvider = async (payer, service, provider, sidechain) => {
  if (provider != '') { return provider; }
  const serviceWithStakingResult = await getProviders(payer, service, provider, sidechain);

  // prefer self
  const intersectLists = serviceWithStakingResult.filter(accountProvider => accountProvider.model !== '').map(a => a.provider);
  if (intersectLists.indexOf(paccount) !== -1) { return paccount; }

  return intersectLists[Math.floor(Math.random() * intersectLists.length)];
};

const processFn = async (actionHandlers, actionObject, simulated, serviceName, handlers) => {
  var actionHandler = actionHandlers[actionObject.event.etype];
  if (!actionHandler) { return; }
  try {
    return await actionHandler(actionObject, simulated, serviceName, handlers);
  }
  catch (e) {
    logger.error('error processing processFn')
    logger.error(e);
    throw e;
  }
};

async function parsedAction(actionHandlers, account, method, code, actData, events, simulated, serviceName, handlers) {
  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var actionObject = {
      receiver: account,
      method,
      account: code,
      data: actData,
      event
    };
    await processFn(actionHandlers, actionObject, simulated, serviceName, handlers);
  }
}

async function parseEvents(text) {
  return text.split('\n').map(a => {
    if (a === '') { return null; }
    try {
      return JSON.parse(a);
    }
    catch (e) { }
  }).filter(a => a);
}

const handleAction = async (actionHandlers, action, simulated, serviceName, handlers) => {
  var res = [];

  var events = await parseEvents(action.console);
  await parsedAction(actionHandlers, action.receiver, action.act.name, action.act.account, action.act.data, events, simulated, serviceName, handlers);
  res = [...res, ...events];
  if (action.inline_traces)
    for (var i = 0; i < action.inline_traces.length; i++) {
      var subevents = await handleAction(actionHandlers, action.inline_traces[i], simulated, serviceName, handlers);
      res = [...res, ...subevents];
    }
  return res;
};

const rollBack = async (garbage, actionHandlers, serviceName, handlers) => {
  return await Promise.all(garbage.map(async rollbackAction => {
    try {
      return processFn(actionHandlers, rollbackAction, true, serviceName, handlers);
    }
    catch (e) { }
  }));
};
const notFound = (res, message = 'bad endpoint') => {
  res.status(404);
  res.send(JSON.stringify({
    code: 404,
    error: {
      details: [{ message }]
    }
  }));
};
const getRawBody = require('raw-body');
const sendError = (res, e) => {
  res.status(500);
  res.send(JSON.stringify({
    code: 500,
    error: {
      details: [{ message: e.toString() }]
    }
  }));
}

const dfuseEndpoints = {
  'mainnet': 'https://mainnet.eos.dfuse.io',
  'testnet': 'https://testnet.eos.dfuse.io',
  'kylin': 'https://kylin.eos.dfuse.io',
  'worbli': 'https://worbli.eos.dfuse.io',
  'wax': 'https://mainnet.wax.dfuse.io'
}
const testTransaction = async(sidechain, uri, body) => {
  const key = mainnetDfuseApiKey ? await getDfuseJwt() : '';
  let result;
  const network = sidechain ? [`DFUSE_NETWORK_${sidechain.name.toUpperCase()}`] : mainnetDfuseNetwork 
  const currentNodeosEndpoint = sidechain ? sidechain.nodeos_endpoint : nodeosMainnetEndpoint;
  const pushEnable = sidechain ? [`DFUSE_PUSH_ENABLE_${sidechain.name.toUpperCase()}`] : mainnetDfuseEnable
  if(pushEnable.toString() === "true") {
    logger.debug(`Pushing to dFuse ${dfuseEndpoints[network]} with Guarantee ${mainnetDfuseGuarantee}`)
    result = await fetch(dfuseEndpoints[network] + uri, { 
      method: 'POST', 
      body: JSON.stringify(body),
      headers: {
        'Authorization': `Bearer ${key}`,
        'X-Eos-Push-Guarantee': `${mainnetDfuseGuarantee}`
      }
    });
    logger.debug(`result: ${typeof(result) == "object" ? JSON.stringify(result) : result}`)
  } else {
    result = await fetch(currentNodeosEndpoint + uri, { method: 'POST', body: JSON.stringify(body) });
    logger.debug(`result: ${typeof(result) == "object" ? JSON.stringify(result) : result}`)
  }  
  return result;
}

const loggerHelper = (element) => {
  if(typeof(element) == "object") {
    return JSON.stringify(element)
  } else {
    return element
  }
}

const processRequestWithBody = async (req, res, body, actionHandlers, serviceName, handlers) => {
  var uri = req.originalUrl;
  var sidechain = body.sidechain;
  var isServiceRequest = uri.indexOf('/event') == 0;
  var isServiceAPIRequest = uri.indexOf('/v1/dsp/') == 0;
  var uriParts = uri.split('/');
  if (isServiceRequest) {
    try {

      const ret = await processFn(actionHandlers, body, false, serviceName, handlers);
      const retTxt = typeof (ret) === "object" ? JSON.stringify(ret) : ret;
      res.send(retTxt);
    }
    catch (e) {
      sendError(res, e);
    }
    return;
  }
  if (isServiceAPIRequest) {
    // invoke api
    var api = handlers.api;
    if (!api) { return notFound(res); }

    var methodName = uriParts[4];
    var method = api[methodName];
    if (!method) { return notFound(res, `method not found ${methodName}`); }

    req.body = body;
    try {
      await method(req, res);
    }
    catch (e) {
      sendError(res, e);
    }
    return;
  }

  let trys = 0;
  const garbage = []; 
  while (trys < 10) {    
    let r = await testTransaction(sidechain, uri, body);
    let resText = await r.text();
    let rText;
    if (r.status !== 500) {
      res.status(r.status);
      return res.send(resText);
    }
    try {
      let detailsAssertionSvcReq;
      rText = JSON.parse(resText);
      const detailMsg = rText.error.details;
      const detailsAssertion = detailMsg.find(d => d.message.indexOf(': required service') != -1);
      if(detailsAssertion) {
        detailsAssertionSvcReq = detailMsg.find(d => d.message.indexOf(': required service') != -1).message.replace('assertion failure with message: required service','') 
      } else {
        detailsAssertionSvcReq = '';
      }
      const detailsPendingConsole = detailMsg.find(d => d.message.indexOf('pending console output:') != -1).message.replace('pending console output: ', '');
      let jsons;
      if (!detailsAssertion || (!detailsPendingConsole && !detailsAssertionSvcReq)) {
        if(mainnetDfuseEnable.toString() == "true") logger.warn('unable to parse service request using dfuse push guarantee, must update consumer contract to use new dappservices contract');
        await rollBack(garbage, actionHandlers, serviceName, handlers);
        res.status(r.status);
        return res.send(resText);
      } else if(mainnetDfuseEnable.toString() == "true") {
        jsons = detailsAssertion.message.replace('required service: ','').split(': ', 2)[1].split(`'`).join(`"`).split('\n').filter(a => a.trim() != '');
      } else {
        jsons = detailsPendingConsole.split('\n').filter(a => a.trim() != '');
      }
      logger.debug(loggerHelper(jsons));
      
      let currentEvent;
      for (var i = 0; i < jsons.length; i++) {
        try {
          currentEvent = JSON.parse(jsons[i]);
        }
        catch (e) {
          continue;
        }
        currentEvent.sidechain = sidechain;
        const currentActionObject = {
          event: currentEvent,
          sidechain,
          exception: true
        };
        if (i < jsons.length - 1) await processFn(actionHandlers, currentActionObject, true, serviceName, handlers);
      }
      const event = currentEvent;
      if (!event) 
        throw new Error("unable to parse service request. is nodeos missing 'contracts-console = true'?");
      event.sidechain = sidechain;
      const actionObject = {
        event,
        sidechain,
        exception: true
      };

      const endpoint = await processFn(actionHandlers, actionObject, true, serviceName, handlers);
      logger.debug(`endpoint shouldAbort: ${endpoint} typeof: ${typeof (endpoint)}`);
      try {
        if (endpoint.includes(`shouldAbort`) && JSON.parse(endpoint).shouldAbort) {
          logger.debug(`shouldAbort detected`);
          return res.send(endpoint);
        }
      } catch (e) {
        logger.error(`error parsing endpoint.shouldAbort`);
        logger.error(e);
      }
      if (endpoint === 'retry') {
        garbage.push({ ...actionObject, rollback: true });
        logger.debug(`Service request done: ${trys++}`);
        continue;
      }

      if (endpoint) {
        r = await fetch(endpoint + uri, { method: 'POST', body: JSON.stringify(body) });
        resText = await r.text();
        rText = JSON.parse(resText);
      }
      if (r.status === 500) await rollBack(garbage, actionHandlers, serviceName, handlers);
      res.status(r.status);
      return res.send(resText);


    }
    catch (e) {
      await rollBack(garbage, actionHandlers, serviceName, handlers);
      logger.warn(`exception running push_transaction: ${e}`);
      res.status(500);
      res.send(JSON.stringify({
        code: 500,
        error: {
          details: [{ message: e.toString(), response: rText }]
        }
      }));
    }
    return null;
  }
  return notFound(res, `too many tries ${uri}`);
}
const pjson = require('../../../../package.json');
const genNode = async (actionHandlers, port, serviceName, handlers, abi, sidechain) => {
  if (handlers) handlers.abi = abi;
  const app = genApp();
  app.use(async (req, res, next) => {
    var uri = req.originalUrl;
    logger.debug("received request: %s\t[%s] - %s", uri, req.ip, sidechain ? sidechain.name : "main");

    var isServiceRequest = uri.indexOf('/event') === 0;
    var isServiceAPIRequest = uri.indexOf('/v1/dsp/') === 0;
    var isPushTransaction = uri.indexOf('/v1/chain/push_transaction') === 0 || uri.indexOf('/v1/chain/send_transaction') === 0;
    var uriParts = uri.split('/');
    if (uri === '/v1/dsp/version')
      return res.send(pjson.version); // send response to contain the version

    if (!isPushTransaction && !isServiceRequest && !isServiceAPIRequest) {
      return proxy.web(req, res, { target: sidechain ? sidechain.nodeos_endpoint : nodeosMainnetEndpoint });
    }

    if (isServiceAPIRequest && serviceName === 'services') {
      if (uriParts.length < 5) return notFound(res, 'bad endpoint format');
      const service = uriParts[3];
      const providerData = await resolveBackendServiceData(service, paccount, sidechain);
      if (!providerData) return notFound(res, 'service not found');
      // forward
      const options = {
        target: providerData.endpoint,
      };
      if (sidechain) {
        options.headers = {
          sidechain: sidechain.name
        }
      }
      return proxy.web(req, res, options);
    }

    getRawBody(req, {
      length: req.headers['content-length']
    }, async function (err, string) {
      if (err) return next(err);
      const body = JSON.parse(string.toString());

      let currentSidechain = sidechain;
      if (body.sidechain)
        currentSidechain = body.sidechain;
      if (req.headers['sidechain'] && serviceName !== 'services') {

        var sidechainName = req.headers['sidechain'];
        logger.info(`sidechain: ${sidechainName}`);
        const sidechains = await loadModels('eosio-chains');
        currentSidechain = sidechains.find(s => s.name == sidechainName);
      }
      body.sidechain = currentSidechain;
      return processRequestWithBody(req, res, body, actionHandlers, serviceName, handlers);

    });
  });
  app.listen(port, () => {
    console.log(`${serviceName} listening on port ${port}!`);
    logger.info(`${serviceName} listening on port ${port}!`);
  });
  return app;
};
const genApp = () => {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  return app;
};
const fullabi = (abi) => {
  return {
    'version': 'eosio::abi/1.0',
    'structs': abi
  };
};

const deserialize = (abi, data, atype, encoding = 'base64') => {
  if (!abi) { return; }

  var localTypes = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), fullabi(abi));
  var buf1 = Buffer.from(data, encoding);
  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
  });
  buffer.pushArray(Serialize.hexToUint8Array(buf1.toString('hex')));
  var theType = localTypes.get(atype);
  if (!theType) {
    return;
  }
  return theType.deserialize(buffer);
};

var typesDict = {
  'uint8_t': 'uint8',
  'uint16_t': 'uint16',
  'uint32_t': 'uint32',
  'uint64_t': 'uint64',
  'int8_t': 'int8',
  'int16_t': 'int16',
  'int32_t': 'int32',
  'int64_t': 'int64',
  'name': 'name',
  'eosio::name': 'name',
  'asset': 'asset',
  'eosio::asset': 'asset',
  'std::string': 'string',
  'std::vector<char>': 'bytes',
  'vector<vector<char>>': 'vector<bytes>',
  'vector<string>': 'string[]',
  'vector<std::string>': 'string[]',
  'std::vector<string>': 'string[]',
  'std::vector<std::string>': 'string[]',
  'vector<char>': 'bytes',
  'symbol_code': 'symbol_code',
  'checksum256': 'checksum256',
  'eosio::symbol_code': 'symbol_code',
  'uint8[][]': 'bytes[]'
};
const convertToAbiType = (aType) => {
  if (!typesDict[aType]) { throw new Error('unrecognized type', aType); }
  return typesDict[aType];
};
const generateCommandABI = (commandName, commandModel) => {
  return {
    'name': commandName,
    'base': '',
    'fields': Object.keys(commandModel.request).map(argName => {
      try {
        return {
          name: argName,
          type: convertToAbiType(commandModel.request[argName])
        };
      } catch (e) {
        throw new Error(`error converting to abi type ${commandModel.request[argName]}`)
      }
    })
  };
};

const generateABI =
  (serviceModel) =>
    Object.keys(serviceModel.commands).map(c => generateCommandABI(c, serviceModel.commands[c]));

const detectXCallback = async (eos, contractName) => {
  if (!contractName)
    contractName = dappServicesContract;
  var contract = await eos.contract(contractName);
  if (contract.xcallback)
    return true;
  else return false;
}
let enableXCallback = null;

// returns a mainnet linked account for a service contract or service payer, or a dappservicex contract on a sidechain
const getLinkedAccount = async (eosSideChain, eosMain, account, sidechainName, skipVerification) => {
  // TODO: add cache
  // get dappservices account link from mainnet
  // if no eosMainnet instance provided, fetch
  if (!eosMain) {
    eosMain = await eosMainnet();
  }
  // return dappservicex contract for given sidechainName, checking liquidx contract chainentry table with sidechain name as scope
  if (account === 'dappservices') {
    const payload = {
      'json': true,
      'scope': sidechainName,
      'code': dappServicesLiquidXContract,
      'table': 'chainentry',
      'limit': 1
    };
    const res = await eosMain.getTableRows(payload);
    if (!res.rows.length)
      throw new Error('chain not registered on provisioning chain');
    return res.rows[0].chain_meta.dappservices_contract;
  }
  // if no sidechain object provided, retrieve from /models/eosio-chains
  if (!eosSideChain) {
    var models = await loadModels('eosio-chains');
    const sidechain = models.find(m => m.name == sidechainName);
    eosSideChain = await getEosForSidechain(sidechain);
  }
  // returns dappservicex contract name on sister chain from chainentry table on liquidx contract on mainnet
  const dappServicesSisterContract = await getLinkedAccount(eosSideChain, eosMain, 'dappservices', sidechainName);
  // returns account link map from side chain's dappservicex given a side chain account name
  const mainnetAccountList = await getTableRowsSec(eosSideChain.rpc, dappServicesSisterContract, 'accountlink', account, []);

  let contract;
  if (!mainnetAccountList.length) {
    let services = await loadModels('dapp-services');
    let model = services.find(a => getContractAccountFor(a) == account);
    if (!model)
      throw new Error(`no DSP link to mainnet account ${account}`);
    else
      contract = getContractAccountFor(model);
  }

  const mainnetAccount = contract || mainnetAccountList[0].mainnet_owner;

  // if one way mapped (service), skipVerification = true, only check sidechain -> mainnet mapping with dappservicex contract
  if (skipVerification || contract)
    return mainnetAccount;

  // if !skipVerification (payer), check two way mapping via mainnet's liquidx contract' accountlink table
  const mainnetVerifiedAccounts = await getTableRowsSec(eosMain.rpc, dappServicesLiquidXContract, 'accountlink', mainnetAccount, [sidechainName, account]);
  if (!mainnetVerifiedAccounts.length || mainnetVerifiedAccounts[0].allowed_account !== account)
    throw new Error(`no account verification link on mainnet account ${account} -> ${mainnetAccount}`);
  return mainnetAccount;
}

const getPayerPermissions = async (endpoint, dappContract, payer, provider, permission) => {
  let authorization = [{ actor: provider, permission }]; //backwards compatability
  if (payer == dappContract) return authorization; //make this universal for emitting
  try {
    let account = await endpoint.rpc.get_account(payer);
    let dsp = account.permissions.find(p => p.perm_name == "dsp");
    if (!dsp) throw new Error('no dsp permission');
    let found = dsp.required_auth.accounts.find(a => a.permission.actor == provider && a.permission.permission == permission);
    if (!found) {
      logger.warn("CONSUMER ISSUE: %s is not on the DSP permission for %s", provider, payer);
      throw new Error('this provider is not on the dsp permission list');
    }
    authorization = [{ actor: payer, permission: "dsp" }]; //if detected - we will use this
  } catch (e) {
    let forcePayer = process.env.DSP_CONSUMER_PAYS === 'true' || process.env.DSP_CONSUMER_PAYS === true ? true : false;
    if (forcePayer) {
      throw e;
    } else {
      logger.warn("CONSUMER ISSUE: %s does not have a valid DSP permission configured", payer);
    }
  }
  return authorization;
}

const pushTransaction = async (endpoint, dappContract, payer, provider, action, payload, requestId = "", meta = {}, fail = false) => {
  dappContract = dappContract || dappServicesContract;
  var actions = [];
  if (enableXCallback === null) {
    enableXCallback = await detectXCallback(endpoint, dappContract);
  }
  let payerPermissions = await getPayerPermissions(endpoint, dappContract, payer, provider, paccountPermission);

  actions.push({
    account: payer,
    name: action,
    authorization: payerPermissions,
    data: payload,
  });

  if (enableXCallback === true) {
    actions.push({
      account: dappContract,
      name: "xcallback",
      authorization: [{
        actor: provider,
        permission: paccountPermission,
      }],
      data: {
        provider: provider,
        request_id: requestId,
        meta: JSON.stringify(meta)
      }
    });

    if (fail) {
      //move xcallback to be the first action
      //we don't care about the cpu payer cause this must fail
      let x = actions.pop();
      actions.unshift(x);
      actions.push({
        account: dappContract,
        name: "xfail",
        authorization: [{
          actor: provider,
          permission: paccountPermission,
        }],
        data: {}
      });
    }
  }

  try {
    let tx = await endpoint.transact({
      actions
    }, {
      expireSeconds: 120,
      sign: true,
      broadcast: true,
      blocksBehind: 10
    });
    if (fail) {
      logger.info(`expectedFailTx = ${JSON.stringify(expectedFailTx)}`);
      throw new Error('simulated trx expected to fail');
    }
    return tx;
  }
  catch (e) {
    if (fail) return e;
    logger.debug("TRANSMITTING ACTION FAILED: \n%j\n", JSON.stringify(actions));
    throw e;
  }
}

const emitUsage = async (contract, service, quantity = 1, meta = {}, requestId = '') => {
  const provider = paccount;
  const currentPackage = await resolveProviderPackage(contract, service, provider);
  const eosProv = await eosMainnet();
  if (enableXCallback === null) {
    enableXCallback = await detectXCallback(eosProv);
  }
  var quantityAsset = typeof (quantity) === 'string' ? quantity : `${(quantity / 10000).toFixed(4)} QUOTA`;
  let report = {
    usage_report: {
      "provider": paccount,
      "package": currentPackage,
      "payer": contract,
      "service": service,
      "quantity": quantityAsset,
      "success": true
    }
  }
  try {
    await pushTransaction(
      eosProv,
      dappServicesContract,
      dappServicesContract,
      paccount,
      "usagex",
      report,
      requestId,
      meta
    );
  }
  catch (e) {
    // fail if fails
    logger.warn(`provisioning failed ${JSON.stringify(e)}`);
    throw new Error("provisioning failed");
  }

}
module.exports = {
  deserialize, generateABI, genNode, genApp, forwardEvent,
  resolveProviderData, resolveProvider, processFn, handleAction,
  paccount, proxy, eosMainnet,
  resolveProviderPackage, eosDSPGateway, paccountPermission,
  encodeName, decodeName, getProviders, getEosForSidechain,
  emitUsage, detectXCallback, getTableRowsSec, getLinkedAccount,
  parseEvents, pushTransaction, eosDSPEndpoint, dfuseEndpoints,
  loggerHelper, getDfuseJwt, mainnetDfuseEnable
};