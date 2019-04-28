#!/usr/bin/env node

const { loadModels } = require('../../../extensions/tools/models');
const fetch = require('node-fetch');
const zmq = require('zeromq');

console.log('ZMQ connecting');
var ztype = process.env.SOCKET_MODE || 'sub';
const sock = zmq.socket(ztype);
sock.connect(`tcp://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_ZMQ_PORT || '5557'}`);
if (ztype == 'sub') { sock.subscribe('action_trace'); }

var first = true;
console.log('ZMQ connected');
var i = 0;
sock.on('message', async (data) => {
  if (first) {
    console.log('Got first message');
    first = false;
  }
  if (typeof (data) !== 'string') {
    data = data.toString();
    if (data.indexOf('action_trace-') != 0) { return; }
    data = data.substr('action_trace-'.length);
  }
  if (++i % 100 == 0) { console.log(`processed: ${i / 100}`); }
  var res;
  try {
    res = JSON.parse(data);
  } catch (e) {
    console.log(data, e);
    return;
  }
  switch (res.type) {
    case 'accepted_block':
      break;
    case 'action_trace':
      const body = res[res.type];
      await actionHandler(body['action_trace']);
      break;
    case 'irreversible_block':
      break;
    case 'failed_tx':
      break;
    default:
      console.log(res.type);
  }
});

let capturedEvents;
const loadEvents = async () => {
  if (!capturedEvents) {
    capturedEvents = {};
    const capturedEventsModels = await loadModels('captured-events');
    capturedEventsModels.forEach(a => {
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

const handleWebHooks = async (payload) => {
  let { account, method, code, actData, event, meta } = payload;
  // console.log(account, method, code, actData, meta);
  let curr = await loadEvents();
  if (!curr[event['etype']]) return;
  curr = curr[event['etype']];
  // console.log(event);
  if (!curr[code]) { curr = curr['*']; } else { curr = curr[code]; }
  if (!curr) return;

  if (!curr[method]) { curr = curr['*']; } else { curr = curr[method]; }
  if (curr) {
    Promise.all(curr.map(async url => {
      if (process.env.WEBHOOKS_HOST) {
        url = url.replace('http://localhost:', process.env.WEBHOOKS_HOST);
      }
      try {
        const r = await fetch(url, {
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            receiver: account,
            method,
            account: code,
            data: actData,
            event,
            meta
          })
        });

        return r.text();
      } catch (e) {
        console.log('failed calling webhook', e);
      }
    }));
    // console.log("fired hooks:", account, method, event, code);
  }
};
const handlers = {
  '*': async (payload) => {
    const { events } = payload;
    const fireEvents = [{ etype: 'action' }, ...events];
    for (var i = 0; i < fireEvents.length; i++) {
      var event = fireEvents[i];
      await handleWebHooks({ ...payload, event });
    }
  }
};

async function recursiveHandle (payload, depth = 0, currentHandlers = handlers) {
  if (depth === 3) { return; }
  let { account, method, code, events } = payload;
  let key = account;
  if (depth === 2) {
    key = events;
    if (Array.isArray(key)) {
      for (const currentEvent of key) {
        if (!currentEvent['etype']) { continue; }
        await recursiveHandle({ ...payload, events: currentEvent }, depth, currentHandlers);
      }
      return;
    }
    key = events['etype'];
  }
  if (depth === 1) {
    key = method;
  }
  let subHandler = currentHandlers[key];
  if (!subHandler && depth === 0) {
    key = code;
    subHandler = currentHandlers[key];
  }
  if (!subHandler) { subHandler = currentHandlers['*']; }

  if (subHandler) {
    if (typeof subHandler === 'function') {
      return await subHandler(payload);
    } else if (typeof subHandler === 'object') {
      return recursiveHandle(payload, depth + 1, subHandler);
    } else {
      console.log(`got action: ${code}.${method} ${account === code ? '' : `(${account})`} - ${JSON.stringify(events)}`);
    }
  } else {
    console.log(`no handler for action: ${code}.${method} ${account === code ? '' : `(${account})`} - ${JSON.stringify(events)}`, currentHandlers, key);
  }
}

async function parseEvents (text) {
  return text.split('\n').map(a => {
    if (a === '') { return null; }
    try {
      return JSON.parse(a);
    } catch (e) {}
  }).filter(a => a);
}

async function actionHandler (action) {
  const events = await parseEvents(action['console']);
  // console.log("action", action);
  await recursiveHandle({
    account: action['receipt']['receiver'],
    method: action['act']['name'],
    code: action['act']['account'],
    actData: action['act']['data'],
    events: events,
    meta: {
      block_num: action.block_num,
      block_time: action.block_time,
      elapsed: action.elapsed,
      trx_id: action.trx_id,
      receipt: action.receipt,
      context_free: action.context_free,
      producer_block_id: action.producer_block_id,
      account_ram_deltas: action.account_ram_deltas,
      except: action.except
    }
  });
  for (const inline_trace of action['inline_traces']) {
    await actionHandler(inline_trace);
  }
}
