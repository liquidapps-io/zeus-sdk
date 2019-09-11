#!/usr/bin/env node

const { TextDecoder, TextEncoder } = require('text-encoding');
const logger = require('../../../extensions/helpers/logger');
const WebSocket = require('ws');
var pako = require('pako');

const ws = new WebSocket(`ws://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_WEBSOCKET_PORT || '8889'}`, {
  perMessageDeflate: false

});
var expectingABI = true;
ws.on('open', function open() {
  expectingABI = true;
  console.log('ws connected');
});
const abis = require('./abis/abi');
const abiabi = require('./abis/abiabi');
const { Serialize } = require('eosjs');

const { loadModels } = require('../../../extensions/tools/models');
const fetch = require('node-fetch');

let capturedEvents;
const loadEvents = async() => {
  if (!capturedEvents) {
    capturedEvents = {};
    var capturedEventsModels = await loadModels('captured-events');

    capturedEventsModels.forEach(a => {
      if (process.env.TEST_ENV !== 'true' && a.testOnly)
        return;
      if (!a.eventType) {
        a.eventType = '*';
      }
      if (!a.contract) {
        a.contract = '*';
      }
      if (!a.method) {
        a.method = '*';
      }
      if (!capturedEvents[a.eventType]) {
        capturedEvents[a.eventType] = {};
      }
      if (!capturedEvents[a.eventType][a.contract]) {
        capturedEvents[a.eventType][a.contract] = {};
      }
      if (!capturedEvents[a.eventType][a.contract][a.method]) {
        capturedEvents[a.eventType][a.contract][a.method] = [];
      }
      capturedEvents[a.eventType][a.contract][a.method].push(a.webhook);
    });
  }
  return capturedEvents;
};
const handlers = {
  'eosio': (txid, account, method, code, actData, events, eventNum, blockNum) => {
    // all methods
    if (method == 'onblock') {
      // console.log('.');
    }
    else if (method == 'newaccount') {
      // console.log(`new account: ${actData.name}`);
    }
    else if (method == 'setabi') {
      var localTypes = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abiabi);
      var buf = Buffer.from(actData.abi, 'hex');
      var buffer = new Serialize.SerialBuffer({
        textEncoder: new TextEncoder(),
        textDecoder: new TextDecoder()
      });
      buffer.pushArray(Serialize.hexToUint8Array(actData.abi));

      var abi = localTypes.get('abi_def').deserialize(buffer);
      abis[actData.account] = abi;
      console.log(`setabi for ${actData.account} - updating Serializer`);
    }
    // else
    //     console.log("system", account,method,code,actData, events);
  },
  '*': {
    '*': {
      '*': async(txid, account, method, code, actData, event, eventNum, blockNum) => {
        // load from model.

        var events = await loadEvents();
        var curr = events;
        if (!curr[event.etype]) return;
        curr = curr[event.etype];
        if (!curr[code]) { curr = curr['*']; }
        else { curr = curr[code]; }
        if (!curr) return;

        if (!curr[method]) { curr = curr['*']; }
        else { curr = curr[method]; }
        if (curr) {
          await Promise.all(curr.map(async url => {
            if (process.env.WEBHOOKS_HOST) {
              url = url.replace('http://localhost:', process.env.WEBHOOKS_HOST);
            }
            event.txid = txid;
            event.eventNum = eventNum;
            event.blockNum = blockNum;
            var r = await fetch(url, {
              headers: {
                'Content-Type': 'application/json'
              },
              method: 'POST',
              body: JSON.stringify({
                receiver: account,
                method,
                account: code,
                data: actData,
                event
              })
            });
            return r.text();
            // call webhook
          }));
          console.log('fired hooks:', account, method, event, code);
        }
        //     else
        //         console.log("catching all unhandled events:", account,method,code,actData, event);
      }
    }
  }
};
async function recursiveHandle({ txid, account, method, code, actData, events }, depth = 0, currentHandlers = handlers, eventNum = 0, blockNum = 0) {
  if (depth == 3) { return; }

  var key = account;
  if (depth == 2) {
    key = events;
    if (Array.isArray(key)) {
      for (var i = 0; i < key.length; i++) {
        var currentEvent = key[i];
        var eventType = currentEvent.etype;
        if (!eventType) { continue; }
        await recursiveHandle({ txid, account, method, code, actData, events: currentEvent }, depth, currentHandlers, eventNum + i, blockNum);
      }
      return key.length + eventNum;
    }
    key = events.etype;
  }
  if (depth == 1) {
    key = method;
  }
  var subHandler = currentHandlers[key];
  if (!subHandler && depth == 0) {
    key = code;
    subHandler = currentHandlers[key];
  }
  if (!subHandler) { subHandler = currentHandlers['*']; }

  if (subHandler) {
    if (typeof subHandler === 'function') {
      return await subHandler(txid, account, method, code, actData, events, eventNum, blockNum);
    }
    else if (typeof subHandler === 'object') {
      return recursiveHandle({ txid, account, method, code, actData, events }, depth + 1, subHandler, eventNum, blockNum);
    }
    else {
      console.log(`got action: ${code}.${method} ${account == code ? '' : `(${account})`} - ${JSON.stringify(events)}`);
    }
  }
  else {
    console.log(`no handler for action: ${code}.${method} ${account == code ? '' : `(${account})`} - ${JSON.stringify(events)}`, currentHandlers, key);
  }
}

function parsedAction(txid, account, method, code, actData, events, maxEventNum, blockNum) {
  var abi = abis[code];
  if (abi) {
    var localTypes = types = Serialize.getTypesFromAbi(types, abi);
    var action = abi.actions.find(a => a.name == method);
    if (action) {
      var buffer = new Serialize.SerialBuffer({
        textEncoder: new TextEncoder(),
        textDecoder: new TextDecoder()
      });
      buffer.pushArray(Serialize.hexToUint8Array(actData));
      var theType = localTypes.get(action.type);

      actData = theType.deserialize(buffer);
    }
  }
  return recursiveHandle({ txid, account, method, code, actData, events }, 0, handlers, maxEventNum, blockNum);
}

function parseEvents(text) {
  return text.split('\n').map(a => {
    if (a === '') { return null; }
    try {
      return JSON.parse(a);
    }
    catch (e) {}
  }).filter(a => a);
}

async function actionHandler(txid, action, maxEventNum, blockNum) {
  // if (action[1].act.name !== 'onblock') {
  //   const relevantStuff = {
  //     receiver: action[1].receiver,
  //     act: action[1].act,
  //     console: action[1].console
  //   }
  //   console.log(`handling action ${JSON.stringify(relevantStuff, null, 4)}`);
  // }
  if (Array.isArray(action)) { action = action[1]; }
  maxEventNum = await parsedAction(txid,action.receipt[1].receiver, action.act.name, action.act.account, action.act.data, parseEvents(action.console), maxEventNum, blockNum);
  if (action.inline_traces) {
    for (var i = 0; i < action.inline_traces.length; i++) {
      maxEventNum = await actionHandler(txid,action.inline_traces[i], maxEventNum, blockNum);
    }
  }
  return maxEventNum;
}

async function transactionHandler(tx, blockNum) {
  if (tx.action_traces[0][1].act.name !== 'onblock') {
    console.log(`handling tx ${tx.id} with ${tx.action_traces.length} actions`)
    // console.log(JSON.stringify(tx, null, 4))
  }
  var actionTraces = tx.action_traces;
  let maxEventNum = 0;
  for (var i = 0; i < actionTraces.length; i++) {
    // console.log(`action ${i} with current maxEventNum ${maxEventNum}`)
    var actionTrace = actionTraces[i];    
    maxEventNum = await actionHandler(tx.id,actionTrace, maxEventNum, blockNum);
  }
}
var c = 35000000;
var c2 = 0;
var types;
var head_block = 0;
var current_block = 0;
ws.on('message', async function incoming(data) {
  if (!expectingABI) {
    var buffer = new Serialize.SerialBuffer({
      textEncoder: new TextEncoder(),
      textDecoder: new TextDecoder(),
      array: data
    });
    const realData = types.get('result').deserialize(buffer);
    if (++c % 10000 == 0 && current_block === 0) { console.log(`syncing ${c / 1000000}M (${head_block / 1000000}M}`); }
    head_block = realData[1].head.block_num;
    if (!realData[1].traces) { return; }
    var traces = Buffer.from(realData[1].traces, 'hex');
    current_block = realData[1].this_block.block_num;
    if (++c2 % 10000 == 0) { console.log('at', current_block - head_block); }

    try {
      var n = traces.readUInt8(4);
      var n2 = traces.readUInt8(5);
      let res = traces;
      if (n === 120 && n2 === 156) {
        res = pako.inflate(traces.slice(4));
      }
      // var output = pako.inflate(res);
      var output = res;
      var buffer2 = new Serialize.SerialBuffer({
        textEncoder: new TextEncoder(),
        textDecoder: new TextDecoder(),
        array: output
      });

      var count = buffer2.getVaruint32();
      // console.log('count', count);
      
      for (var i = 0; i < count; i++) {
        const transactionTrace = types.get('transaction_trace').deserialize(buffer2);
        //TODO: add DEMUX logging
        //if(!JSON.stringify(transactionTrace[1]).includes("eosio")) logger.info("TRANSACTION: %j",transactionTrace[1]);
        
        // console.log("transactionTrace", JSON.stringify(transactionTrace, null, 4));
        await transactionHandler(transactionTrace[1], current_block);
      }
    }
    catch (e) {
      console.error(e);
      return;
    }

    return;
  }
  console.log('got abi');
  var abi = JSON.parse(data);
  types = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abi);

  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
  });
  // console.log('types',types.get('request'));
  //   abiObjSer = eos.fc.abiCache.abi('request', abi);
  types.get('request').serialize(buffer, ['get_blocks_request_v0', {
    'start_block_num': 35000000,
    'end_block_num': 4294967295,
    'max_messages_in_flight': 4294967295,
    'have_positions': [],
    'irreversible_only': false,
    'fetch_block': true,
    'fetch_traces': true,
    'fetch_deltas': false
  }]);
  expectingABI = false;

  ws.send(buffer.asUint8Array());
});
