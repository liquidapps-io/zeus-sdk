const { requireBox } = require('@liquidapps/box-utils');
const { genRandomId } = requireBox('seed-eos/tools/eos/utils');
const fetch = require('node-fetch');
const { Serialize } = require('eosjs');
const { hexToUint8Array, arrayToHex } = Serialize;
const { TextDecoder, TextEncoder } = require('text-encoding');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const logger = requireBox('log-extensions/helpers/logger');
const { getLinkedAccount } = requireBox('dapp-services/services/dapp-services-node/common');
const sidechainName = process.env.SIDECHAIN;

//dfuse settings
const mainnetDfuseEnable = process.env.DFUSE_PUSH_ENABLE || false;
const mainnetDfuseGuarantee = process.env.DFUSE_PUSH_GUARANTEE || 'in-block';
const mainnetDfuseApiKey = process.env.DFUSE_API_KEY || '';
const mainnetDfuseNetwork = process.env.DFUSE_NETWORK || 'mainnet.eos.dfuse.io';

const contractAccount = process.env.CONTRACT;
const endpoint = process.env.DSP_ENDPOINT || 'http://127.0.0.1:13015';
const chunkSize = parseInt(process.env.CHUNK_SIZE || 5);
const url = `${endpoint}/event`;

const WebSocketClient = require("ws");
const { createDfuseClient } = require("@dfuse/client");

const webSocketFactory = async (url, protocols) => {
  const webSocket = new WebSocketClient(url, protocols, {
    handshakeTimeout: 30 * 1000, // 30s
    maxPayload: 200 * 1024 * 1000 * 1000 // 200Mb
  })

  const onUpgrade = (response) => {
    console.log("Socket upgrade response status code.", response.statusCode)

    // You need to remove the listener at some point since this factory
    // is called at each reconnection with the remote endpoint!
    webSocket.removeListener("upgrade", onUpgrade)
  }

  webSocket.on("upgrade", onUpgrade)

  return webSocket
}

const client = mainnetDfuseApiKey ? createDfuseClient({ apiKey: mainnetDfuseApiKey, network: mainnetDfuseNetwork,
  httpClientOptions: {
    fetch
  },
  graphqlStreamClientOptions: {
    socketOptions: {
      // The WebSocket factory used for GraphQL stream must use this special protocols set
      // We intend on making the library handle this for you automatically in the future,
      // for now, it's required otherwise, the GraphQL will not connect correctly.
      webSocketFactory: (url) => webSocketFactory(url, ["graphql-ws"]),
      reconnectDelayInMs: 250 // document every 5s
    }
  },
  streamClientOptions: {
    socketOptions: {
      webSocketFactory: (url) => webSocketFactory(url)
    }
  }
}): '';

const getDfuseJwt = async () => {
  const jwtApiKey = await client.getTokenInfo();
  return jwtApiKey.token
}

const eosMainnet = async () => {
  const mainnetConfig = {
    httpEndpoint: endpoint,
    dfuseEnable: mainnetDfuseEnable,
    dfuseGuarantee: mainnetDfuseGuarantee,
    dfusePushApiKey: mainnetDfuseApiKey ? await getDfuseJwt() : '',
    dfuseNetwork: mainnetDfuseNetwork
  }
  return getEosWrapper(mainnetConfig);
}

let totalSize = 0;
let cnt = 0;
let start = new Date();
let passedTime, speed;
async function clean({ hexData, url, contractAccount, service, action, replay, rollback }) {
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
  const meta = { txId, blockNum: 1, eventNum: 1,   };
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
        service,
        'package': 'default',
        'success': true
      }
    },
    'event': { 'version': '1.0', 'etype': 'service_request', 'payer': contractAccount, service, action, 'provider': '', 'data': base64data, meta },
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
  await fetch(url, { method: 'POST', body: JSON.stringify(body) });
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
async function cleanup(eosPrivate, { contractAccount, table, lower_bound, dataKey, service, action, replay, rollback }) {
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
    return cleanup(eosPrivate, { contractAccount, table, lower_bound, dataKey, service, action, replay, rollback });
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
  const eosPrivate = await eosMainnet();
  const abi = await eosPrivate.getAbi(contractAccount);
  table = process.env.TABLE || abi.tables.find(table => Object.keys(tableConfig).includes(table.name)).name;
  const { dataKey, service, action, rollback, replay } = tableConfig[table];
  await cleanup(eosPrivate, { contractAccount, table, dataKey, service, action, replay, rollback });
}

main().catch(console.log);
