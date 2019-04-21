var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { deserialize, eosPrivate } = require('../dapp-services-node/common');
var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { getUrl } = require('../../extensions/tools/eos/utils');
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }) // equivalent

const multihash = require('multihashes')
const Eos = require('eosjs');

const eos = eosPrivate;
var ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });

const eosjs2 = require('../demux/eosjs2');
const { JsonRpc } = eosjs2;
const fetch = require('node-fetch');

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });

const saveToIPFS = async(data) => {
    // console.log('writing data: ' +data);
    const filesAdded = await ipfs.files.add(Buffer.from(data, 'hex'), { 'raw-leaves': true, 'cid-version': 1 });
    var theHash = filesAdded[0].hash;
    console.log('commited to: ipfs://' + theHash);
    return `ipfs://${theHash}`;
}

const readFromIPFS = async(uri) => {
    console.log('getting', uri)
    const fileName = uri.split('ipfs://', 2)[1];
    var res = await ipfs.files.get(fileName);
    return Buffer.from(res[0].content);
}

const converToUri = (hash) => {
    const bytes = Buffer.from(hash, 'hex');
    const address = multihash.toB58String(bytes);
    return "ipfs://z" + address;
}

const readPointer = async(hash, contract) => {
    var lower_bound = new BigNumber(hash.toString('hex').slice(8), 16);
    var matchHash = hash.toString('hex').slice(8).match(/.{2}/g).reverse().join("");
    const payload = {
        "json": true,
        "scope": contract,
        "code": contract,
        "table": "ipfsentry",
        "lower_bound": matchHash,
        "upper_bound": lower_bound.plus(1).toString(16),
        "key_type": 'sha256',
        "encode_type": 'hex',
        "index_position": 2,
        "limit": 1
    };
    // console.log("payload", payload);
    const res = await rpc.get_table_rows(payload);
    var result = res.rows.find(a => a);

    if (!result) {
        const uri = converToUri(hash);
        return readFromIPFS(uri);
    }
    return Buffer.from(result.data, 'hex');

}
const hashData = (data) => {
    var hash = sha256.create();
    hash.update(data);
    return hash.hex().slice(2 * 8 * 3);
}
const hashData256 = (data) => {
    var hash = sha256.create();
    hash.update(data);
    return hash.hex();
}


const calculateBucketShard = (key, scope, buckets, shards) => {
    scope = nameToString(Buffer.from(stringToName(scope)));
    key = nameToString(Buffer.from(stringToName(key)));
    const fullkey = `${scope}-${key}`;
    const hashedKey = hashData(fullkey).match(/.{2}/g).reverse().join("");
    var num = new BigNumber(hashedKey, 16);
    console.log("fullkey", fullkey, "num", num.toString());
    var bucket = num.mod(buckets).toNumber();
    var shard = num.idiv(Math.pow(2, 6)).mod(shards).toNumber();
    return { shard, bucket }
}

const parseShard = async(shardRaw) => {
    var pos = 1;
    const res = [];
    while (pos < shardRaw.length) {
        res.push(shardRaw.slice(pos + 1, pos + 37));
        pos += 37;
    }
    return res;
}
const fetchShard = async(contract, table, shard) => {
    // get eos client instance
    var res = await eos.getTableRows({
        "json": true,
        "scope": contract,
        "code": contract,
        "table": table,
        "lower_bound": shard,
        "upper_bound": shard + 1,
        "limit": 1000
    });
    if (!res.rows.length)
        return;
    var shardRaw = await readPointer(res.rows[0].shard_uri, contract);
    // parse shard.
    return parseShard(shardRaw);
}


function isUpperCase(str) {
    return str !== str.toLowerCase();
}
const stringToSymbol = (str) => {
    const pad = '\0'.repeat(8 - str.length);
    return Buffer.from(str + pad).toString();
}

const stringToNameInner = (str) => {
    const pad = '\0'.repeat(8 - str.length);
    return Buffer.from(pad + str);
}

const stringToName = (str) => {
    if (typeof str === 'number')
        return Buffer.from(new BigNumber(str), 'hex');
    if (isUpperCase(str))
        return stringToSymbol(str);
    return Buffer.from(new BigNumber(Eos.modules.format.encodeName(str).toString()).toString(16), 'hex');
}
const nameToString = (name) => {
    const tmp = new BigNumber(name.toString('hex'), 16);
    return Eos.modules.format.decodeName(tmp.toString(), true);
}
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
}
const fetchBucket = async(bucketPointer, contract) => {
    var bucketRawData = await readPointer(bucketPointer, contract);
    return parseBucket(bucketRawData);
}

const extractRowFromBucket = async(bucketData, scope, key, contract) => {
    const rowPointer = bucketData[`${scope}.${key}`];
    console.log("rowPointer", rowPointer);
    if (rowPointer)
        return await readPointer(rowPointer, contract);
}

const extractRowFromShardData = async(shardData, bucket, scope, key, contract) => {
    if (!shardData)
        return;
    const bucketPointer = shardData[bucket];
    const bucketData = await fetchBucket(bucketPointer, contract);
    console.log("bucketData", bucketData);
    return await extractRowFromBucket(bucketData, scope, key, contract);
}

const getRowRaw = async(contract, table, scope, key, buckets, shards) => {
    const { shard, bucket } = calculateBucketShard(key, scope, buckets, shards);
    console.log("shard, bucket", shard, bucket);
    scope = stringToNameInner(stringToName(scope)).toString();
    key = stringToNameInner(stringToName(key)).toString();
    console.log("scope, key", scope, key);
    const shardData = await fetchShard(contract, table, shard);
    console.log("shardData", shardData);
    return await extractRowFromShardData(shardData, bucket, scope, key, contract);
}


const deserializeRow = async(contract, table, rowRaw) => {
    if (!rowRaw)
        return;
    // get abi
    const abi = await eos.getAbi(contract);

    const abiTable = abi.abi.tables.find(a => a.name == '.' + table);
    if (!abiTable) {
        console.error("abi not found", table);
        return;
    }
    const structName = abiTable.type;
    const parseObject = deserialize(abi.abi.structs, rowRaw, structName);
    return parseObject;
}

async function verifyIPFSConnection() {
    try {
        await saveToIPFS("");
        console.log("ipfs connection established");
    }
    catch (e) {
        console.error(`ipfs connection failed, IPFS_HOST = ${process.env.IPFS_HOST}`);
        process.exit(1);
    }

}

verifyIPFSConnection();

nodeFactory('ipfs', {
    commit: async({ rollback, replay, exception }, { data }) => {
        if (rollback)
            return;
        const uri = await saveToIPFS(data);
        if (process.env.PASSIVE_DSP_NODE == 'true' || replay || exception) {
            return;
        }
        return {
            uri,
            size: data.length / 2,
        };
    },
    warmup: async({ event, rollback }, { uri }) => {
        if (rollback) {
            // rollback warmup
            event.action = "cleanup";
            console.log('cleanup after failed transaction', uri);
            return {
                size: 0,
                uri
            };
        }
        else {
            var data = await readFromIPFS(uri);
            return {
                uri,
                data: data,
                size: data.length
            };
        }
    },
    cleanup: async({ rollback, exception, replay }, { uri }) => {
        if (rollback || exception || replay)
            return;
        console.log('cleanup', uri);
        return {
            size: 0,
            uri
        };
    },
    api: {
        get_table_row: async({ body }, res) => {
            const { contract, table, scope, key } = body;
            const buckets = body.buckets ? body.buckets : 64;
            const shards = body.shards ? body.shards : 1024;
            const rowRaw = await getRowRaw(contract, table, scope, key, buckets, shards);
            console.log("rowRaw", rowRaw);
            const row = await deserializeRow(contract, table, rowRaw);
            // get abi
            // parse object
            if (!row) {
                res.status(400);
                res.send(JSON.stringify({ error: "key not found" }));
            }
            else {
                res.send(JSON.stringify({ row }));
            }
        }
    }
});
