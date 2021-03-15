const fetch = require('node-fetch');
const headers = { 'Content-Type': 'application/json' };

const getEndpointForChain = async({ chain, address, type }) => {
  const chainEntry = foreignChains[chain];
  return chainEntry.endpoints[0];
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
      'https://explorer.cardano.org'
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
      'https://main-light.eth.linkpool.io'
      // process.env.ETHEREUM_JSONRPC_API || `http://localhost:....`
    ],
    'block_number': async({ parts, address, endpoint }) => {
      const body = JSON.stringify({
        'jsonrpc': '2.0',
        'method': 'eth_blockNumber',
        'params': [],
        'id': 1
      });
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
const extractPath = (item, field) => {
  const fieldPath = field.split('.');
  const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
  if (res)
    return Buffer.from(res.toString(), 'utf8');
};
module.exports = async({ proto, address }) => {
  // sql://query
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
