#!/usr/bin/env node

const { Serialize } = require('eosjs');
const { TextDecoder, TextEncoder } = require('text-encoding');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const pako = require('pako');
const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const { getAbis, getAbiAbi } = require('./state_history_abi');
const logger = requireBox('log-extensions/helpers/logger');
const dal = requireBox('dapp-services/services/dapp-services-node/dal/dal');

const sidechainName = process.env.SIDECHAIN;
const nodeosWebsocketPort = process.env.NODEOS_WEBSOCKET_PORT || '8887';
const nodeosHost = process.env.NODEOS_HOST || 'localhost';
const nodeosRpcPort = process.env.NODEOS_PORT || '8888';
const nodeosUrl =
  `http${process.env.NODEOS_SECURED === 'true' || process.env.NODEOS_SECURED === true ? true : false ? 's' : ''}://${nodeosHost}:${nodeosRpcPort}`;
const serviceResponseTimeout = parseInt(process.env.SERVICE_RESPONSE_TIMEOUT_MS || 1000000);
const maxPendingMessages = parseInt(process.env.DEMUX_MAX_PENDING_MESSAGES || 5000);
const processBlockCheckpoint = parseInt(process.env.DEMUX_PROCESS_BLOCK_CHECKPOINT || 1000);

let abis = getAbis();
let abiabi = getAbiAbi();
let c2 = 0;
let types;
let head_block = 0;
let current_block = 0;
let pending = [];
let genesisTimestampMs;
let sidechain = null;
let capturedEvents;
const loadEvents = async () => {
  if (!capturedEvents) {
    capturedEvents = {};
    let capturedEventsModels = await loadModels('captured-events');
    let sidechains = await loadModels('eosio-chains');
    if (sidechainName) {
      sidechain = sidechains.find(a => a.name === sidechainName);
    }

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
    else if (account == 'eidosonecoin' || code == 'eidosonecoin' || account == 'gravyhftdefi' || code == 'gravyhftdefi') { // 
      // console.log(`new account: ${actData.name}`);
    }
    else if (method == 'setabi') {
      const localTypes = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abiabi);
      const buf = Buffer.from(actData.abi, 'hex');
      const buffer = new Serialize.SerialBuffer({
        textEncoder: new TextEncoder(),
        textDecoder: new TextDecoder()
      });
      buffer.pushArray(Serialize.hexToUint8Array(actData.abi));

      const abi = localTypes.get('abi_def').deserialize(buffer);
      abis[actData.account] = abi;
      // logger.debug(`setabi for ${actData.account} - updating Serializer`);
    }
    return eventNum;
    // else
    //     console.log("system", account,method,code,actData, events);
  },
  '*': {
    '*': {
      '*': async (txid, account, method, code, actData, event, eventNum, blockInfo, cbevent) => {
        // load from model.

        let events = await loadEvents();
        let curr = events;
        logger.info(`handling ${txid} ${eventNum} ${account} ${code} ${JSON.stringify(event)} ${method} ${cbevent}`);

        if (!curr[event.etype]) return eventNum;
        if (account == 'eidosonecoin' || code == 'eidosonecoin' || account == 'gravyhftdefi' || code == 'gravyhftdefi') { // 
          // console.log(`new account: ${actData.name}`);
          return eventNum;
        }
        curr = curr[event.etype];
        if (!curr[code]) { curr = curr['*']; }
        else { curr = curr[code]; }
        if (!curr) return eventNum;

        if (!curr[method]) { curr = curr['*']; }
        else { curr = curr[method]; }
        if (curr) {
          const url = `http://localhost:${process.env.WEBHOOK_DAPP_PORT || 8812}`;
          event.meta = {
            txId: txid,
            blockNum: blockInfo.number,
            timestamp: blockInfo.timestamp,
            blockId: blockInfo.id,
            sidechain,
            eventNum,
            cbevent
          }
          const promRes = fetch(url, {
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
          // call webhook
          const r = await Promise.race([
            promRes,
            new Promise((resolve, reject) => {
              setTimeout(() => reject('service response timeout for event', JSON.stringify(event)), serviceResponseTimeout);
            })
          ])
          const resText = await r.text();
          // logger.debug(`fired hooks: ${account} ${method} ${JSON.stringify(event, null, 2)} ${code}`);
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
    logger.error(`Depth exceeded capacity: ${depth}`)
    return;
  }

  var key = account;
  if (depth == 2) {
    key = events;
    if (Array.isArray(events)) {
      for (var i = 0; i < events.length; i++) {
        var currentEvent = events[i];
        var eventType = currentEvent.etype;
        // logger.info(`event ${currentEvent.etype} | DSP ${currentEvent.provider} | payer :${currentEvent.payer} | service :${currentEvent.service} | action :${currentEvent.action} | package :${currentEvent.package} | data :${currentEvent.data}`);
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
    catch (e) { }
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

function deserializeStateHisData(data) {
  const buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder(),
    array: data
  });
  const desData = types.get('result').deserialize(buffer);
  return desData;
}

let last_processed_block = 0;
async function messageHandler(data) {
  //logger.info(JSON.stringify(data))
  head_block = data[1].head.block_num;
  const block_id = data[1].head.block_id;
  if (!data[1].traces) {
    logger.warn(`No traces detected, is trace-history = true enabled in nodeos config?`);
    return;
  }
  var traces = Buffer.from(data[1].traces, 'hex');
  current_block = data[1].this_block.block_num;
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
    if (current_block - last_processed_block >= processBlockCheckpoint) {
      await setDatabaseBlockNumber(current_block);
      last_processed_block = current_block;
      logger.info("Updated database with current block: %s", current_block);
    }

  }
  catch (e) {
    logger.error(e);
  }
}

var retries = 0;
async function watchMessages() {

  const messageAmount = pending.length;
  if (messageAmount > 0) {
    if (messageAmount < maxPendingMessages / 2) {
      startDemux();
    }
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

let ws, abi;
let expectingABI = true;
let heartBeat = Math.floor(Date.now() / 1000);
let paused = false;
let processingMessages = false;
let last_received_block = 0;
const connect = () => {
  ws = new WebSocket(`ws://${nodeosHost}:${nodeosWebsocketPort}`, {
    perMessageDeflate: false
  });
  ws.on('open', function open() {
    expectingABI = true;
    logger.info('ws connected');
  });
  ws.on('error', function (err) {
    logger.warn(`websocket error: ${err.message}`);
  });
  ws.on('close', function () {
    if (!paused) {
      logger.warn('websocket closed and not paused');
      setTimeout(connect, 1000); //hardcoded interval
      return;
    }
    logger.info('websocket closed.');
  });
  ws.on('message', async function incoming(data) {
    if (paused) {
      return;
    }
    //start pushing messages after we received the ABI
    if (!expectingABI) {
      const desData = deserializeStateHisData(data);
      // received incomplete message, ignore
      if (!desData || !desData[1] || !desData[1].this_block) return;
      pending.push(desData);
      last_received_block = desData[1].this_block.block_num;
      let currTime = Math.floor(Date.now() / 1000);
      if ((currTime - heartBeat) >= 15) { //heartbeat every 15 seconds
        heartBeat = currTime;
        const head_block_to_current_difference = (await getHeadBlockInfo()).head_block_num - current_block;
        logger.info("Demux heartbeat - Processed Block: %s | Pending Messages: %s | Blocks Behind Head Block: %s", current_block, pending.length, head_block_to_current_difference);
      }
      if (pending.length >= maxPendingMessages) {
        logger.warn(`reached maximum amount of pending messages: ${maxPendingMessages}`);
        await pauseDemux();
      }
      return;
    }

    // logger.info('got abi');
    abi = JSON.parse(data);
    types = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abi);

    const buffer = new Serialize.SerialBuffer({
      textEncoder: new TextEncoder(),
      textDecoder: new TextDecoder()
    });

    let start_block_num = 0;
    try {
      start_block_num = await getStartingBlockNumber();
    }
    catch (e) {
      logger.error(`Error getting starting block number: ${JSON.stringify(e)}`);
      throw e;
    }
    if (last_received_block) {
      // if last_received_block is defined the process
      // stopped due to too many pending messages, start from there
      start_block_num = last_received_block + 1;
    }
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
    if (!processingMessages) {
      processingMessages = true;
      watchMessages();
    }
  });
}
connect();

async function pauseDemux() {
  if (paused) return;
  logger.info('pausing demux processing.');
  paused = true;
  await ws.close();
}

function startDemux() {
  if (!paused) return;
  logger.info('resuming demux processing.');
  paused = false;
  connect();
}

async function setDatabaseBlockNumber(blockNum) {
  const newSettings = {};
  if (sidechainName) { newSettings[sidechainName] = { last_processed_block: blockNum } }
  else { newSettings.last_processed_block = blockNum };
  await dal.updateSettings(newSettings);
}

async function getDatabaseBlockNumber() {
  const settings = await dal.getSettings();
  if (sidechainName) {
    if (settings && settings.data && settings.data[sidechainName] && settings.data[sidechainName].last_processed_block)
      return settings.data[sidechainName].last_processed_block;
  }
  else {
    if (settings && settings.data && settings.data.last_processed_block)
      return settings.data.last_processed_block;
  }
}

async function getNonDatabaseStartBlock() {
  if (process.env.DEMUX_HEAD_BLOCK && process.env.DEMUX_HEAD_BLOCK !== "0") {
    return process.env.DEMUX_HEAD_BLOCK;
  }

  const headBlock = await getHeadBlockInfo();
  return headBlock.head_block_num;
}

async function getStartingBlockNumber() {
  if (process.env.DEMUX_BYPASS_DATABASE_HEAD_BLOCK === 'true' || process.env.DEMUX_BYPASS_DATABASE_HEAD_BLOCK === true) {
    return getNonDatabaseStartBlock();
  }
  const res = await getDatabaseBlockNumber();
  if (res) return res;
  return getNonDatabaseStartBlock();
}

async function getHeadBlockInfo() {
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
