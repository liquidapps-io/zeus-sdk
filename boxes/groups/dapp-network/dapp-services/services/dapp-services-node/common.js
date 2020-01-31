const paccount = process.env.DSP_ACCOUNT || process.env.PROOF_PROVIDER_ACCOUNT || 'pprovider1';
const paccountPermission = process.env.DSP_ACCOUNT_PERMISSIONS || 'active';
const fetch = require('node-fetch');
const { getCreateKeys } = require('../../extensions/helpers/key-utils');
const { dappServicesContract, dappServicesLiquidXContract, getContractAccountFor } = require('../../extensions/tools/eos/dapp-services');

const { loadModels } = require('../../extensions/tools/models');
const { getEosWrapper } = require('../../extensions/tools/eos/eos-wrapper');
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const httpProxy = require('http-proxy');
const { BigNumber } = require('bignumber.js');
const logger = require('../../extensions/helpers/logger');
const eosjs2 = require('eosjs');
const { Serialize } = eosjs2;
const { TextDecoder, TextEncoder } = require('text-encoding');
const { Long } = require('bytebuffer')

const mainnetDspKey = process.env.DSP_PRIVATE_KEY;
if (!mainnetDspKey) console.warn('must provide DSP_PRIVATE_KEY if not using utils');
const nodeosMainnetEndpoint = process.env.NODEOS_MAINNET_ENDPOINT || 'http://localhost:8888';
const dspGatewayMainnetEndpoint = process.env.DSP_GATEWAY_MAINNET_ENDPOINT || 'http://localhost:13015';
const proxy = httpProxy.createProxyServer();

proxy.on('error', function(err, req, res) {
  if (err) {
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

const eosMainnet = async() => {
  const mainnetConfig = {
    expireInSeconds: 120,
    sign: true,
    broadcast: true,
    blocksBehind: 10,
    httpEndpoint: nodeosMainnetEndpoint,
    keyProvider: mainnetDspKey
  }
  return getEosWrapper(mainnetConfig);
}

const eosDSPGateway = async() => {
  let config = {
    expireInSeconds: 120,
    sign: true,
    broadcast: true,
    blocksBehind: 10,
    httpEndpoint: dspGatewayMainnetEndpoint,
    keyProvider: mainnetDspKey
  }
  return getEosWrapper(config);
}

var eosDSPEndpoint = getEosWrapper({
  httpEndpoint: dspGatewayMainnetEndpoint
});

const getEosForSidechain = async(sidechain, account = paccount, dspEndpoint = null) => {
  let config = {
    httpEndpoint: dspEndpoint ? `http://localhost:${sidechain.dsp_port}` : sidechain.nodeos_endpoint, //TODO: do we need to check for https?
    keyProvider: process.env[`DSP_PRIVATE_KEY_${sidechain.name.toUpperCase()}`] || (await getCreateKeys(account, null, false, sidechain)).active.privateKey //TODO: any reason not to include authorization here?
  }
  return getEosWrapper(config);
}

const forwardEvent = async(act, endpoint, redirect) => {
  if (redirect) { return endpoint; }  
  const r = await fetch(endpoint + '/event', { method: 'POST', body: JSON.stringify(act) });
  return await r.text();
};

const resolveBackendServiceData = async(service, provider, packageid, sidechain, balance) => {
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

const resolveExternalProviderData = async(service, provider, packageid, sidechain, balance) => {
  const eos = await eosMainnet();
  const packages = await getTableRowsSec(eos.rpc, dappServicesContract, "package", dappServicesContract, [null, packageid, service, provider], 1, 'sha256', 2);
  const result = packages.filter(a => (a.provider === provider || !provider) && a.package_id === packageid && a.service === service);
  if (result.length === 0) throw new Error(`resolveExternalProviderData failed ${provider} ${service} ${packageid}`);
  if (!result[0].enabled) console.log(`DEPRECATION WARNING for ${provider} ${service} ${packageid}: Packages must be enabled for DSP services to function in the future.`); //TODO: Throw error instead
  if (balance !== undefined)
    if (Number(balance.substring(0, balance.length - 5)) < Number(result[0].min_stake_quantity.substring(0, result[0].min_stake_quantity.length - 5)))
      logger.warn(`DAPP Balance is less than minimum stake quantity for provider: ${provider}, service: ${service}, packageid: ${packageid}: ${Number(result[0].min_stake_quantity.substring(0, result[0].min_stake_quantity.length - 5)) - Number(balance.substring(0, balance.length - 5))} more DAPP must be staked to meet threshold`);
  return {
    internal: false,
    endpoint: result[0].api_endpoint
  };
};

const resolveProviderData = async(service, provider, packageid, sidechain, balance) =>
  ((paccount === provider) ? resolveBackendServiceData : resolveExternalProviderData)(service, provider, packageid, sidechain, balance);

const getTableRowsSec = async(rpc, code, table, scope, keys, limit = 1, key_type, index_position) => {
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
  var encodedKey = keys.map(v => (v !== null) ? v : 0).map(v => typeof(v) === 'string' ? encodeName(v, true) : v).map(v => new BigNumber(v)).map(v => toBound(v.toString(16), 8));
  switch (key_type) {
    case 'sha256':
      payload.encode_type = 'hex';
      payload.lower_bound = encodedKey[1] + encodedKey[0] + encodedKey[3] + encodedKey[2];
      // 0      1        2          3
      //null, service, provider, packageid

      // in code:           0ULL, package_id.value, service.value, provider.value

      // need:
      //  encodedPackage + encodedNone + encodedProvider + encodedService

      break;
    case 'i128':
      payload.encode_type = 'dec';
      payload.lower_bound = "0x" + encodedKey[1] + encodedKey[0];
      break;
    case 'i64':
      if (encodedKey.length) {
        payload.lower_bound = "0x" + encodedKey[0];
        payload.encode_type = 'dec';
      }
      break;
    default:
      // code
  }
  const result = await rpc.get_table_rows(payload);
  const rowsResult = result.rows;
  return rowsResult;
};

const getProviders = async(payer, service, provider, sidechain) => {
  if (sidechain) {
    const sidechainName = sidechain.name;
    service = await getLinkedAccount(null, null, service, sidechainName, true);

    payer = await getLinkedAccount(null, null, payer, sidechainName);
  }
  const eos = await eosMainnet();
  const serviceWithStakingResult = await getTableRowsSec(eos.rpc, dappServicesContract, "accountext", "DAPP", [payer, service], 100, 'i128', 3);

  const result = serviceWithStakingResult.filter(a => (a.provider === provider || !provider) && a.account === payer && a.service === service);
  if (result.length === 0) { throw new Error(`getProviders failed - no stakes for payer - ${payer} ${provider} ${service} ${!sidechain ? 'mainnet' : sidechain.name}`); }
  return result;
};

const toBound = (numStr, bytes) =>
  `${(new Array(bytes * 2 + 1).join('0') + numStr).substring(numStr.length).toUpperCase()}`;

const resolveProviderPackage = async(payer, service, provider, sidechain, getEvery = false) => {
  let providers = [];
  const serviceWithStakingResult = await getProviders(payer, service, provider, sidechain);
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
      if(!getEvery) break;
    }
    catch (e) {
      logger.error(`Provider ${checkProvider.provider} package ${checkPackage} does not exist or is disabled`);
    }
  }
  if (!selectedPackage) { throw new Error(`resolveProviderPackage failed - no enabled packages - ${provider} ${service}`); }
  if(getEvery) return providers;
  return selectedPackage;
};

const resolveProvider = async(payer, service, provider, sidechain) => {
  if (provider != '') { return provider; }
  const serviceWithStakingResult = await getProviders(payer, service, provider, sidechain);

  // prefer self
  const intersectLists = serviceWithStakingResult.filter(accountProvider => accountProvider.model !== '').map(a => a.provider);
  if (intersectLists.indexOf(paccount) !== -1) { return paccount; }

  return intersectLists[Math.floor(Math.random() * intersectLists.length)];
};

const processFn = async(actionHandlers, actionObject, simulated, serviceName, handlers) => {
  var actionHandler = actionHandlers[actionObject.event.etype];
  if (!actionHandler) { return; }
  try {
    return await actionHandler(actionObject, simulated, serviceName, handlers);
  }
  catch (e) {
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
    catch (e) {}
  }).filter(a => a);
}

const handleAction = async(actionHandlers, action, simulated, serviceName, handlers) => {
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

const rollBack = async(garbage, actionHandlers, serviceName, handlers) => {
  return await Promise.all(garbage.map(async rollbackAction => {
    try {
      return processFn(actionHandlers, rollbackAction, true, serviceName, handlers);
    }
    catch (e) {}
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
const processRequstWithBody = async(req, res, body, actionHandlers, serviceName, handlers) => {
  var uri = req.originalUrl;
  var sidechain = body.sidechain;

  logger.debug("GATEWAY-body: %s\t[%s] - %s", uri, req.ip, sidechain ? sidechain.name : "main");

  var isServiceRequest = uri.indexOf('/event') == 0;
  var isServiceAPIRequest = uri.indexOf('/v1/dsp/') == 0;
  var uriParts = uri.split('/');
  if (isServiceRequest) {
    try {

      await processFn(actionHandlers, body, false, serviceName, handlers);
      res.send(JSON.stringify('ok'));
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
  const currentNodeosEndpoint = sidechain ? sidechain.nodeos_endpoint : nodeosMainnetEndpoint;
  while (trys < 100) {
    let r = await fetch(currentNodeosEndpoint + uri, { method: 'POST', body: JSON.stringify(body) });
    let resText = await r.text();
    let rText;
    if (r.status !== 500) {
      res.status(r.status);
      return res.send(resText);

    }
    try {
      rText = JSON.parse(resText);
      const details = rText.error.details;
      const detailMsg = details.find(d => d.message.indexOf(': required service') != -1);
      if (!detailMsg) {
        await rollBack(garbage, actionHandlers, serviceName, handlers);
        res.status(r.status);
        return res.send(resText);
      }

      const jsons = details[details.indexOf(detailMsg) + 1].message.split(': ', 2)[1].split('\n').filter(a => a.trim() != '');
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
      logger.info(`endpoint: ${endpoint}`);
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
const pjson = require('../../package.json');
const genNode = async(actionHandlers, port, serviceName, handlers, abi, sidechain) => {
  if (handlers) handlers.abi = abi;
  const app = genApp();
  app.use(async(req, res, next) => {
    var uri = req.originalUrl;
    logger.info("GATEWAY: %s\t[%s] - %s", uri, req.ip, sidechain ? sidechain.name : "main");

    var isServiceRequest = uri.indexOf('/event') == 0;
    var isServiceAPIRequest = uri.indexOf('/v1/dsp/') == 0;
    var uriParts = uri.split('/');
    if (uri === '/v1/dsp/version')
      return res.send(pjson.version); // send response to contain the version

    if (uri != '/v1/chain/push_transaction' && !isServiceRequest && !isServiceAPIRequest)
      return proxy.web(req, res, { target: sidechain ? sidechain.nodeos_endpoint : nodeosMainnetEndpoint });

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
    }, async function(err, string) {
      if (err) return next(err);
      const body = JSON.parse(string.toString());

      let currentSidechain = sidechain;
      if (body.sidechain)
        currentSidechain = body.sidechain;
      if (req.headers['sidechain'] && serviceName !== 'services') {

        var sidechainName = req.headers['sidechain'];
        logger.debug(`sidechain: ${sidechainName}`);
        const sidechains = await loadModels('local-sidechains');
        currentSidechain = sidechains.find(s => s.Name = sidechainName);
      }
      body.sidechain = currentSidechain;
      return processRequstWithBody(req, res, body, actionHandlers, serviceName, handlers);

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

const detectXCallback = async(eos, contractName) => {
  if (!contractName)
    contractName = dappServicesContract;
  var contract = await eos.contract(contractName);
  if (contract.xcallback)
    return true;
  else return false;
}
let enableXCallback = null;

// returns a mainnet linked account for a service contract or service payer, or a dappservicex contract on a sidechain
const getLinkedAccount = async(eosSideChain, eosMain, account, sidechainName, skipVerification) => {
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
  // if no sidechain object provided, retrieve from /models/local-sidechains
  if (!eosSideChain) {
    var models = await loadModels('local-sidechains');
    const sidechain = models.find(m => m.name == sidechainName);
    eosSideChain = await getEosForSidechain(sidechain);
  }
  // returns dappservicex contract name on sister chain from chainentry table on liquidx contract on mainnet
  const dappServicesSisterContract = await getLinkedAccount(eosSideChain, eosMain, 'dappservices', sidechainName);
  // returns account link map from side chain's dappservicex given a side chain account name
  const mainnetAccountList = await getTableRowsSec(eosSideChain.rpc, dappServicesSisterContract, 'accountlink', account, []);
  if (!mainnetAccountList.length)
    throw new Error(`no DSP link to mainnet account ${account}`);
  const mainnetAccount = mainnetAccountList[0].mainnet_owner;

  // if one way mapped (service), skipVerification = true, only check sidechain -> mainnet mapping with dappservicex contract
  if (skipVerification)
    return mainnetAccount;

  // if !skipVerification (payer), check two way mapping via mainnet's liquidx contract' accountlink table
  const mainnetVerifiedAccounts = await getTableRowsSec(eosMain.rpc, dappServicesLiquidXContract, 'accountlink', mainnetAccount, [sidechainName, account]);
  if (!mainnetVerifiedAccounts.length || mainnetVerifiedAccounts[0].allowed_account !== account)
    throw new Error(`no account verification link on mainnet account ${account} -> ${mainnetAccount}`);
  return mainnetAccount;
}

const getPayerPermissions = async(endpoint, dappContract, payer, provider, permission) => {
  let authorization = [{actor: provider,permission}]; //backwards compatability
  if(payer == dappContract) return authorization; //make this universal for emitting
  try {
    let account = await endpoint.rpc.get_account(payer);
    let dsp = account.permissions.find(p=>p.perm_name == "dsp");
    if(!dsp) throw new Error('no dsp permission');
    let found = dsp.required_auth.accounts.find(a=>a.permission.actor == provider && a.permission.permission == permission);
    if(!found) {
      logger.warn("CONSUMER ISSUE: %s is not on the DSP permission for %s",provider,payer);
      throw new Error('this provider is not on the dsp permission list');
    }
    authorization = [{actor: payer, permission: "dsp"}]; //if detected - we will use this
  } catch(e) {    
    let forcePayer = process.env.DSP_CONSUMER_PAYS === 'true' || process.env.DSP_CONSUMER_PAYS === true  ? true : false;
    if(forcePayer) {
      throw e;
    } else {
      logger.warn("CONSUMER ISSUE: %s does not have a valid DSP permission configured", payer);
    }
  }
  return authorization;
}

const pushTransaction = async(endpoint, dappContract, payer, provider, action, payload, requestId = "", meta = {}, fail = false) => {
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

    if(fail) {
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
    if(fail) {
      logger.info(`expectedFailTx = ${JSON.stringify(expectedFailTx)}`);
      throw new Error('simulated trx expected to fail');
    }
    return tx;    
  }
  catch (e) {
    if(fail) return e;
    logger.debug("TRANSMITTING ACTION FAILED: \n%j\n", JSON.stringify(actions));
    throw e;    
  }
}

const emitUsage = async(contract, service, quantity = 1, meta = {}, requestId = '') => {
  const provider = paccount;
  const currentPackage = await resolveProviderPackage(contract, service, provider);
  const eosProv = await eosMainnet();
  if (enableXCallback === null) {
    enableXCallback = await detectXCallback(eosProv);
  }
  var quantityAsset = typeof(quantity) === 'string' ? quantity : `${(quantity / 10000).toFixed(4)} QUOTA`;
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
  parseEvents, pushTransaction, eosDSPEndpoint 
};