const { deserialize, decodeName } = require('../../services/dapp-services-node/common')
const sha256 = require('js-sha256').sha256;
const { getEosWrapper } = require('../../extensions/tools/eos/eos-wrapper')
const BN = require('bignumber.js')
const bs58 = require('bs58')
const fs = require('fs');
const fetch = require('node-fetch');
const EMPTY_BUCKET_URI = '01551220E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';
const nodeosLatest = process.env.NODEOS_LATEST || true;
const ipfsData = {};

async function example() {
  const dspEndpoint = process.env.DSP_ENDPOINT || 'http://127.0.0.1:13015';
  const eos = getEosWrapper({ httpEndpoint: dspEndpoint })
  const tableName = process.env.TABLE_NAME;
  const contractName = process.env.CONTRACT_NAME;
  const shard_limit = parseInt(process.env.SHARD_LIMIT || 1024);
  if (!contractName) throw new Error('missing environment variable CONTRACT_NAME');

  const vramTables = await getVramTables(contractName, eos, tableName);
  const tables = await Promise.all(vramTables.map(table => parseTable(contractName, table.name, dspEndpoint, shard_limit)));

  if (process.env.VERBOSE) {
    console.log(`Total of ${Object.keys(ipfsData).length} ipfs uris`);
    fs.writeFileSync(`ipfs-data.json`, JSON.stringify(ipfsData, null, 2));
  }

  Object.keys(tables[0]).forEach((key) => {
    console.log(`table ${key} has ${tables[0][key].length} entries`);
    fs.writeFileSync(`${contractName}-${key}-table.json`, JSON.stringify(tables[0][key], null, 2));
  })
}

async function getVramTables(contractName, eos, tableName) {
  const abi = await eos.getAbi(contractName);
  let tables = abi.tables.filter(table => table.type.includes('shardbucket'));
  if (tableName)
    tables = tables.filter(table => table.name === tableName);

  return tables;
}

async function getTableShardUris(contractName, tableName, eos, shard_limit) {
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
async function parseShardUri(shardUri, dspEndpoint, contractName, ipfsCache) {
  const data = await getIpfsData(shardUri, dspEndpoint, contractName, ipfsCache);
  const shardDataAbi = [{
    "name": "shard_data",
    "base": "",
    "fields": [{
        "name": "values",
        "type": "bytes[]"
      }
    ]
  }];
  try {
    const deserializedShardData = deserialize(shardDataAbi, data, 'shard_data');
    return deserializedShardData.values;
  } catch(e) {
    console.log(`error deserializing shard data: ${e}`);
    throw e;
  }
}

// receives bucket uri, returns [{key, scope, data}]
async function parseBucketUri(bucketUri, dspEndpoint, contractName, ipfsCache) {
  let bucketData = [];
  if (bucketUri == EMPTY_BUCKET_URI)
    return bucketData;

  const rawData = (await getIpfsData(bucketUri, dspEndpoint, contractName, ipfsCache)).toString('hex');
  const splitData = rawData.match(/.{1,104}/g);
  splitData.forEach(data => {
    const scope = data.substring(0, 16);
    const key = data.substring(16, 32);
    const dataUri = data.substring(32);
    bucketData.push({ scope, key, dataUri });
  });
  return bucketData;
}

async function parseTableEntryUri(entryUri, abiStructs, structName, dspEndpoint, contractName, ipfsCache) {
  const data = await getIpfsData(entryUri, dspEndpoint, contractName, ipfsCache);
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

async function parseTable(contractName, tableName, dspEndpoint, shard_limit = 1024, inclIpfsData = false) {
  const ipfsCache = {};
  const eos = getEosWrapper({ httpEndpoint: dspEndpoint });
  const tableShardUris = await getTableShardUris(contractName, tableName, eos, shard_limit);
  const parsedShardUris = await Promise.all(tableShardUris.map(shardUri => parseShardUri(shardUri, dspEndpoint, contractName, ipfsCache).catch((e) => {
    console.log(`error parsing shard uri ${shardUri} - ${e}`);
    return [];
  })));
  const bucketUris = flattenArray(parsedShardUris);
  const bucketData = await Promise.all(bucketUris.map(bucketUri => parseBucketUri(bucketUri, dspEndpoint, contractName, ipfsCache).catch(() => {
    console.log(`error parsing bucket uri ${bucketUri} - ${e}`);
    return [];
  })));

  const flattenedBucketData = flattenArray(bucketData);

  const abi = await eos.getAbi(contractName);
  const abiTable = abi.tables.find(a => a.name == '.' + tableName);
  const structName = abiTable.type;

  const tableData = await Promise.all(flattenedBucketData.map(bucketData => parseTableEntryUri(bucketData.dataUri, abi.structs, structName, dspEndpoint, contractName, ipfsCache)));
  // recombine data to make pretty
  const fullTableData = flattenedBucketData.map((data, idx) => ({
    scope: decodeName((new BN(data.scope, 16)).toString(10)),
    key: data.key,
    data: tableData[idx]
  }));
  // return { fullTableData, ipfsCache }
  return fullTableData;
}

const hashData256 = (data) => {
  var hash = sha256.create();
  hash.update(data);
  return hash.hex();
};

function postData(url = ``, data = {}) {
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

async function getIpfsData(uri, dspEndpoint, contractName, ipfsCache) {
  const eos = getEosWrapper({ httpEndpoint: dspEndpoint })
  let hash = uri.toString('hex').slice(8);
  let matchHash;
  if(nodeosLatest.toString() === "true") {
    matchHash = hash.match(/.{16}/g).map(a => a.match(/.{2}/g).reverse().join('')).join('');
  } else {
    matchHash = hash.match(/.{16}/g).map(a => a.match(/.{2}/g).reverse().join('')).join('').match(/.{32}/g).reverse().join('').match(/.{2}/g).reverse().join('');
  }

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
    ipfsCache[uri] = Buffer.from(result.data, 'hex').toString('hex');
    return Buffer.from(result.data, 'hex');
  }

  const bytes = Buffer.from(uri, 'hex')
  const encodedUri = 'z' + bs58.encode(bytes);
  const res = await postData(`${dspEndpoint}/v1/dsp/ipfsservice1/get_uri`, { uri: `ipfs://${encodedUri}` });

  ipfsCache[uri] = Buffer.from(res.data, 'base64').toString('hex');
  return Buffer.from(res.data, 'base64');
}

const flattenArray = array => [].concat.apply([], array);

module.exports = {
  parseTable
}