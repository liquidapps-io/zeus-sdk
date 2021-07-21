const { requireBox } = require('@liquidapps/box-utils');
const { JsonRpc } = require('dfuse-eoshttp-js');
const fetch = require('node-fetch');
const { Serialize } = require('eosjs');
const { TextDecoder, TextEncoder } = require('text-encoding');
const { hexToUint8Array, arrayToHex } = Serialize;
const { genRandomId } = requireBox('seed-eos/tools/eos/utils');
const { getLinkedAccount } = requireBox('dapp-services/services/dapp-services-node/common');

const contractAccount = process.env.CONTRACT || '';
const endpoint = process.env.DSP_ENDPOINT || '';
let lastBlock = process.env.LAST_BLOCK || 35000000;
const token = process.env.DFUSE_API_KEY || '';
const dfuse_endpoint = process.env.DFUSE_ENDPOINT || 'mainnet.eos.dfuse.io';
const sidechainName = process.env.SIDECHAIN;
let rpc = new JsonRpc(`https://${dfuse_endpoint}`, { fetch, token });
const url = `${endpoint}/event`;
if(!token) throw new Error(`must set DFUSE_API_KEY`);
if(!endpoint) throw new Error(`must set DSP_ENDPOINT`);
if(!contractAccount) throw new Error(`must set CONTRACT`);
let res;

const handleTrace = async(action_trace) => {
  res.push(action_trace);
};
const searchQuery = `receiver:${contractAccount}`;

const handleTraces = async(action_trace) => {
  await handleTrace(action_trace);
  if (!action_trace.inline_traces) { return; }
  for (var i = 0; i < action_trace.inline_traces.length; i++) { await handleTraces(action_trace.inline_traces[i]); }
};

const handleSingleTrx = async(trx) => {
  for (var i = 0; i < trx.execution_trace.action_traces.length; i++) { await handleTraces(trx.execution_trace.action_traces[i]); }
};
const getTransactions = async(handle, startat, cursor) => {
  var response;
  try {
    response = await rpc.search_transactions(searchQuery, { start_block: startat, sort: 'asc', cursor, limit: 100 });
  } catch (e) {
    console.log(e);
    e.response.body.pipe(process.stdout);
    return;
  }
  if (!response.transactions || response.transactions.length === 0) { return; }
  for (var i = 0; i < response.transactions.length; i++) {
    const trx = response.transactions[i];
    await handle(trx.lifecycle);
  }

  if (response.cursor) { await getTransactions(handle, startat, response.cursor); }
};
var cnt = 0;
var totalSize = 0;
var start = new Date();
var passedTime;
var speed;
async function replay(hexData) {
  if (hexData.length == 0) { return; }
  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
  });
  const origBuffer = hexToUint8Array(hexData);
  buffer.pushBytes(origBuffer);
  buffer.restartRead();
  var bytes = buffer.getUint8Array(buffer.length);
  const res = arrayToHex(bytes);
  const base64data = Buffer.from(res, 'hex').toString('base64');
  const txId = genRandomId();
  const meta = { txId, blockNum: 1, eventNum: 1 };
  if(sidechainName) {
    meta.sidechain = {
      "dsp_port": process.env.SIDECHAIN_DSP_PORT,
      "nodeos_endpoint": `${process.env.NODEOS_MAINNET_ENDPOINT}`,
      "name": sidechainName
    }
  }
  const dappservicesContract = sidechainName ? await getLinkedAccount(null, null, `dappservices`, sidechainName) : `dappservices`;
  const actionName = sidechainName ? 'usagex' : 'usage';
  const body = {
    'receiver': dappservicesContract,
    'method': actionName,
    'account': contractAccount,
    'data': {
      'usage_report': {
        'quantity': '0.0001 QUOTA',
        'provider': '',
        'payer': contractAccount,
        'service': 'ipfsservice1',
        'package': 'default',
        'success': 0
      }
    },
    'event': { 'version': '1.0', 'etype': 'service_request', 'payer': contractAccount, 'service': 'ipfsservice1', 'action': 'commit', 'provider': '', 'data': base64data, 'meta': meta },
    'meta': {
      'block_num': 170,
      'block_time': '2019-03-21T10:35:03.500',
      'elapsed': 275,
      'trx_id': txId,
      'receipt': {
        'receiver': dappservicesContract,
        'act_digest': '77f94e3cda1c581b9733654e649f2e970212749a3946c9bf1e2b1fbbc2a74247',
        'global_sequence': 684,
        'recv_sequence': 94,
        'auth_sequence': [
          [
            'ipfsservice1',
            172
          ]
        ],
        'code_sequence': 1,
        'abi_sequence': 3
      },
      'context_free': false,
      'producer_block_id': null,
      'account_ram_deltas': [],
      'except': null
    },
    'replay': true
  };
  var r = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
  (await r.text());
  totalSize += (hexData.length / 2) + 320;
  if (++cnt % 5 == 0) {
    passedTime = (new Date().getTime() - start.getTime()) / 1000.0;
    speed = (totalSize / (1024 * passedTime)).toFixed(2);
  }
  process.stdout.write('\r');
  process.stdout.write(`sent ${cnt} saved ${(totalSize / (1024)).toFixed(2)}KB ${speed}KB/s Block:${lastBlock}                    `);
}
var c = 0;

function chunk(arr, len) {
  var chunks = [];
  var i = 0;
  var n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }

  return chunks;
}
var resArr = [];
var tempToken = null;
async function run (lower_bound) {
  const response = await rpc.auth_issue(token);
  tempToken = response.token;
  rpc = new JsonRpc(`https://${dfuse_endpoint}`, { fetch, token: tempToken });
  while (true) {
    var found = false;

    await getTransactions(async trx => {
      const curLastBlock = parseInt(trx.execution_trace.block_num);
      if (curLastBlock >= lastBlock) { lastBlock = curLastBlock + 1; }
      await handleSingleTrx(trx);
      found = true;
      const ares = res.map(a => a.console).filter(a => a !== '');
      res = [];
      var events = [];
      ares.forEach(a => {
        a.split('\n').forEach(line => {
          try {
            const event = JSON.parse(line);
            events.push(event);
          }
          catch (e) {}
        });
      });
      var commits = events.filter(a => a.etype === 'service_request' && a.service === 'ipfsservice1' &&
        (a.action === 'commit' || a.action === 'cleanup')).map(a => a.data);
      commits = [...new Set(commits)];

      var chunks = chunk(commits, 5);
      for (var i = chunks.length; i--;) {
        var entries = chunks[i];
        await Promise.all(entries.map(a => {
          return replay(Buffer.from(a, 'base64').toString('hex'));
        }));
      }
    }, lastBlock);
    if (!found) { break; }
  }
  if (res.more) {
    console.log('\nhave more');
    return run(res.rows[res.rows.length - 1].id);
  }
}
run().then(a => {
  console.log(a);
});