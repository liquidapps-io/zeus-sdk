var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { deserialize, eosPrivate, encodeName, decodeName } = require('../dapp-services-node/common');
var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { getUrl } = require('../../extensions/tools/eos/utils');
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');
const logger = require('../../extensions/helpers/logger');

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }); // equivalent

const multihash = require('multihashes');

const eos = eosPrivate;
var ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });

const eosjs2 = require('eosjs');
const { JsonRpc } = eosjs2;
const fetch = require('node-fetch');

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });
const cacheMB = 256;
const cacheHours = 12;
const cacheMinutes = 60 * cacheHours;
const ipfsTimeoutSeconds = process.env.IPFS_TIMEOUT_SECONDS || 15;
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
  // console.log('writing data: ' +data);
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
  var res = await Promise.race([
    ipfs.files.get(fileName),
    new Promise((resolve, reject) => {
      setTimeout(() => { reject('ipfsentry not found') }, ipfsTimeout);
    })
  ]);
  var data = Buffer.from(res[0].content);
  cache.set(uri, data);
  return data;
};

const converToUri = (hash) => {
  const bytes = Buffer.from(hash, 'hex');
  const address = multihash.toB58String(bytes);
  return 'ipfs://z' + address;
};
const readPointer = async(hashWithPrefix, contract) => {
  var hash = hashWithPrefix.toString('hex').slice(8);
  var matchHash = hash;
  matchHash = matchHash.match(/.{16}/g).map(a => a.match(/.{2}/g).reverse().join('')).join('').match(/.{32}/g).reverse().join('').match(/.{2}/g).reverse().join('');


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
  // console.log("payload", payload);
  const res = await rpc.get_table_rows(payload);
  const uri = converToUri(hashWithPrefix);
  var result = res.rows.find(a => {
    var myHash = hashData256(Buffer.from(a.data, 'hex'));
    return myHash == hash
  });
  if (!result)
    return readFromIPFS(uri);

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

const prepKeyForCalc = (key,keytype = null) => {
  return nameToString(Buffer.from(stringToName(key,keytype)));
}

const calculateBucketShard = (key, keytype, scope, buckets, shards) => {
  scope = prepKeyForCalc(scope);
  key = prepKeyForCalc(key, keytype);
  const fullkey = `${scope}-${key}`;
  const hashedKey = hashData(fullkey).match(/.{2}/g).reverse().join('');
  var num = new BigNumber(hashedKey, 16);
  logger.debug(`fullkey ${fullkey} num ${num.toString()}`);
  var bucket = num.mod(buckets).toNumber();
  var shard = num.idiv(Math.pow(2, 6)).mod(shards).toNumber();
  return { shard, bucket };
};

const parseShard = async(shardRaw) => {
  var pos = 1;
  const res = [];
  while (pos < shardRaw.length) {
    res.push(shardRaw.slice(pos + 1, pos + 37));
    pos += 37;
  }
  return res;
};
const fetchShard = async(contract, table, shard) => {
  // get eos client instance
  var res = await eos.getTableRows({
    'json': true,
    'scope': contract,
    'code': contract,
    'table': table,
    'lower_bound': shard,
    'upper_bound': shard + 1,
    'limit': 1000
  });
  if (!res.rows.length) { return; }
  var shardRaw = await readPointer(res.rows[0].shard_uri, contract);
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

const stringToNameInner = (str) => {
  const pad = '\0'.repeat(8 - str.length);
  return Buffer.from(pad + str);
};

const stringToName = (str, keytype = null) => {
  if (typeof str === 'number' || keytype === 'number') {
    const hexNum = new BigNumber(str).toString(16);
    const paddedNum = '0'.repeat(16 - hexNum.length) + hexNum;
    const fixedPaddedNum = paddedNum.match(/.{2}/g).reverse().join('');
    return Buffer.from(fixedPaddedNum, 'hex');
  }
  if (isUpperCase(str) || keytype === 'symbol') { return stringToSymbol(str); }
  const hexNum = new BigNumber(encodeName(str).toString()).toString(16);
  const paddedNum = '0'.repeat(16 - hexNum.length) + hexNum;
  return Buffer.from(paddedNum, 'hex');
};
const nameToString = (name) => {
  const tmp = new BigNumber(name.toString('hex'), 16);
  return decodeName(tmp.toString(), true);
};
const parseBucket = async(bucketRawData) => {
  const bucket = {};
  var pos = 0;
  while (pos < bucketRawData.length) {
    const scope = bucketRawData.slice(pos, pos + 8);
    pos += 8;
    const key = bucketRawData.slice(pos, pos + 8);
    pos += 8;
    const hash = bucketRawData.slice(pos, pos + 36);
    pos += 36;
    bucket[`${scope}.${key}`] = hash;
  }
  return bucket;
};
const fetchBucket = async(bucketPointer, contract) => {
  var bucketRawData = await readPointer(bucketPointer, contract);
  return parseBucket(bucketRawData);
};

const extractRowFromBucket = async(bucketData, scope, key, contract) => {
  const rowPointer = bucketData[`${scope}.${key}`];
  logger.debug(`rowPointer ${rowPointer}`);
  if (rowPointer) { return await readPointer(rowPointer, contract); }
};

const extractRowFromShardData = async(shardData, bucket, scope, key, contract) => {
  if (!shardData) { return; }
  const bucketPointer = shardData[bucket];
  const bucketData = await fetchBucket(bucketPointer, contract);
  logger.debug(`bucketData ${bucketData}`);
  return await extractRowFromBucket(bucketData, scope, key, contract);
};

const getRowRaw = async(contract, table, scope, key, keytype, buckets, shards) => {
  const { shard, bucket } = calculateBucketShard(key, keytype, scope, buckets, shards);
  logger.debug(`shard, bucket ${shard} ${bucket}`);
  scope = stringToNameInner(stringToName(scope)).toString();
  key = stringToNameInner(stringToName(key,keytype)).toString();
  logger.debug(`scope, key ${scope} ${key}`);
  const shardData = await fetchShard(contract, table, shard);
  // console.log('shardData', shardData);
  return await extractRowFromShardData(shardData, bucket, scope, key, contract);
};

const deserializeRow = async(contract, table, rowRaw) => {
  if (!rowRaw) { return; }
  // get abi
  const abi = await eos.getAbi(contract);

  const abiTable = abi.tables.find(a => a.name == '.' + table);
  if (!abiTable) {
    console.error('abi not found', table);
    return;
  }
  const structName = abiTable.type;
  return deserialize(abi.structs, rowRaw, structName);
};

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
      var data = await readFromIPFS(uri);
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
  api: {
    get_table_row: async({ body }, res) => {
      try {
        const { contract, table, scope, key } = body;
        const keytype = body.keytype ? body.keytype : null;
        const buckets = body.buckets ? body.buckets : 64;
        const shards = body.shards ? body.shards : 1024;
        const rowRaw = await getRowRaw(contract, table, scope, key, keytype, buckets, shards);
        logger.debug(`rowRaw ${rowRaw}`);
        const row = await deserializeRow(contract, table, rowRaw);
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
    }
  }
});
