require("dotenv").config();
const fetch = require('node-fetch');
const { Serialize } = require('eosjs');
const { TextDecoder, TextEncoder } = require('text-encoding');
const { hexToUint8Array, arrayToHex } = Serialize;
const fs = require('fs');

const account = process.env.ACCOUNT || 'moonlight.co';
const batchSize = parseInt(process.env.BATCH_SIZE || "10");
// support multiple endpoints
const dspEndpoints = (process.env.DSP_ENDPOINTS || 'http://127.0.0.1:13015').split(',');

async function populateIpfs(endpoint, hexData) {
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
  const txId = genRandomId();
  const meta = {
    txId,
    blockNum: 1,
    eventNum: 1
  }
  const body = {
    'receiver': 'dappservices',
    'method': 'usage',
    'account': 'dappservices',
    'data': {
      'usage_report': {
        'quantity': '0.0001 QUOTA',
        'provider': '',
        'payer': account,
        'service': 'ipfsservice1',
        'package': 'default',
        'success': 0
      }
    },
    'event': { 'version': '1.0', 'etype': 'service_request', 'payer': account, 'service': 'ipfsservice1', 'action': 'commit', 'provider': '', 'data': base64data, 'meta': meta },
    'meta': {
      'block_num': 170,
      'block_time': '2019-03-21T10:35:03.500',
      'elapsed': 275,
      'trx_id': txId,
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
    'replay': true
  };
  // console.log(base64data);
  // console.log(origBuffer, bytes.length);
  let r = await fetch(`${endpoint}/event`, { method: 'POST', body: JSON.stringify(body) });
  console.log(await r.text());
}

function chunk(arr, len) {
  var chunks = [];
  var i = 0;
  var n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }

  return chunks;
}

const genRandomId = () => Array.apply(null, { length:64 }).map(Function.call, () => Math.floor(9*Math.random())).join('') 

async function main() {
  const ipfsData = JSON.parse(fs.readFileSync(`./ipfs-data.json`));
  let rawIpfsData = [];
  Object.keys(ipfsData).forEach(key => {
    rawIpfsData.push(ipfsData[key]);
  })
  let chunkedData = chunk(rawIpfsData, batchSize);
  while (chunkedData.length) {
    const batch = chunkedData.shift();
    // Promisception
    await Promise.all(batch.map(hexData => Promise.all(dspEndpoints.map(endpoint => populateIpfs(endpoint, hexData)))));
  }
}

main().catch(console.log);