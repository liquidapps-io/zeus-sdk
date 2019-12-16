const { deserialize, decodeName } = require('../../services/dapp-services-node/common')
const sha256 = require('js-sha256').sha256;
const { getEosWrapper } = require('../../extensions/tools/eos/eos-wrapper')
const BN = require('bignumber.js')
const bs58 = require('bs58')
const IPFS = require('ipfs-api');
const ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });
const fs = require('fs');
const ipfsTimeout = 2000;

const EMPTY_BUCKET_URI = '01551220E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';

const nodeosEndpoint = process.env.NODEOS_ENDPOINT || 'http://127.0.0.1:8888';
const eos = getEosWrapper({ httpEndpoint: nodeosEndpoint })
const shard_limit = parseInt(process.env.SHARD_LIMIT || 1024);
const tableName = process.env.TABLE_NAME;
const contractName = process.env.CONTRACT_NAME;

if (!contractName) throw new Error('missing environment variable CONTRACT_NAME');

const ipfsData = {};

async function main() {
  const vramTables = await getVramTables(contractName);
  const tables = await Promise.all(vramTables.map(table => parseTable(contractName, table.name)));

  if (process.env.VERBOSE) {
    console.log(`Total of ${Object.keys(ipfsData).length} ipfs uris`);
    fs.writeFileSync(`ipfs-data.json`, JSON.stringify(ipfsData, null, 2));
  }

  Object.keys(tables[0]).forEach((key) => {
    console.log(`table ${key} has ${tables[0][key].length} entries`);
    fs.writeFileSync(`${contractName}-${key}-table.json`, JSON.stringify(tables[0][key], null, 2));
  })
}

async function getVramTables(contractName) {
  const abi = await eos.getAbi(contractName);
  let tables = abi.tables.filter(table => table.type.includes('shardbucket'));
  if (tableName)
    tables = tables.filter(table => table.name === tableName);

  return tables;
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
  if (process.env.VERBOSE)
    fs.writeFileSync(`${contractName}-${tableName}-roots.json`, JSON.stringify(shardUrisTable, null, 2));
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

async function parseTableEntryUri(entryUri, abiStructs, structName) {
  const data = await getIpfsData(entryUri);
  try {
    let desData = deserialize(abiStructs, data, structName);
    return desData;
  } catch(e) {
    console.log(`error deserializing uri ${entryUri}`);
    return {
      "error": true
    }
  }
}

async function parseTable(contractName, tableName) {
  const table = {};
  const tableShardUris = await getTableShardUris(contractName, tableName)
  const parsedShardUris = await Promise.all(tableShardUris.map(shardUri => parseShardUri(shardUri).catch((e) => {
    console.log(`error parsing shard uri ${shardUri} - ${e}`);
    return [];
  })));
  const bucketUris = flattenArray(parsedShardUris);
  const bucketData = await Promise.all(bucketUris.map(bucketUri => parseBucketUri(bucketUri).catch(() => {
    console.log(`error parsing bucket uri ${bucketUri} - ${e}`);
    return [];
  })));

  const flattenedBucketData = flattenArray(bucketData);

  const abi = await eos.getAbi(contractName);
  const abiTable = abi.tables.find(a => a.name == '.' + tableName);
  const structName = abiTable.type;

  const tableData = await Promise.all(flattenedBucketData.map(bucketData => parseTableEntryUri(bucketData.dataUri, abi.structs, structName)));
  // recombine data to make pretty
  const fullTableData = flattenedBucketData.map((data, idx) => ({
    scope: decodeName((new BN(data.scope, 16)).toString(10)),
    key: data.key,
    data: tableData[idx]
  }));
  table[tableName] = fullTableData;
  return table;
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
    ipfsData[uri] = Buffer.from(result.data, 'hex').toString('hex');
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
  ipfsData[uri] = Buffer.from(res[0].content).toString('hex');
  //console.log(`found ipfs uri ${uri} on ipfs`);
  return Buffer.from(res[0].content);
}

const flattenArray = array => [].concat.apply([], array);

main().catch(console.log)