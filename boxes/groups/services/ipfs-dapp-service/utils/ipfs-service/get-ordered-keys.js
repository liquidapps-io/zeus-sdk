const { requireBox } = require('@liquidapps/box-utils');
const { deserialize, decodeName } = requireBox('dapp-services/services/dapp-services-node/common')
const sha256 = require('js-sha256').sha256;
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const BN = require('bignumber.js')
const bs58 = require('bs58')
const IPFS = require('ipfs-api');
const ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });
const ipfsTimeout = parseInt(process.env.IPFS_TIMEOUT || 10000);

const EMPTY_BUCKET_URI = '01551220E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';

const nodeosEndpoint = process.env.NODEOS_ENDPOINT || 'http://127.0.0.1:8888';
const eos = getEosWrapper({ httpEndpoint: nodeosEndpoint })
const shard_limit = parseInt(process.env.SHARD_LIMIT || 1024);
const contractName = process.env.CONTRACT_NAME;
const tableName = process.env.TABLE_NAME;
const scope = process.env.SCOPE;

if (!tableName)
  throw new Error('must provide env var TABLE_NAME');
if (!contractName)
  throw new error('must provide env var CONTRACT_NAME');
if (!scope)
  throw new error('must provide env var SCOPE');

async function getOrderedKeys(contractName, tableName, scope) {
  const tableShardUris = await getTableShardUris(contractName, tableName)
  const parsedShardUris = await Promise.all(tableShardUris.map(shardUri => parseShardUri(shardUri)));
  const bucketUris = flattenArray(parsedShardUris);
  const bucketData = await Promise.all(bucketUris.map(bucketUri => parseBucketUri(bucketUri)));
  const flattenedBucketData = flattenArray(bucketData);

  const filteredBucketData = flattenedBucketData.filter(data => {
    return scope === data.scope || scope === decodeName((new BN(data.scope, 16)).toString(10));
  });
  let allKeys = filteredBucketData.map(data => new BN(data.key.match(/.{2}/g).reverse().join(''), 16).toString(10));
  allKeys.sort((k1, k2) => {
    if ((new BN(k1)).isGreaterThan(new BN(k2)))
      return 1;
    if ((new BN(k2)).isGreaterThan(new BN(k1)))
      return -1;
    return 0;
  })
  console.log(allKeys);
  return allKeys;
}

async function getTableShardUris(contractName, tableName) {
  const res = await eos.getTableRows({
    'json': true,
    'scope': contractName,
    'code': contractName,
    'table': tableName,
    'limit': shard_limit
  });
  const shardUrisTable = res.rows;
  const shardUris = shardUrisTable.map(shardUriRow => shardUriRow.shard_uri);
  return shardUris;
}

// receives shard uri 015... returns array of bucket uris
async function parseShardUri(shardUri) {
  const data = await getIpfsData(shardUri);
  const shardDataAbi = [{
    "name": "shard_data",
    "base": "",
    "fields": [{
      "name": "values",
      "type": "bytes[]"
    }
    ]
  }];
  const deserializedShardData = deserialize(shardDataAbi, data, 'shard_data', 'base16');
  return deserializedShardData.values;
}

// receives bucket uri, returns [{key, scope, data}]
async function parseBucketUri(bucketUri) {
  let bucketData = [];
  if (bucketUri == EMPTY_BUCKET_URI)
    return bucketData;

  const rawData = (await getIpfsData(bucketUri)).toString('hex');
  const splitData = rawData.match(/.{1,104}/g);
  splitData.forEach(data => {
    const scope = data.substring(0, 16);
    const key = data.substring(16, 32);
    const dataUri = data.substring(32);
    bucketData.push({ scope, key, dataUri });
  });
  return bucketData;
}

const hashData256 = (data) => {
  var hash = sha256.create();
  hash.update(data);
  return hash.hex();
};

async function getIpfsData(uri) {
  let hash = uri.toString('hex').slice(8);
  let matchHash = hash.match(/.{16}/g).map(a => a.match(/.{2}/g).reverse().join('')).join('').match(/.{32}/g).reverse().join('').match(/.{2}/g).reverse().join('');

  const payload = {
    'json': true,
    'scope': contractName,
    'code': contractName,
    'table': 'ipfsentry',
    'lower_bound': matchHash,
    'key_type': 'sha256',
    'encode_type': 'hex',
    'index_position': 2,
    'limit': 1
  };
  const tableRes = await eos.getTableRows(payload);
  const result = tableRes.rows.find(a => {
    var myHash = hashData256(Buffer.from(a.data, 'hex'));
    return myHash.toLowerCase() == hash.toLowerCase();
  });
  if (result) {
    //console.log(`found ipfs uri ${uri} on chain`);
    return Buffer.from(result.data, 'hex');
  }

  const bytes = Buffer.from(uri, 'hex')
  const encodedUri = 'z' + bs58.encode(bytes)

  const res = await Promise.race([
    ipfs.files.get(encodedUri),
    new Promise((resolve, reject) => {
      setTimeout(() => { reject('ipfsentry not found') }, ipfsTimeout);
    })
  ]);
  return Buffer.from(res[0].content);
}

const flattenArray = array => [].concat.apply([], array);

getOrderedKeys(contractName, tableName, scope).catch(console.log)
