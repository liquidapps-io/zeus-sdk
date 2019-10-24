const paccount = process.env.DSP_ACCOUNT || process.env.PROOF_PROVIDER_ACCOUNT || 'pprovider1';
const paccountPermission = process.env.DSP_ACCOUNT_PERMISSIONS || 'active';
const fetch = require('node-fetch');
const { dappServicesContract, getContractAccountFor } = require('../../extensions/tools/eos/dapp-services');
const { loadModels } = require('../../extensions/tools/models');
const { getUrl } = require('../../extensions/tools/eos/utils');
const { getEosWrapper } = require('../../extensions/tools/eos/eos-wrapper');
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const httpProxy = require('http-proxy');
const { BigNumber } = require('bignumber.js');
const logger = require('../../extensions/helpers/logger');
const eosjs2 = require('eosjs');
const { Serialize, JsonRpc } = eosjs2;
const { TextDecoder, TextEncoder } = require('text-encoding');
const { Long } = require('bytebuffer')

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });

const network = {
  name: 'Localhost',
  host: process.env.NODEOS_HOST || 'localhost',
  secured: process.env.NODEOS_SECURED === 'true' || false,
  port: process.env.NODEOS_PORT || 8888,
  chainId: process.env.NODEOS_CHAINID
};
var eosconfig = {
  chainId: network.chainId, // 32 byte (64 char) hex string
  expireInSeconds: 120,
  sign: true,
  broadcast: true,
  blocksBehind: 10,
};
var eosdspconfig = { ...eosconfig };
if (network.secured) {
  eosconfig.httpsEndpoint = 'https://' + network.host + ':' + network.port;
  eosconfig.httpEndpoint = 'https://' + network.host + ':' + network.port;
}
else {
  eosconfig.httpEndpoint = 'http://' + network.host + ':' + network.port;
}

const nodeosEndpoint = eosconfig.httpEndpoint || eosconfig.httpsEndpoint;
const proxy = httpProxy.createProxyServer();

proxy.on('error', function(err, req, res) {
  if (err) {
    console.error(err);
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

  // console.log('encodeName', name, value.toString(), ulName.toString(), JSON.stringify(bitstr.split(/(.....)/).slice(1)))

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

  // console.log('decodeName', str, beValue.toString(), value.toString(), JSON.stringify(beValue.toString(2).split(/(.....)/).slice(1)))

  return str
}


// const nameToString = (name) => {
//     const tmp = new BigNumber(name.toString('hex'), 16);
//     return decodeName(tmp.toString(), truFORWARDe);
// }
var eosPrivate = getEosWrapper(eosconfig);
eosdspconfig.httpEndpoint = `http://${process.env.NODEOS_HOST_DSP || 'localhost'}:${process.env.NODEOS_HOST_DSP_PORT || process.env.DSP_PORT || 13015}`;
var eosDSPGateway = getEosWrapper(eosdspconfig);



const forwardEvent = async(act, endpoint, redirect) => {
  if (redirect) { return endpoint; }
  const r = await fetch(endpoint + '/event', { method: 'POST', body: JSON.stringify(act) });
  await r.text();
};

const resolveBackendServiceData = async(service, provider) => {
  // console.log('resolving backend service for', service, provider);
  // read from local service models
  var loadedExtensions = await loadModels('dapp-services');
  var loadedExtension = loadedExtensions.find(a => getContractAccountFor(a) == service);
  if (!loadedExtension) { return; }
  var host = process.env[`DAPPSERVICE_HOST_${loadedExtension.name.toUpperCase()}`];
  var port = process.env[`DAPPSERVICE_PORT_${loadedExtension.name.toUpperCase()}`];
  if (!host) { host = 'localhost'; }
  if (!port) { port = loadedExtension.port; }
  return {
    internal: true,
    endpoint: `http://${host}:${port}`
  };
};
const resolveExternalProviderData = async(service, provider, packageid) => {
  var key = getSvcProviderPkgKey(service, provider, packageid);

  const payload = {
    'json': true,
    'scope': dappServicesContract,
    'code': dappServicesContract,
    'table': 'package',
    'lower_bound': key,
    'key_type': 'sha256',
    'encode_type': 'hex',
    'index_position': 2,
    'limit': 1
  };
  const packages = await rpc.get_table_rows(payload);
  const result = packages.rows.filter(a => (a.provider === provider || !provider) && a.package_id === packageid && a.service === service);
  if (result.length === 0) { throw new Error(`resolveExternalProviderData failed ${provider} ${service} ${packageid}`); }
  if (!result[0].enabled) { console.log(`DEPRECATION WARNING for ${provider} ${service} ${packageid}: Packages must be enabled for DSP services to function in the future.`); } //TODO: Throw error instead

  return {
    internal: false,
    endpoint: result[0].api_endpoint
  };
};

const resolveProviderData = async(service, provider, packageid) =>
  ((paccount == provider) ? resolveBackendServiceData : resolveExternalProviderData)(service, provider, packageid);

const getSvcProviderPkgKey = (service, provider, packageid) => {
  // package_id service.value, provider.value
  var encodedProvider = new BigNumber(encodeName(provider, true));
  var encodedService = new BigNumber(encodeName(service, true));
  var encodedNone = new BigNumber(0);
  var encodedPackage = new BigNumber(encodeName(packageid, true));
  encodedService = (toBound(encodedService.toString(16), 8));
  encodedProvider = (toBound(encodedProvider.toString(16), 8));
  encodedPackage = (toBound(encodedPackage.toString(16), 8));
  encodedNone = (toBound(encodedNone.toString(16), 8));
  return encodedPackage + encodedNone + encodedProvider + encodedService;
};
const getSvcPayerKey = (payer, service) => {
  var encodedPayer = new BigNumber(encodeName(payer, true));
  var encodedService = new BigNumber(encodeName(service, true));
  encodedService = (toBound(encodedService.toString(16), 8));
  encodedPayer = (toBound(encodedPayer.toString(16), 8));
  return '0x' + encodedService + encodedPayer;
};
const getProviders = async(payer, service, provider) => {
  const payload = {
    'json': true,
    'scope': 'DAPP',
    'code': dappServicesContract,
    'table': 'accountext',
    'lower_bound': getSvcPayerKey(payer, service),
    'key_type': 'i128',
    'encode_type': 'dec',
    'index_position': 3,
    'limit': 100
  };
  const serviceWithStakingResult = await rpc.get_table_rows(payload);
  const result = serviceWithStakingResult.rows.filter(a => (a.provider === provider || !provider) && a.account === payer && a.service === service);
  if (result.length === 0) { throw new Error(`resolveProviderPackage failed - no stakes for payer - ${provider} ${service}`); }
  return result;
};
const toBound = (numStr, bytes) =>
  `${(new Array(bytes * 2 + 1).join('0') + numStr).substring(numStr.length).toUpperCase()}`;
const resolveProviderPackage = async(payer, service, provider) => {
  const serviceWithStakingResult = await getProviders(payer, service, provider);
  //we must iterate over staked packages and ensure they are enabled
  let selectedPackage = null;
  for (let i = 0; i < serviceWithStakingResult.length; i++) {
    let checkProvider = serviceWithStakingResult[i];
    let checkPackage = checkProvider.package ? checkProvider.package : checkProvider.pending_package;
    try {
      await resolveExternalProviderData(service, provider, checkPackage);
      selectedPackage = checkPackage;
      break;
    }
    catch (e) {
      console.log(`Provider ${provider} package ${checkPackage} does not exist or is disabled`);
    }
  }
  if (!selectedPackage) { throw new Error(`resolveProviderPackage failed - no enabled packages - ${provider} ${service}`); }

  return selectedPackage;
};

const resolveProvider = async(payer, service, provider) => {
  if (provider != '') { return provider; }
  const serviceWithStakingResult = await getProviders(payer, service, provider);

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
    console.error(e);
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
var getRawBody = require('raw-body');
const genNode = async(actionHandlers, port, serviceName, handlers, abi) => {
  if (handlers) { handlers.abi = abi; }
  const app = genApp();
  app.use(async(req, res, next) => {
    var uri = req.originalUrl;
    logger.info("GATEWAY: %s\t[%s]", uri, req.ip);

    var isServiceRequest = uri.indexOf('/event') == 0;
    var isServiceAPIRequest = uri.indexOf('/v1/dsp/') == 0;
    var uriParts = uri.split('/');
    if(uri === '/v1/dsp/version'){
      const pjson = require('../../package.json');
      res.send(pjson.version); // send response to contain the version
      return;
    }
    if (uri != '/v1/chain/push_transaction' && !isServiceRequest && !isServiceAPIRequest) {
      proxy.web(req, res, { target: nodeosEndpoint });
      return;
    }
    if (isServiceAPIRequest) {
      if (uriParts.length < 5) { return notFound(res, 'bad endpoint format'); }
      var service = uriParts[3];
      if (serviceName == 'services') {
        // forward
        var providerData = await resolveBackendServiceData(service, paccount);
        if (!providerData) { return notFound(res, 'service not found'); }
        proxy.web(req, res, { target: providerData.endpoint });
        return;
      }
    }

    getRawBody(req, {
      length: req.headers['content-length']
    }, async function(err, string) {
      if (err) return next(err);
      var body = JSON.parse(string.toString());


      if (isServiceRequest) {
        try {
          await processFn(actionHandlers, body, false, serviceName, handlers);
          res.send(JSON.stringify('ok'));
        }
        catch (e) {
          res.status(500);
          res.send(JSON.stringify({
            code: 500,
            error: {
              details: [{ message: e.toString() }]
            }
          }));
        }
        return;
      }
      if (isServiceAPIRequest) {
        // invoke api
        var api = handlers.api;
        if (!api) { return notFound(res); }

        var methodName = uriParts[4];
        var method = api[methodName];
        if (!method) { return notFound(res, 'method not found'); }

        req.body = body;
        try {
          await method(req, res);
        }
        catch (e) {
          res.status(500);
          res.send(JSON.stringify({
            code: 500,
            error: {
              details: [{ message: e.toString() }]
            }
          }));
        }
        return;
      }

      var trys = 0;
      var garbage = [];
      var rText;
      while (true) {
        var r = await fetch(nodeosEndpoint + uri, { method: 'POST', body: JSON.stringify(body) });
        var resText = await r.text();
        try {
          rText = JSON.parse(resText);
          if (r.status == 500) {
            var details = rText.error.details;
            var detailMsg = details.find(d => d.message.indexOf(': required service') != -1);
            if (detailMsg) {
              var jsons = details[details.indexOf(detailMsg) + 1].message.split(': ', 2)[1].split('\n').filter(a => a.trim() != '');
              var currentEvent;
              for (var i = 0; i < jsons.length; i++) {
                try {
                  currentEvent = JSON.parse(jsons[i]);
                }
                catch (e) {
                  continue;
                }
                var currentActionObject = {
                  event: currentEvent,
                  exception: true
                };
                if (i < jsons.length - 1) { await processFn(actionHandlers, currentActionObject, true, serviceName, handlers); }
              }
              var event = currentEvent;
              if (!event) {
                throw new Error("unable to parse service request. is nodeos missing 'contracts-console = true'?");
              }
              var actionObject = {
                event,
                exception: true
              };

              var endpoint = await processFn(actionHandlers, actionObject, true, serviceName, handlers);
              if (endpoint === 'retry') {
                garbage.push({ ...actionObject, rollback: true });
                console.log('Service request done:', trys++);
                continue;
              }
              else if (endpoint) {
                r = await fetch(endpoint + uri, { method: 'POST', body: JSON.stringify(body) });
                resText = await r.text();
                rText = JSON.parse(resText);
              }
              if (r.status == 500) { await rollBack(garbage, actionHandlers, serviceName, handlers); }
              res.status(r.status);
              res.send(JSON.stringify(rText));
              return;
            }
            await rollBack(garbage, actionHandlers, serviceName, handlers);
          }
          else {
            if (rText.processed) {
              for (var i = 0; i < rText.processed.action_traces.length; i++) {
                var action = rText.processed.action_traces[i];
                // skip actions that were already done previously (in exception)
                // await handleAction(actionHandlers, action, true, serviceName, handlers);
              }
            }
          }
          res.status(r.status);
          res.send(JSON.stringify(rText));
        }
        catch (e) {
          await rollBack(garbage, actionHandlers, serviceName, handlers);
          console.error(e);
          res.status(500);
          res.send(JSON.stringify({
            code: 500,
            error: {
              details: [{ message: e.toString(), response: rText }]
            }
          }));
        }
        return;
      }
    });
  });
  app.listen(port, () => console.log(`${serviceName} listening on port ${port}!`));
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
    // console.log('type not found', atype);
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
  'vector<char>': 'bytes',
  'symbol_code': 'symbol_code',
  'checksum256': 'checksum256',
  'eosio::symbol_code': 'symbol_code'
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
      return {
        name: argName,
        type: convertToAbiType(commandModel.request[argName])
      };
    })
  };
};

const generateABI =
  (serviceModel) =>
  Object.keys(serviceModel.commands).map(c => generateCommandABI(c, serviceModel.commands[c]));

module.exports = { deserialize, generateABI, genNode, genApp, forwardEvent, resolveProviderData, resolveProvider, processFn, handleAction, paccount, proxy, eosPrivate, eosconfig, nodeosEndpoint, resolveProviderPackage, eosDSPGateway, paccountPermission, encodeName, decodeName, getProviders };
