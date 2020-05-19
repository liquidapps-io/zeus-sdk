const fs = require('fs');
const { requireBox } = require('@liquidapps/box-utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

var contractAccount = process.env.CONTRACT;
var tableName = 'accounts'; //TODO: How would we pass in this argument?
var endpoint = `http${process.env.NODEOS_SECURED === 'true' || process.env.NODEOS_SECURED === true ? true : false ? 's' : ''}://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_PORT || '13115'}`;
var filename;

var eosPrivate;
var backup = {};

function prepare_backup() {
    var eosconfig = {
        expireInSeconds: 1200,
        sign: true,
        httpEndpoint: endpoint,
        chainId: process.env.NODEOS_CHAINID
    };
    eosPrivate = getEosWrapper(eosconfig);
    backup = {
        contract: contractAccount,
        table: tableName,
        timestamp: new Date(),
        revision: 0,
        manifest: {
            next_available_key: 0,
            shards: 1024,
            buckets_per_shard: 64,
            shardbuckets: []
        }
    }
}

function push_shardbuckets(shardbuckets) {
    let revision = backup.revision;
    let map = shardbuckets.map(shardbucket => {
        let shard_revision = shardbucket.revision || 0;
        if (shard_revision === revision) {
            return {
                key: shardbucket.shard,
                value: shardbucket.shard_uri
            }
        }
    });
    backup.manifest.shardbuckets = backup.manifest.shardbuckets.concat(map);
}

async function get_config() {
    try {
        let res = await eosPrivate.getTableRows({
            'json': true,
            'scope': tableName,
            'code': contractAccount,
            'table': '.vconfig',
            'limit': 1
        });
        if (res.rows.length == 0) {
            console.error(`No config found for table '${tableName}': Are you using the correct table name, or has it been used before?`);
            return;
        }
        let config = res.rows[0];
        backup.revision = config.revision;
        backup.manifest.next_available_key = config.next_available_key;
        backup.manifest.shards = config.shards;
        backup.manifest.buckets_per_shard = config.buckets_per_shard;
        console.log('Configuration found');
    } catch (e) {
        console.error(`Unable to get vram config: .vconfig must be exposed in ABI or you are using an old version of dapp:multi_index`);
        console.log('Default configuration being used');
    }
}

async function get_shards(lower_bound) {
    lower_bound = lower_bound || 0;
    try {
        let res = await eosPrivate.getTableRows({
            'json': true,
            'scope': contractAccount,
            'code': contractAccount,
            'table': tableName,
            'lower_bound': lower_bound,
            'limit': 100
        });
        console.log(`Fetched ${res.rows.length} shardbuckets`);
        if (res.rows.length == 0) { return; }
        lower_bound = res.rows[res.rows.length - 1].shard;
        push_shardbuckets(res.rows);

        if (res.more) {
            return get_shards(lower_bound);
        }
    } catch (e) {
        console.error(`Unable to fetch or process table '${tableName}': Have you properly exposed the ABI?`);
    }
}

function write_backup() {
    let ts = parseInt((backup.timestamp.getTime() / 1000).toFixed(0));
    let path = filename ? filename : `vram-backup-${backup.contract}-${backup.table}-${backup.revision}-${ts}.json`;
    let data = JSON.stringify(backup);
    fs.writeFileSync(path, data);
    console.log(`Wrote backup to ${path}`);
}

async function run() {
    prepare_backup();
    console.log(`Backing up vram for Contract '${backup.contract}', Table '${backup.table}'`);
    await get_config();
    await get_shards();
    console.log(`Backed up ${backup.manifest.shardbuckets.length} shardbuckets`);
    write_backup();
}

async function generateBackup(contract, table, nodeos, output) {
    contractAccount = contract;
    tableName = table;
    if (nodeos) endpoint = nodeos;
    if (output) filename = output;
    await run();
    return backup;
}

//run(); //TODO: I want this to work in unit test and as a stand alone utility or command

module.exports = { generateBackup };