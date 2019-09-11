require('babel-core/register');
require('babel-polyfill');

const contractAccount = process.env.CONTRACT;
const { getEosWrapper } = require('./extensions/tools/eos/eos-wrapper');
const fetch = require('node-fetch');
const endpoint = `http${process.env.NODEOS_SECURED == 'true' ? 's' : ''}://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_PORT || '13115'}`;
const url = `${endpoint}/event`;
const { Serialize } = require('./services/demux/eosjs2');
const { TextDecoder, TextEncoder } = require('text-encoding');
const { hexToUint8Array, arrayToHex } = Serialize;

var eosconfig = {
  expireInSeconds: 1200,
  sign: true,
  httpEndpoint: endpoint,
  chainId: process.env.NODEOS_CHAINID
};

const toHHMMSS = function(sec_num) {
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours < 10) { hours = '0' + hours; }
  if (minutes < 10) { minutes = '0' + minutes; }
  if (seconds < 10) { seconds = '0' + seconds; }
  return hours + ':' + minutes + ':' + seconds;
};

var cnt = 0;
var totalSize = 0;
var eosPrivate = getEosWrapper(eosconfig);
var start = new Date();
var remaining = 1.0 * 1024 * 1024;
var remainingTime;
var passedTime;
var speed;
async function clean(hexData) {
  if (hexData.length == 0) { return; }
  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
  });
  const origBuffer = hexToUint8Array(hexData);
  // buffer.pushVaruint32(origBufffer.length);
  buffer.pushBytes(origBuffer);
  buffer.restartRead();
  var bytes = buffer.getUint8Array(buffer.length);
  const res = arrayToHex(bytes);
  const base64data = Buffer.from(res, 'hex').toString('base64');
  const body = {
    'receiver': 'dappservices',
    'method': 'usage',
    'account': 'dappservices',
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
    'event': { 'version': '1.0', 'etype': 'service_request', 'payer': contractAccount, 'service': 'ipfsservice1', 'action': 'commit', 'provider': '', 'data': base64data },
    'meta': {
      'block_num': 170,
      'block_time': '2019-03-21T10:35:03.500',
      'elapsed': 275,
      'trx_id': '79936d0e3f2767c0fc176b90a69585d8b8334dd0c4efbb549ae3295993048e28',
      'receipt': {
        'receiver': 'dappservices',
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
    'replay': false
  };
  // console.log(base64data);
  // console.log(origBuffer, bytes.length);
  var r = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
  console.log(await r.text());
  totalSize += (hexData.length / 2) + 320;
  var pcnt = (totalSize / remaining);
  if (++cnt % 5 == 0) {
    passedTime = (new Date().getTime() - start.getTime()) / 1000.0;
    remainingTime = passedTime / pcnt;
    speed = (totalSize / (1024 * passedTime)).toFixed(2);
  }
  if (remainingTime) {
    process.stdout.write('\r');
    process.stdout.write(`sent ${thelowest} ${cnt} evicted ${(totalSize / (1024)).toFixed(2)}KB ${speed}KB/s ${(pcnt * 100.0).toFixed(2)}% remaining: ${toHHMMSS(remainingTime.toFixed(0))}`);
  }
}
var thelowest = 0;

function chunk(arr, len) {
  var chunks = [];
  var i = 0;
  var n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }

  return chunks;
}

async function run(lower_bound) {
  lower_bound = lower_bound || 0;
  var res = await eosPrivate.getTableRows({
    'json': true,
    'scope': contractAccount,
    'code': contractAccount,
    'table': 'ipfsentry',
    'lower_bound': lower_bound,
    'limit': 100
  });
  if (res.rows.length == 0) { return; }
  var lowest = res.rows.find(a => a.data !== '');
  thelowest = lowest ? lowest.id : '0';
  // console.log("\nlower_bound", lower_bound, lowest ? lowest.id : "0");
  var chunks = chunk(res.rows, 1);
  for (var i = chunks.length; i--;) {
    var entries = chunks[i];
    // console.log(entries);
    await Promise.all(entries.map(a => {
      return clean(a.data);
    }));
  }
  if (res.more) {
    return run(res.rows[res.rows.length - 1].id);
  }
  // console.log(url);
}
run().then(a => {
  console.log(a);
});
