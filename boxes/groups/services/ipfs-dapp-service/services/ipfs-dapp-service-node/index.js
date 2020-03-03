var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { deserialize, encodeName, decodeName, resolveProviderPackage, getProviders, resolveProviderData, getLinkedAccount } = require('../dapp-services-node/common');
var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { getUrl } = require('../../extensions/tools/eos/utils');
const { loadModels } = require("../../extensions/tools/models");
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');
const logger = require('../../extensions/helpers/logger');
const { TextEncoder, TextDecoder } = require('util'); // node only; native TextEncoder/Decoder

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }); // equivalent

const multihash = require('multihashes');


var ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });

const eosjs2 = require('eosjs');
const { Api, JsonRpc, RpcError } = eosjs2;
const fetch = require('node-fetch');

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });
const cacheMB = 256;
const cacheHours = 12;
const cacheMinutes = 60 * cacheHours;
const ipfsTimeoutSeconds = process.env.IPFS_TIMEOUT_SECONDS || 5;
const ipfsTimeout = ipfsTimeoutSeconds * 1000;
var LRU = require("lru-cache"),
  options = {
    max: 1024 * 1024 * cacheMB,
    updateAgeOnGet: true,
    length: function(n, key) { return n.length },
    maxAge: 1000 * 60 * cacheMinutes
  },
  cache = new LRU(options)



const saveToIPFS = async(data) => {
  const bufData = Buffer.from(data, 'hex');
  const hash = hashData256(bufData);
  const uri = converToUri("01551220" + hash);

  var cachedValue = cache.get(uri);
  if (cachedValue) {
    logger.debug(`already cached ${uri}`);
    return uri;
  }

  const filesAdded = await ipfs.files.add(bufData, { 'raw-leaves': true, 'cid-version': 1, "cid-base": 'base58btc' });
  var theHash = filesAdded[0].hash;
  logger.info('commited to: ipfs://' + theHash);
  const resUri = `ipfs://${theHash}`;
  if (resUri != uri)
    throw new Error(`uris mismatch ${resUri} != ${uri}`);
  cache.set(uri, bufData);
  return uri;
};

const readFromIPFS = async(uri) => {
  var cachedValue = cache.get(uri);
  if (cachedValue) {
    logger.info(`getting from cache ${uri}`);
    return cachedValue;
  }
  logger.info(`getting ${uri}`);
  const fileName = uri.split('ipfs://', 2)[1];
  try {
    var res = await Promise.race([
      ipfs.files.get(fileName),
      new Promise((resolve, reject) => {
        setTimeout(() => { reject('ipfsentry not found') }, ipfsTimeout);
      })
    ]);
    var data = Buffer.from(res[0].content);
    cache.set(uri, data);
    return data;
  } catch(e) {
    throw new Error(`ipfsentry ${uri} not found`);
  }  
};
const convertFromUri = (uri) => {
  const address = uri.slice(8); // remove ipfs://z
  const hash = multihash.fromB58String(address);
  return hash;
};

const converToUri = (hash) => {
  const bytes = Buffer.from(hash, 'hex');
  const address = multihash.toB58String(bytes);
  return 'ipfs://z' + address;
};
const readPointer = async(hashWithPrefix, contract, sidechain) => {
  var hash = hashWithPrefix.toString('hex').slice(8);
  var matchHash = hash;
  matchHash = matchHash.match(/.{16}/g).map(a => a.match(/.{2}/g).reverse().join('')).join('');

  const payload = {
    'json': true,
    'scope': contract,
    'code': contract,
    'table': 'ipfsentry',
    'lower_bound': matchHash,
    'key_type': 'sha256',
    'encode_type': 'hex',
    'index_position': 2,
    'limit': 1
  };
  let currentRPC = rpc;
  if (sidechain) {
    currentRPC = new JsonRpc(sidechain.nodeos_endpoint, { fetch });
  }
  const res = await currentRPC.get_table_rows(payload);
  const uri = converToUri(hashWithPrefix);
  var result = res.rows.find(a => {
    var myHash = hashData256(Buffer.from(a.data, 'hex'));
    return myHash == hash
  });
  if (!result) {
    try {
      data = await readFromIPFS(uri);
      return data;
    } catch(e) {
      data = await readRemoteIPFS(contract, uri, sidechain);
      return data;
    }
  }
  logger.debug(`uri: ${uri} from cache`);
  return Buffer.from(result.data, 'hex');
};
const hashData = (data) => {
  var hash = sha256.create();
  hash.update(data);
  return hash.hex().slice(2 * 8 * 3);
};
const hashData256 = (data) => {
  var hash = sha256.create();
  hash.update(data);
  return hash.hex();
};

const prepKeyForCalc = (key, keytype = null, keysize = 64) => {
  let prep = "";
  let buf = Buffer.from(stringToName(key, keytype, keysize));
  let pos = buf.length / 8;
  while(pos > 0) {
    let word = buf.slice((pos-1)*8, pos*8);
    prep += nameToString(word) + "-";
    --pos;
  }
  return prep.slice(0,-1);
}

const calculateBucketShard = (key, keytype, keysize, scope, buckets, shards, scopetype) => {
  let prepscope = prepKeyForCalc(scope, scopetype);
  let prepkey = prepKeyForCalc(key, keytype, keysize);
  //TODO: for keysize = 128, fullkey = `${scope}-${key0}-${key1}`
  //TODO: for keysize = 256, fullkey = `${scope}-${key0}-${key1}-${key2}-${key3}`
  //TODO: where key0 is the left (most significant) bits
  const fullkey = `${prepscope}-${prepkey}`;
  const hashedKey = hashData(fullkey).match(/.{2}/g).reverse().join('');
  var num = new BigNumber(hashedKey, 16);
  logger.debug(`fullkey ${fullkey} num ${num.toString()}`);
  var bucket = num.mod(buckets).toNumber();
  var shard = num.idiv(Math.pow(2, 6)).mod(shards).toNumber();
  return { shard, bucket };
};

const parseShard = (shardRaw) => {
  var pos = 1;
  const res = [];
  while (pos < shardRaw.length) {
    res.push(shardRaw.slice(pos + 1, pos + 37));
    pos += 37;
  }
  return res;
};

const fetchShardUri = async(contract, table, shard, sidechain) => {
  try {
    // get eos client instance
    const currentRPC = getEosRpc(sidechain);
    const res = await currentRPC.get_table_rows({
      'json': true,
      'scope': contract,
      'code': contract,
      'table': table,
      'lower_bound': shard,
      'upper_bound': shard + 1,
      'limit': 1000
    });
    if (!res.rows.length)
      throw new Error(`Error fetching shard ${shard} of table ${table} of account ${contract}`);
    return res.rows[0].shard_uri;
  } catch (e) {
    logger.error(`Error fetching shard`);
    throw e;
  }
}

const fetchRawShard = async(contract, table, shard, sidechain) => {
  const shardUri = await fetchShardUri(contract, table, shard, sidechain)
  const shardRaw = await readPointer(shardUri, contract, sidechain);
  return shardRaw;
}

const fetchShard = async(contract, table, shard, sidechain) => {
  const shardRaw = await fetchRawShard(contract, table, shard, sidechain)
  // parse shard.
  return parseShard(shardRaw);
};

function isUpperCase(str) {
  return str !== str.toLowerCase();
}
const stringToSymbol = (str) => {
  const pad = '\0'.repeat(8 - str.length);
  return Buffer.from(str + pad);
};

const stringToNameInner = (str, keysize = 64) => {
  let length = keysize / 8;
  //we have to reverse 256bit strings
  if(str.length === 32 || keysize === 256) {
    let first = str.slice(0,16);
    let second = str.slice(16,32);
    return Buffer.from(second+first);
  }
  const pad = '\0'.repeat(length - str.length);
  return Buffer.from(pad + str);
};  

const stringToName = (str, keytype = null, keysize = 64) => {
  let length = keysize / 4;
  if (typeof str === 'number' || keytype === 'number') {
    const hexNum = new BigNumber(str).toString(16);
    const paddedNum = '0'.repeat(length - hexNum.length) + hexNum;
    const fixedPaddedNum = paddedNum.match(/.{2}/g).reverse().join('');
    return Buffer.from(fixedPaddedNum, 'hex');
  }
  if(keytype === 'hex') {
    const paddedNum = '0'.repeat(length - str.length) + str;
    const fixedPaddedNum = paddedNum.match(/.{2}/g).reverse().join('');
    return Buffer.from(fixedPaddedNum, 'hex');
  }
  if (isUpperCase(str) || keytype === 'symbol') { return stringToSymbol(str); }
  const hexNum = new BigNumber(encodeName(str).toString()).toString(16);
  const paddedNum = '0'.repeat(length - hexNum.length) + hexNum;
  return Buffer.from(paddedNum, 'hex');
};
const nameToString = (name) => {
  const tmp = new BigNumber(name.toString('hex'), 16);
  return decodeName(tmp.toString(), true);
};
const parseBucket = async(bucketRawData, keysize) => {
  const bucket = {};
  var pos = 0;
  while (pos < bucketRawData.length) {
    const scope = bucketRawData.slice(pos, pos + 8);
    pos += 8;
    const key = bucketRawData.slice(pos, pos + (keysize/8));
    pos += (keysize/8);
    const hash = bucketRawData.slice(pos, pos + 36);
    pos += 36;
    bucket[`${scope}.${key}`] = hash;
  }
  return bucket;
};
const fetchBucket = async(bucketPointer, contract, sidechain, keysize) => {
  var bucketRawData = await readPointer(bucketPointer, contract, sidechain);
  return parseBucket(bucketRawData, keysize);
};

const extractRowFromBucket = async(bucketData, scope, key, contract, sidechain) => {
  const rowPointer = bucketData[`${scope}.${key}`];
  logger.debug(`rowPointer ${rowPointer}`);
  if (rowPointer) { return await readPointer(rowPointer, contract, sidechain); }
};

const extractRowFromShardData = async(shardData, bucket, scope, key, keysize, contract, sidechain) => {
  if (!shardData) { return; }
  const bucketPointer = shardData[bucket];
  const bucketData = await fetchBucket(bucketPointer, contract, sidechain, keysize);
  logger.debug(`bucketData ${JSON.stringify(bucketData)}`);
  return await extractRowFromBucket(bucketData, scope, key, contract, sidechain);
};

const getRowRaw = async(contract, table, scope, key, keytype, keysize, buckets, shards, sidechain) => {
  const { shard, bucket } = calculateBucketShard(key, keytype, keysize, scope, buckets, shards);
  logger.debug(`shard, bucket ${shard} ${bucket}`);
  let innerscope = stringToNameInner(stringToName(scope)).toString();
  let innerkey = stringToNameInner(stringToName(key, keytype, keysize), keysize).toString();
  logger.debug(`scope, key ${innerscope} ${innerkey}`);
  logger.debug(`sidechain ${JSON.stringify(sidechain)}`);

  const shardData = await fetchShard(contract, table, shard, sidechain);
  // console.log('shardData', shardData);
  return await extractRowFromShardData(shardData, bucket, innerscope, innerkey, keysize, contract, sidechain);
};

const deserializeRow = async(contract, table, rowRaw, sidechain, encoding) => {
  if (!rowRaw) { return; }

  const api = getEosApi(sidechain);
  const abi = await api.getAbi(contract);
  const abiTable = abi.tables.find(a => a.name == '.' + table);
  if (!abiTable) {
    logger.error('abi not found', table);
    return;
  }
  const structName = abiTable.type;
  return deserialize(abi.structs, rowRaw, structName, encoding);
};

const getEosRpc = (sidechain) => (sidechain && sidechain.nodeos_endpoint) ?
  new JsonRpc(sidechain.nodeos_endpoint, { fetch }) : rpc;

const getEosApi = (sidechain) => {
  const rpc = getEosRpc(sidechain);
  const api = new Api({ rpc, signatureProvider: null, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
  return api;
};

const getVconfig = async (account, table, sidechain) => {
  const rpc = getEosRpc(sidechain);
  const api = getEosApi(sidechain);
  const abi = await api.getAbi(account);
  // handle .vconfig not being exposed by abi? returning default for now
  if (!abi.tables.find(table => table.name == ".vconfig")) {
    logger.warn(`account ${account} missing .vconfig from abi, may be warmup issues`)
    // more data could need to be returned such as the bucket selector function
    return { shards: 1024, buckets_per_shard: 64 };
  }
  const vconfigRes = await rpc.get_table_rows({
      code: account,
      scope: table,
      table: ".vconfig",
      json: true,
      limit: 1
  });
  const vconfig = vconfigRes.rows[0];
  if (!vconfig)
    throw new Error(".vconfig table not initialized");

  return vconfig;
}

// returns [{uri:data},{uri:data},...]
const getRequiredIpfsData = async (
  shard_uri,
  account,
  table,
  scope,
  index_position,
  key,
  keysize,
  sidechain
) => {
  let uris = [];
  logger.debug(`getting required ipfs data for ${account} ${table} ${scope} ${key}`);
  const { shards, buckets_per_shard } = await getVconfig(account, table, sidechain);
  logger.debug(`got #shards ${shards} #buckets-per-shard ${buckets_per_shard}`);
  // const { shards, buckets_per_shard, shard_selector } = await getVconfig(account, table, sidechain);
  //const refKey = (new BigNumber(uint64Key, 16)).toString();
  const refKey = (new BigNumber(key, 16)).toString(16);
  logger.info(refKey)
  logger.info(scope)
  const { bucket, shard } = calculateBucketShard(refKey, 'hex', keysize, scope, buckets_per_shard, shards, 'number');
  logger.debug(`got shard ${shard} bucket ${bucket}`);
  // const { bucket, shard } = shard_key_selectors[shard_selector](key, scope, buckets_per_shard, shards);

  //const shardUri = await fetchShardUri(account, table, shard, sidechain);
  //const shardIpfsUri = await converToUri(shardUri);
  const shardHash = convertFromUri(shard_uri);
  const shardRawData = await readPointer(shardHash, account, sidechain);
  const shardData = parseShard(shardRawData);
  // TODO: check if data is in ipfsentry table already?
  uris.push({ uri: shard_uri, data: shardRawData });

  const bucketUri = shardData[bucket];
  const bucketIpfsUri = converToUri(bucketUri);
  const bucketRawData = await readPointer(bucketUri, account, sidechain);
  const bucketData = parseBucket(bucketRawData);
  logger.debug(`got bucket uri ${bucketIpfsUri}`);
  uris.push({ uri: bucketIpfsUri, data: bucketRawData });

  formattedScope = stringToNameInner(stringToName(scope, 'number')).toString();
  formattedKey = stringToNameInner(stringToName(refKey, 'hex', keysize)).toString();
  let tableEntryUri = bucketData[`${formattedScope}.${formattedKey}`];
  if (tableEntryUri) {
    tableEntryUri = tableEntryUri.toString('hex');
    const tableEntryIpfsUri = converToUri(tableEntryUri);
    const tableEntryRawData = await readPointer(tableEntryUri, account, sidechain);
    logger.debug(`entry exists - entry uri ${tableEntryIpfsUri}`);
    uris.push({ uri: tableEntryIpfsUri, data: tableEntryRawData });
  }

  return uris; 
}

async function verifyIPFSConnection() {
  try {
    await saveToIPFS('');
    logger.info('ipfs connection established');
  }
  catch (e) {
    logger.error(`ipfs connection failed (${e}), IPFS_HOST = ${process.env.IPFS_HOST}`);
    process.exit(1);
  }
}

function postData (url = ``, data = {}) {
  // Default options are marked with *
  return fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, cors, *same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      // "Content-Type": "application/json",
      // "Content-Type": "application/x-www-form-urlencoded",
    },
    redirect: 'follow', // manual, *follow, error
    referrer: 'no-referrer', // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  })
    .then(response => response.json()); // parses response to JSON
}

const readRemoteIPFS = async(contract, uri, sidechain) => {
  let loadedExtensions = await loadModels("dapp-services");
  let service = loadedExtensions.find(a => a.name == "ipfs").contract;
  let mainnet_account = contract;
  if(sidechain) 
    mainnet_account = await getLinkedAccount(null, null, contract, sidechain.name);  
  const remoteProviders = await getProviders(contract, service, false, false);  
  //iterate over these providers
  for (let i = 0; i < remoteProviders.length; i++) {      
    const provider = remoteProviders[i].provider;
    logger.debug("Attempting to fetch %s from %s", uri, provider);
    const packageid = await resolveProviderPackage(mainnet_account, service, provider);
    const remote = await resolveProviderData(service, provider, packageid);
    const result = await postData(`${remote.endpoint}/v1/dsp/${service}/get_uri`, { uri });      
    if(result.data) return Buffer.from(result.data,'base64');      
  }          
  throw new Error(`Unable to fetch ${uri} from any providers`);  
}

verifyIPFSConnection();

nodeFactory('ipfs', {
  commit: async({ rollback, replay, exception }, { data }) => {
    if (rollback) { return; }
    const uri = await saveToIPFS(data);
    if (process.env.PASSIVE_DSP_NODE == 'true' || replay || exception) {
      return;
    }
    return {
      uri,
      size: data.length / 2
    };
  },
  warmup: async({ event, rollback }, { uri }) => {
    if (rollback) {
      // rollback warmup
      event.action = 'cleanup';
      logger.info(`cleanup after failed transaction ${uri}`);
      return {
        size: 0,
        uri
      };
    }
    else {
      logger.info(`WARMUP: getting uri for account ${event.payer} : ${uri}`);
      let data;
      try {
        data = await readFromIPFS(uri);
      } catch(e) {
        //if code exists (backwards compatability) use it, 
        //otherwise check all providers that payer has staked to
        data = await readRemoteIPFS(event.payer, uri, event.sidechain);
      }
      logger.info(`Got warmup data for uri ${uri}`);
      return {
        uri,
        data: data,
        size: data.length
      };
    }
  },
  warmupcode: async({ event, rollback }, { uri, code }) => {
    if (rollback) {
      // rollback warmup
      event.action = 'cleanup';
      logger.info(`cleanup after failed transaction ${uri}`);
      return {
        size: 0,
        uri
      };
    }
    else {
      logger.info(`WARMUP CODE: getting uri for account ${event.payer} : ${code || event.payer} - ${uri}`);
      let data;
      try {
        data = await readFromIPFS(uri);
      } catch(e) {
        //if code exists (backwards compatability) use it, 
        //otherwise check all providers that payer has staked to
        data = await readRemoteIPFS(code || event.payer, uri, event.sidechain);
      }
      logger.info(`Got warmup data for uri ${uri}`);
      return {
        uri,
        data: data,
        size: data.length
      };
    }
  },
  cleanup: async({ rollback, exception, replay }, { uri }) => {
    if (rollback || exception || replay) { return; }
    logger.debug(`cleanup ${uri}`);
    return {
      size: 0,
      uri 
    };
  },
  warmuprow: async({ event, rollback }, { uri, code, table, scope, index_position, key, keysize }) => {
    if (rollback) {
      // rollback warmup
      event.action = 'cleanuprow';
      return {
        size: 0,
        uris: event.garbage.uris
      };
    }
    else {
      try {
        // have to modify event object to contain more garbage
        logger.info(`WARMUP ROW: getting data for account ${event.payer} : ${code || event.payer} - ${table} ${scope} ${index_position} ${key} ${keysize}`);
        keysize = keysize * 8; // sizeof(PrimKey) measures each 8 bits as size 1 
        const requiredData = await getRequiredIpfsData(uri, code || event.payer, table, scope, index_position, key, keysize, event.sidechain);
        const uris = requiredData.map(entry => entry.uri);
        const data = requiredData.map(entry => entry.data);
        const size = data.reduce((acc, cur) => acc + cur.length, 0);
        event.garbage = { uris };
        logger.info(`got uris for warmuprow - ${JSON.stringify(uris)}`);
        return {
          uris,
          data,
          size
        };
      } catch (e) {
        console.log(e)
        logger.error(e);
        throw e;
      }
    }
  },
  cleanuprow: async({ rollback, exception, replay }, { uris }) => {
    if (rollback || exception || replay) { return; }
    logger.debug(`cleanuprow ${uris}`);
    return {
      size: 0,
      uris
    };
  },
  api: {
    get_table_row: async({ body }, res) => {
      try {
        const { contract, table, scope, key } = body;
        const keytype = body.keytype ? body.keytype : null;
        const keysize = body.keysize ? body.keysize : 64;
        const buckets = body.buckets ? body.buckets : 64;
        const shards = body.shards ? body.shards : 1024;
        const encoding = body.encoding ? body.encoding : 'base64';

        const rowRaw = await getRowRaw(contract, table, scope, key, keytype, keysize, buckets, shards, body.sidechain);
        logger.debug(`rowRaw ${rowRaw}`);
        const row = await deserializeRow(contract, table, rowRaw, body.sidechain, encoding);
        // get abi
        // parse object
        if (!row)
          throw new Error('key not found');
        res.send(JSON.stringify({ row }));
      }
      catch (e) {
        res.status(400);
        logger.error(`error: ${e.toString()}`);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    },
    get_uri: async({ body }, res) => {
      const { uri } = body;
      const encoding = body.encoding ? body.encoding : 'base64';
      logger.debug("get_uri: %s", uri);      
      try {        
        const raw = await readFromIPFS(uri);
        const data = raw.toString(encoding);

        logger.debug("get_uri: %s retrieved data %s", uri, data);    
        res.send(JSON.stringify({ uri, data }));
      }
      catch (e) {
        res.status(400);
        logger.error(`error: ${e.toString()}`);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    }
  }
});
