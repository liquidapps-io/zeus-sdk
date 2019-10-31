const { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const fetch = require('node-fetch');
const { getUrl } = require('../../extensions/tools/eos/utils');
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');

const url = getUrl(getDefaultArgs());

function split2(str, separator, limit) {
  limit--;
  str = str.split(separator);

  if (str.length > limit) {
    const ret = str.splice(0, limit);
    ret.push(str.join(separator));

    return ret;
  }

  return str;
}
const httpGetHandler = async({ proto, address }) => {
  proto = proto.split("+")[0];
  const r = await fetch(`${proto}://${address}`, { method: 'GET' });
  return Buffer.from(await r.text());
};

const httpPostHandler = async({ proto, address }) => {
  const parts = split2(address, '/', 2);
  const body = Buffer.from(parts[0], 'base64').toString();
  address = parts[1];
  proto = proto.split("+")[0];
  const r = await fetch(`${proto}://${address}`, { method: 'POST', body });
  return Buffer.from(await r.text());
};
const httpGetHandlerJSON = async({ proto, address }) => {
  const parts = split2(address, '/', 2);
  const field = parts[0];
  const urlPart = parts[1];
  proto = proto.split("+")[0];
  const r = await fetch(`${proto}://${urlPart}`, { method: 'GET' });
  const item = await r.json();

  return extractPath(item, field);
};

const httpPostHandlerJSON = async({ proto, address }) => {
  const parts = split2(address, '/', 3);
  const body = Buffer.from(parts[1], 'base64').toString();
  const field = parts[0];
  const urlPart = parts[2];
  proto = proto.split("+")[0];
  const r = await fetch(`${proto}://${urlPart}`, { method: 'POST', body });
  const item = await r.json();
  return extractPath(item, field);
};

const wolframAlphaHandler = async({ proto, address }) => {
  // mock for tests:
  if (address == 'What is the average air speed velocity of a laden swallow?') { return Buffer.from('What do you mean, an African or European Swallow?'); }
  return await httpGetHandler({ proto: 'http', address: `api.wolframalpha.com/v1/result?i=${escape(address)}&appid=${process.env.WOLFRAM_APP_ID || 'DEMO'}` });
};
const historyHandler = async({ proto, address }) => {
  //  self_history://account/pos/offset/inner_offset/field

  const parts = address.split('/');
  let partIds = 0;
  const body = {};
  body.account_name = parts[partIds++];
  body.pos = parts[partIds++];
  body.offset = parts[partIds++];
  let inner_offset = parseInt(parts[partIds++]);
  const field = parts[partIds++];

  address = parts[1];
  // http://localhost:13115/v1/history/get_actions -X POST -d '{"account_name":"eosio.token"}'
  const r = await fetch(`${url}/v1/history/get_actions`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  const res = await r.json();
  if (inner_offset < 0) {
    inner_offset = res.actions.length + inner_offset;
  }
  const item = res.actions[inner_offset];
  return extractPath(item, field);
};

// Replace with self owned nodes
const endpoints = {
  'mainnet': 'http://api.eossweden.se',
  'bos': 'https://api.bos.eostribe.io',
  'telos': 'https://api.telos.eostribe.io',
  'kylin': 'https://kylin.eoscanada.com',
  'worbli': 'https://api.worbli.eostribe.io',
  'jungle': 'https://junglehistory.cryptolions.io:4433',
  'meetone': 'https://fullnode.meet.one'
};
const resolveHistoryEndpointForSisterChain = (chain) => {
  const endpoint = endpoints[chain];
  if (!endpoint) { throw new Error('endpoint not found for ' + chain); }
  return endpoint;
};
const extractPath = (item, field) => {
  const fieldPath = field.split('.');
  const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
  if (res)
    return Buffer.from(res.toString(), 'utf8');
};
const sisterChainHistoryHandler = async({ proto, address }) => {
  //  sister_chain_history://chain/account/pos/offset/inner_offset/field

  const parts = address.split('/');
  let partIds = 0;
  const body = {};
  let chain = parts[partIds++];
  const historyEndpointUrl = await resolveHistoryEndpointForSisterChain(chain);
  body.account_name = parts[partIds++];
  body.pos = parts[partIds++];
  body.offset = parts[partIds++];
  let inner_offset = parseInt(parts[partIds++]);
  const field = parts[partIds++];

  address = parts[1];
  // endpoint/v1/history/get_actions -X POST -d '{"account_name":"eosio.token"}'
  const r = await fetch(`${historyEndpointUrl}/v1/history/get_actions`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  const res = await r.json();
  if (inner_offset < 0) {
    inner_offset = res.actions.length + inner_offset;
  }
  const item = res.actions[inner_offset];
  return extractPath(item, field);
};

const randomHandler = async({ proto, address }) => {
  // random://1024/id
  const parts = address.split('/');
  const range = parseInt(parts[0]);

  return new Buffer(Math.floor(Math.random() * range).toString());
};
let stockfish;


const stockfishHandler = async({ proto, address }) => {
  // stockfish://fen
  if (!stockfish)
    stockfish = require("stockfish")();
  return new Promise((resolve, reject) => {
    const fen = address;
    // console.log("address", address);
    stockfish.onmessage = function onmessage(event) {
      if (!event)
        return;
      console.log(event);
      const parts = event.split(' ');
      let idx = 0;
      const cmd = parts[idx++];
      if (cmd == 'bestmove') {
        const move = parts[idx++];
        console.log('moveObj', move);
        resolve(Buffer.from(move));
      }



    };
    stockfish.postMessage(`uci`);
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go depth 10`);
  });
};

const sisterChainBlocksHandler = async({ proto, address }) => {
  // sister_chain_block://chain/id/field

  const parts = address.split('/');
  let partIds = 0;
  const body = {};
  let chain = parts[partIds++];
  const historyEndpointUrl = await resolveHistoryEndpointForSisterChain(chain);
  body.block_num_or_id = parts[partIds++];
  const field = parts[partIds++];

  address = parts[1];
  // endpoint/v1/history/get_block -X POST -d '{"block_num_or_id":"1111"}'
  const r = await fetch(`${historyEndpointUrl}/v1/chain/get_block`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  const res = await r.json();
  return extractPath(res, field);
};

const foreignChains = {
  'bitcoin': {
    'endpoints': [{
      host: '192.168.128.20',
      port: '8333',
      username: 'user',
      password: 'password'
    }],
    'balance': async({ parts, address, endpoint }) => {
      const account = parts[2];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.getBalance(
        account, 0
      );
    },
    'block': async({ parts, address, endpoint }) => {
      const blockHash = parts[2];

      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.getBlock(
        blockHash
      );
    },
    'history': async({ parts, address, endpoint }) => {
      const account = parts[2];
      const count = parts[3];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.listTransactions(
        account,
        count
      );
    },
    'transaction': async({ parts, address, endpoint }) => {
      const txid = parts[2];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return await client.getTransactionByHash(txid, { extension: 'hex' });
    }
  },
  'bitcoin_cash': {
    'endpoints': [{
      host: '192.168.128.20',
      port: '8335',
      username: 'user',
      password: 'password'
    }],
    'balance': async({ parts, address, endpoint }) => {
      const account = parts[2];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.getBalance(
        account, 0
      );
    },
    'block': async({ parts, address, endpoint }) => {
      const blockHash = parts[2];

      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.getBlock(
        blockHash
      );
    },
    'history': async({ parts, address, endpoint }) => {
      const account = parts[2];
      const count = parts[3];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.listTransactions(
        account,
        count
      );
    },
    'transaction': async({ parts, address, endpoint }) => {
      const txid = parts[2];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return await client.getTransactionByHash(txid, { extension: 'hex' });
    }
  },
  'litecoin': {
    'endpoints': [{
      host: '192.168.128.20',
      port: '19335',
      username: 'user',
      password: 'password'
    }],
    'balance': async({ parts, address, endpoint }) => {
      const account = parts[2];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.getBalance(
        account, 0
      );
    },
    'block': async({ parts, address, endpoint }) => {
      const blockHash = parts[2];

      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.getBlock(
        blockHash
      );
    },
    'history': async({ parts, address, endpoint }) => {
      const account = parts[2];
      const count = parts[3];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return client.listTransactions(
        account,
        count
      );
    },
    'transaction': async({ parts, address, endpoint }) => {
      const txid = parts[2];
      const BTClient = require('bitcoin-core');
      const client = new BTClient(endpoint);
      return await client.getTransactionByHash(txid, { extension: 'hex' });
    }
  },
  'cardano': {
    'endpoints': [
      'http://cardanoexplorer.com'
      // process.env.CARDANO_API || `http://localhost:8090`
    ],
    'blocks': async({ parts, address, endpoint }) => {
      const page = parts[2];
      const r = await fetch(`${endpoint}/api/blocks/pages?page=${page}`);
      return await r.json();
    },
    'history': async({ parts, address, endpoint }) => {
      const blockHash = parts[2];
      const r = await fetch(`${endpoint}/api/blocks/txs/${blockHash}`);
      return await r.json();
    },
    'state': async({ parts, address, endpoint }) => {
      const cardanoAddress = parts[2];
      const r = await fetch(`${endpoint}/api/addresses/summary/${cardanoAddress}`);
      return await r.json();
    }
  },
  'ethereum': {
    'endpoints': [
      'https://mainnet.infura.io'
      // process.env.ETHEREUM_JSONRPC_API || `http://localhost:....`
    ],
    'block_number': async({ parts, address, endpoint }) => {
      const body = JSON.stringify({
        'jsonrpc': '2.0',
        'method': 'eth_blockNumber',
        'params': [],
        'id': 1
      });
      const headers = { 'Content-Type': 'application/json' };
      const r = await fetch(`${endpoint}`, {
        headers,
        method: 'POST',
        body
      });
      return await r.json();
    },
    'history': async({ parts, address, endpoint }) => {
      const blockNum = parts[2];
      const body = JSON.stringify({
        'jsonrpc': '2.0',
        'method': 'eth_getBlockByNumber',
        'params': [
          blockNum,
          true
        ],
        'id': 1
      });
      const headers = { 'Content-Type': 'application/json' };
      const r = await fetch(`${endpoint}`, {
        headers,
        method: 'POST',
        body
      });
      console.log('got here');

      return await r.json();
    },
    'balance': async({ parts, address, endpoint }) => {
      const ethereumAddress = parts[2];
      const blockTag = parts[3] || 'latest';
      const body = JSON.stringify({
        'jsonrpc': '2.0',
        'method': 'eth_getBalance',
        'params': [
          ethereumAddress,
          blockTag
        ],
        'id': 1
      });
      const headers = { 'Content-Type': 'application/json' };
      const r = await fetch(`${endpoint}`, {
        headers,
        method: 'POST',
        body
      });
      return await r.json();
    },
    'storage': async({ parts, address, endpoint }) => {
      const ethereumAddress = parts[2];
      const position = parts[3];
      const blockTag = parts[4] || 'latest';
      const body = JSON.stringify({
        'jsonrpc': '2.0',
        'method': 'eth_getStorageAt',
        'params': [
          ethereumAddress,
          position,
          blockTag
        ],
        'id': 1
      });
      const headers = { 'Content-Type': 'application/json' };
      const r = await fetch(`${endpoint}`, {
        headers,
        method: 'POST',
        body
      });
      return await r.json();
    }
  },
  'tron': {
    'endpoints': [
      'http://54.236.37.243:8090',
      'http://52.53.189.99:8090',
      'http://18.196.99.16:8090',
      'http://34.253.187.192:8090',
      'http://52.56.56.149:8090',
      'http://35.180.51.163:8090',
      'http://54.252.224.209:8090',
      'http://18.228.15.36:8090',
      'http://52.15.93.92:8090',
      'http://34.220.77.106:8090',
      'http://13.127.47.162:8090',
      'http://13.124.62.58:8090',
      'http://47.74.149.206:8090',
      'http://47.90.240.187:8090',
      'http://47.90.215.84:8090',
      'http://47.254.77.146:8090',
      'http://47.74.242.55:8090',
      'http://47.75.249.119:8090',
      'http://47.90.201.118:8090',
      'http://47.74.21.68:8090',
      'http://47.74.13.168:8090',
      'http://47.74.33.41:8090',
      'http://47.52.59.134:8090',
      'http://47.74.229.70:8090',
      'http://47.254.27.69:8090',
      'http://47.89.243.195:8090',
      'http://47.90.201.112:8090',
      'http://47.88.174.175:8090',
      'http://47.74.224.123:8090',
      'http://47.75.249.4:8090',
      'https://api.trongrid.io'
    ],
    'balance': async({ parts, address, endpoint }) => {
      const tronAddress = parts[2];
      const TronWeb = require('tronweb');
      const tronWeb = new TronWeb({
        fullHost: endpoint
      });
      return await tronWeb.trx.getBalance(tronAddress);
    },
    'block_number': async({ parts, address, endpoint }) => {
      const TronWeb = require('tronweb');
      const tronWeb = new TronWeb({
        fullHost: endpoint
      });
      return await tronWeb.trx.getCurrentBlock();
    },
    'block': async({ parts, address, endpoint }) => {
      const block_hash = parts[2];
      const TronWeb = require('tronweb');
      const tronWeb = new TronWeb({
        fullHost: endpoint
      });
      return await tronWeb.trx.getBlock(block_hash);
    },
    'transactions': async({ parts, address, endpoint }) => {
      const block_hash = parts[2];
      const TronWeb = require('tronweb');
      const tronWeb = new TronWeb({
        fullHost: endpoint
      });
      return await tronWeb.trx.getTransactionFromBlock(block_hash);
    },
    'transaction': async({ parts, address, endpoint }) => {
      const tx_hash = parts[2];
      const TronWeb = require('tronweb');
      const tronWeb = new TronWeb({
        fullHost: endpoint
      });
      return await tronWeb.trx.getTransactionInfo(tx_hash);
    }
  },
  'ripple': {
    'endpoints': ['wss://s1.ripple.com:443'],
    'balance': async({ parts, address, endpoint }) => {
      const rippleAddress = parts[2];
      const RippleAPI = require('ripple-lib').RippleAPI;
      const api = new RippleAPI({ server: endpoint });

      await api.connect();
      const res = await api.getBalances(rippleAddress);
      await api.disconnect();
      return res;
    },
    'ledger': async({ parts, address, endpoint }) => {
      const RippleAPI = require('ripple-lib').RippleAPI;
      const api = new RippleAPI({ server: endpoint });
      await api.connect();
      const res = await api.getLedger({
        ledgerVersion: 'validated',
        includeAllData: true,
        includeTransactions: true,
        includeState: true
      });
      await api.disconnect();
      return res;
    },
    'transactions': async({ parts, address, endpoint }) => {
      const rippleAddress = parts[2];

      const RippleAPI = require('ripple-lib').RippleAPI;
      const api = new RippleAPI({ server: endpoint });
      await api.connect();
      const res = await api.getTransactions(rippleAddress);
      await api.disconnect();
      return res;
    }
  }
};

const getEndpointForChain = async({ chain, address, type }) => {
  const chainEntry = foreignChains[chain];
  return chainEntry.endpoints[0];
};
const foreignChainHandler = async({ address }) => {
  const parts = address.split('/');
  const chain = parts[0];
  const type = parts[1];
  const field = parts[parts.length - 1];
  if (field === 'dummy') { return Buffer.from('test-dummy'); }
  const chainEntry = foreignChains[chain];
  const endpoint = await getEndpointForChain({ chain, address, type });
  const res = await chainEntry[type]({ address, parts, endpoint });

  return (field !== '') ?
    extractPath(res, field) : res;
};

const handlers = {
  'http': httpGetHandler,
  'https': httpGetHandler,
  'https+post': httpPostHandler,
  'http+post': httpPostHandler,
  'http+json': httpGetHandlerJSON,
  'https+json': httpGetHandlerJSON,
  'https+post+json': httpPostHandlerJSON,
  'http+post+json': httpPostHandlerJSON,
  'wolfram_alpha': wolframAlphaHandler,
  'self_history': historyHandler,
  'sister_chain_history': sisterChainHistoryHandler,
  'sister_chain_block': sisterChainBlocksHandler,
  'sister_chain_state': undefined,
  'foreign_chain': foreignChainHandler,
  'past_self_state': undefined,
  'random': randomHandler,
  'stockfish': stockfishHandler
};

nodeFactory('oracle', {
  geturi: async({ event, rollback }, { uri }) => {
    if (rollback) {
      event.action = 'orcclean';
      console.log('orcclean after failed transaction', uri);
      return {
        size: 0,
        uri
      };
    }
    const payloadStr = Buffer.from(uri, 'hex').toString('utf8');

    const payloadParts = payloadStr.split('://', 4);
    let partIdx = 0;
    const trxId = payloadParts[partIdx++];
    const tapos = payloadParts[partIdx++];
    const proto = payloadParts[partIdx++];
    const address = payloadParts[partIdx++];
    const handler = handlers[proto];
    console.log('req', trxId, tapos, proto, address);
    if (!handler) { throw new Error(`unsupported protocol ${proto}`); }

    try {
      let data = await handler({ proto, address });
      console.log('resp', data);
      return {
        uri,
        data: data,
        size: data.length
      };
    }
    catch (e) {
      console.error(e);
      throw e;
    }
  }
});
