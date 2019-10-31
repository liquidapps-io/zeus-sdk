#!/usr/bin/env node

const { Serialize } = require('eosjs');
const { TextDecoder, TextEncoder } = require('text-encoding');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const pako = require('pako');
const { loadModels } = require('../../../extensions/tools/models');
const { getAbis, getAbiAbi } = require('./state_history_abi');
const logger = require('../../../extensions/helpers/logger');
const dal = require('../../dapp-services-node/dal/dal');

const ws = new WebSocket(`ws://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_WEBSOCKET_PORT || '8889'}`, {
  perMessageDeflate: false
});

var abis = getAbis();
var abiabi = getAbiAbi();
const dbTimeout = process.env.DB_TIMEOUT || 5000;
var c = process.env.DEMUX_HEAD_BLOCK || 0;
var c2 = 0;
var types;
var head_block = 0;
var current_block = 0;
var pending = [];
var genesisTimestampMs;

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
  'eosio': (txid, account, method, code, actData, events, eventNum, blockNum, cbevent) => {
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
      logger.debug(`setabi for ${actData.account} - updating Serializer`);
    }
    return eventNum;
    // else
    //     console.log("system", account,method,code,actData, events);
  },
  '*': {
    '*': {
      '*': async(txid, account, method, code, actData, event, eventNum, blockInfo, cbevent) => {
        // load from model.

        var events = await loadEvents();
        var curr = events;
        logger.debug(`handling ${txid} ${eventNum} ${account} ${code} ${JSON.stringify(event)} ${method} ${cbevent}`);

        if (!curr[event.etype]) return eventNum;
        curr = curr[event.etype];
        if (!curr[code]) { curr = curr['*']; }
        else { curr = curr[code]; }
        if (!curr) return eventNum;

        if (!curr[method]) { curr = curr['*']; }
        else { curr = curr[method]; }
        if (curr) {
          Promise.all(curr.map(async url => {
            if (process.env.WEBHOOKS_HOST) {
              url = url.replace('http://localhost:', process.env.WEBHOOKS_HOST);
            }
            event.meta = {
              txId: txid,
              blockNum: blockInfo.number,
              timestamp: blockInfo.timestamp,
              blockId: blockInfo.id,
              eventNum,
              cbevent
            }
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

            await r.text();
            return eventNum;
            // call webhook
          }));
          logger.debug(`fired hooks: ${account} ${method} ${JSON.stringify(event, null, 2)} ${code}`);
        }
        return eventNum;
        //     else
        //         console.log("catching all unhandled events:", account,method,code,actData, event);
      }
    }
  }
};
async function recursiveHandle({ txid, account, method, code, actData, events }, depth = 0, currentHandlers = handlers, eventNum = 0, blockInfo, cbevent) {
  if (depth == 3) {
    console.log('not supposed to get here')
    return;
  }

  var key = account;
  if (depth == 2) {
    key = events;
    if (Array.isArray(events)) {
      for (var i = 0; i < events.length; i++) {
        var currentEvent = events[i];
        var eventType = currentEvent.etype;
        logger.debug(`event: ${JSON.stringify(currentEvent, null, 2)}`);
        if (!eventType) { continue; }
        await recursiveHandle({ txid, account, method, code, actData, events: currentEvent }, depth, currentHandlers, eventNum + i, blockInfo, cbevent);
      }
      return eventNum + events.length;
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
      return await subHandler(txid, account, method, code, actData, events, eventNum, blockInfo, cbevent);
    }
    else if (typeof subHandler === 'object') {
      return recursiveHandle({ txid, account, method, code, actData, events }, depth + 1, subHandler, eventNum, blockInfo, cbevent);
    }
    else {
      logger.debug(`got action: ${code}.${method} ${account == code ? '' : `(${account})`} - ${JSON.stringify(events)}`);
    }
  }
  else {
    logger.debug(`no handler for action: ${code}.${method} ${account == code ? '' : `(${account})`} - ${JSON.stringify(events)}`, currentHandlers, key);
  }
}

function parsedAction(txid, account, method, code, actData, events, maxEventNum, blockInfo, cbevent) {
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
  return recursiveHandle({ txid, account, method, code, actData, events }, 0, handlers, maxEventNum, blockInfo, cbevent);
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
async function actionHandler(txid, action, maxEventNum, blockInfo, cbevent) {
  if (Array.isArray(action)) { action = action[1]; }
  maxEventNum = await parsedAction(txid, action.receipt[1].receiver, action.act.name, action.act.account, action.act.data, parseEvents(action.console), maxEventNum, blockInfo, cbevent);
  if (action.inline_traces) {
    for (var i = 0; i < action.inline_traces.length; i++) {
      maxEventNum = await actionHandler(txid, action.inline_traces[i], maxEventNum, blockInfo, cbevent);
    }
  }
  return maxEventNum;
}

async function transactionHandler(tx, blockInfo) {
  var startFrom = 0
  var cbevent;
  if (tx.action_traces[0][1].act.name === 'xcallback') {
    // transaction is a service response
    cbevent = parseEvents(tx.action_traces[0][1].console);
    cbevent = cbevent[0];

    startFrom++;
  }
  var actionTraces = tx.action_traces;
  let maxEventNum = 0;
  for (var i = startFrom; i < actionTraces.length; i++) {
    // logger.debug(`action ${i} with current maxEventNum ${maxEventNum}`)
    var actionTrace = actionTraces[i];
    maxEventNum = await actionHandler(tx.id, actionTrace, maxEventNum, blockInfo, cbevent);
  }
}

var last_processed = 0;
async function messageHandler(data) {
  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder(),
    array: data
  });

  const realData = types.get('result').deserialize(buffer);
  if (++c % 10000 == 0 && current_block === 0) { logger.info(`syncing ${c / 1000000}M (${head_block / 1000000}M}`); }
  head_block = realData[1].head.block_num;
  const block_id = realData[1].head.block_id;
  if (!realData[1].traces) { return; }
  var traces = Buffer.from(realData[1].traces, 'hex');
  current_block = realData[1].this_block.block_num;
  if (++c2 % 10000 == 0) { logger.info('at %s', current_block - head_block); }

  const timestamp = await getBlockTimestamp(current_block);
  const blockInfo = { timestamp, number: current_block, id: block_id };

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
    for (var i = 0; i < count; i++) {
      const transactionTrace = types.get('transaction_trace').deserialize(buffer2);
      await transactionHandler(transactionTrace[1], blockInfo);
    }
    if(current_block - last_processed >= 10000) {
      last_processed = current_block;
      await Promise.race([
        dal.updateSettings({ last_processed_block: current_block }),
        new Promise((resolve, reject) => {
          setTimeout(() => { reject('database call timeout') }, dbTimeout);
        })
      ]);
      logger.info("Updated database with current block: %s", current_block);
    }
    
  }
  catch (e) {
    logger.error(e);
  }
}

var retries = 0;
async function watchMessages() {
  
  if (pending.length !== 0) {
    //always remove the message from pending
    const data = pending.shift();
    try {
      await messageHandler(data);
    }
    catch (e) {
      //if something went wrong, just carry on
      logger.info("Retry block");
      pending.unshift(data);
      types = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abi);
      ++retries;
      setImmediate(watchMessages);
      return;
    }
    if (retries !== 0) {
      logger.info(`Success after ${retries} attempts`);
      retries = 0;
    }
    // process another block recursively without blocking the event loop
    setImmediate(watchMessages);
  }
  else {
    // otherwise be idle for 250ms
    setTimeout(watchMessages, 250);
  }
}

var abi;
var expectingABI = true;
ws.on('open', function open() {
  expectingABI = true;
  logger.info('ws connected');
});

var heartBeat = Math.floor(Date.now() / 1000);
ws.on('message', async function incoming(data) {
  //start pushing messages after we received the ABI
  if (!expectingABI) {
    pending.push(data);
    let currTime = Math.floor(Date.now() / 1000);
    if((currTime - heartBeat) >= 15) { //heartbeat every 15 seconds
      heartBeat = currTime;
      logger.info("Demux heartbeat - Processed Block: %s Pending Messages: %s",current_block,pending.length);
    }
    return;
  }

  logger.info('got abi');
  abi = JSON.parse(data);
  types = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abi);

  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
  });

  let start_block_num;
  try {
    start_block_num = await getStartingBlockNumber();
  } catch(e) {
    logger.error(`Error getting starting block number: ${JSON.stringify(e)}`);
    start_block_num = c;
  }
  c = start_block_num;
  logger.info(`starting demux at block ${start_block_num}`);

  //we have the abi now, create a get blocks request
  types.get('request').serialize(buffer, ['get_blocks_request_v0', {
    'start_block_num': start_block_num,
    'end_block_num': 4294967295,
    'max_messages_in_flight': 4294967295,
    'have_positions': [],
    'irreversible_only': false,
    'fetch_block': true,
    'fetch_traces': true,
    'fetch_deltas': false
  }]);
  expectingABI = false;
  //send the request, all future messages should be blocks
  ws.send(buffer.asUint8Array());
  logger.info("Starting demux processing");
  watchMessages();
});

async function getStartingBlockNumber() {
  const settings = await Promise.race([
    dal.getSettings(),
    new Promise((resolve, reject) => {
      setTimeout(() => { reject('database call timeout') }, dbTimeout);
    })
  ]);
  if (settings && settings.data && settings.data.last_processed_block) {
    return settings.data.last_processed_block;
  }
      
  if (process.env.DEMUX_HEAD_BLOCK) {
    return process.env.DEMUX_HEAD_BLOCK;
  }

  return process.env.DAPPSERVICES_GENESIS_BLOCK || 1;
}

async function getHeadBlockInfo() {
  const nodeosHost = process.env.NODEOS_HOST || 'localhost';
  const nodeosPort = process.env.NODEOS_PORT || 8888;
  const nodeosUrl = 
    `http${process.env.NODEOS_SECURED === 'true' ? 's' : ''}://${nodeosHost}:${nodeosPort}`;

  const res = await fetch(nodeosUrl + '/v1/chain/get_info', {
    method: 'post',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  })
  const blockInfo = await res.json();
  return blockInfo;
}

// NOTE: This method allows us to calculate a block's timestamp without
// having the specific block stored. We calculate the timestamp of the genesis
// block using the block_num and block_time of any block, then afterwards
// deterministically calculate the timestamp as genesisTimestamp + 0.5*blocknum
async function getBlockTimestamp(blockNum) {
  if (!genesisTimestampMs) {
    let info = await getHeadBlockInfo();
    // convert to UTC
    let ts = info.head_block_time.slice(-1) == 'Z' ? info.head_block_time : `${info.head_block_time}Z`;
    genesisTimestampMs = 
      (new Date(ts)).getTime() - (500 * (info.head_block_num - 1))
    logger.info(`calculated genesis block timestamp (ms): ${genesisTimestampMs}`);
  }
  return genesisTimestampMs + (500 * (blockNum - 1)); // genesis block is 1 not 0
}



