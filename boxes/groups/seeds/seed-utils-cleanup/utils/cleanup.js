const { requireBox } = require('@liquidapps/box-utils');
const { genRandomId } = requireBox('seed-eos/tools/eos/utils');
const fetch = require('node-fetch');
const { Serialize } = require('eosjs');
const { hexToUint8Array, arrayToHex } = Serialize;
const { TextDecoder, TextEncoder } = require('text-encoding');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

const contractAccount = process.env.CONTRACT;
const endpoint = process.env.DSP_ENDPOINT || 'http://127.0.0.1:13015';
const chunkSize = parseInt(process.env.CHUNK_SIZE || 5);
const url = `${endpoint}/event`;
const eosPrivate = getEosWrapper({ httpEndpoint: endpoint });

let totalSize = 0;
let cnt = 0;
let start = new Date();
let passedTime, speed;
async function clean({ hexData, url, contractAccount, service, action, replay, rollback }) {
  //console.log( hexData, url, contractAccount, service, action, replay, rollback )
  if (hexData.length == 0) { return; }
  const buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
  });
  const origBuffer = hexToUint8Array(hexData);
  // buffer.pushVaruint32(origBufffer.length);
  buffer.pushBytes(origBuffer);
  buffer.restartRead();
  const bytes = buffer.getUint8Array(buffer.length);
  const res = arrayToHex(bytes);
  const base64data = Buffer.from(res, 'hex').toString('base64');
  const txId = genRandomId();
  const meta = { txId, blockNum: 1, eventNum: 1 };
  const body = {
    'receiver': 'dappservices',
    'method': 'usage',
    'account': 'dappservices',
    'data': {
      'usage_report': {
        'quantity': '0.0001 QUOTA',
        'provider': '',
        'payer': contractAccount,
        service,
        'package': 'default',
        'success': 0
      }
    },
    'event': { 'version': '1.0', 'etype': 'service_request', 'payer': contractAccount, service, action, 'provider': '', 'data': base64data, meta },
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
            service,
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
    replay,
    rollback
  };
  let r = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
  totalSize += (hexData.length / 2) + 320;
  if (++cnt % 5 == 0) {
    passedTime = (new Date().getTime() - start.getTime()) / 1000.0;
    speed = (totalSize / (1024 * passedTime)).toFixed(2);
  }
  console.log(`evicted ${(totalSize / (1024)).toFixed(2)}KB ${speed}KB/s`);
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

// returns next lower bound
async function cleanup({ contractAccount, table, lower_bound, dataKey, service, action, replay, rollback }) {
  lower_bound = lower_bound || 0;
  let res = await eosPrivate.getTableRows({
    'json': true,
    'scope': contractAccount,
    'code': contractAccount,
    table,
    lower_bound,
    'limit': 100
  });
  if (res.rows.length == 0) { return 'done'; }
  let data = res.rows.map(row => row[dataKey]);
  let chunks = chunk(data, chunkSize);
  for (let i = chunks.length; i--;) {
    let entries = chunks[i];
    await Promise.all(entries.map(hexData => clean({ hexData, url, contractAccount, service, action, replay, rollback })));
  }
  if (res.more) {
    lower_bound = res.rows[res.rows.length - 1].id;
    return cleanup({ contractAccount, table, lower_bound, dataKey, service });
  }
}

async function main() {
  if (!contractAccount)
    throw new Error('must define CONTRACT_ACCOUNT');

  let table;
  const tableConfig = {
    'ipfsentry': {
      dataKey: 'data',
      service: 'ipfsservice1',
      action: 'commit'
    },
    'oracleentry': {
      dataKey: 'uri',
      service: 'oracleservic',
      action: 'geturi',
      rollback: true
    }
  }
  const abi = await eosPrivate.getAbi(contractAccount);
  table = process.env.TABLE || abi.tables.find(table => Object.keys(tableConfig).includes(table.name)).name;

  const { dataKey, service, action, rollback, replay } = tableConfig[table];
  await cleanup({ contractAccount, table, dataKey, service, action, replay, rollback });
}

main().catch(console.log);
