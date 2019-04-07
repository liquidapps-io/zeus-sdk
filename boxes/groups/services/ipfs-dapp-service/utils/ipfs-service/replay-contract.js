require("babel-core/register");
require("babel-polyfill");
const { JsonRpc } = require("dfuse-eoshttp-js")
const token = process.env.DFUSE_API_KEY;
const dfuse_endpoint = process.env.DFUSE_ENDPOINT || "mainnet.eos.dfuse.io";
const fetch = require('node-fetch');
const blockCount = process.env.BLOCK_COUNT_PER_QUERY || 1000000;
const rpc = new JsonRpc(`https://${dfuse_endpoint}`, { fetch, token })

const contractAccount = process.env.CONTRACT;
const Eos = require('eosjs');
const endpoint = `http${process.env.NODEOS_SECURED == "true" ? "s" : ""}://${process.env.NODEOS_HOST || "localhost"}:${process.env.NODEOS_PORT || "13115"}`;
const url = `${endpoint}/event`;
const { Serialize } = require('./services/demux/eosjs2');
const { TextDecoder, TextEncoder } = require('text-encoding');
const { hexToUint8Array, arrayToHex } = Serialize;

var eosconfig = {
    expireInSeconds: 1200,
    sign: true,
    httpEndpoint: endpoint,
    chainId: process.env.NODEOS_CHAINID
};

const toHHMMSS = function(sec_num) {
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }
    return hours + ':' + minutes + ':' + seconds;
}
const handleTrace = async(action_trace) => {
    res.push(action_trace);
}
const searchQuery = `receiver:${contractAccount}`

const handleTraces = async(action_trace) => {
    await handleTrace(action_trace);
    if (!action_trace.inline_traces)
        return;
    for (var i = 0; i < action_trace.inline_traces.length; i++)
        await handleTraces(action_trace.inline_traces[i]);

}

const handleSingleTrx = async(trx) => {
    for (var i = 0; i < trx.execution_trace.action_traces.length; i++)
        await handleTraces(trx.execution_trace.action_traces[i]);

}
const getTransactions = async(handle, startat, cursor) => {
    var response;
    try {
        response = await rpc.search_transactions(searchQuery, { start_block: startat, sort: 'asc', block_count: blockCount, cursor, limit: 100 });
    }
    catch (e) {
        e.response.body.pipe(process.stdout);
        return;
    }
    if (!response.transactions || response.transactions.length === 0)
        return;
    await Promise.all(response.transactions.map(trx => handle(trx.lifecycle)));
    if (response.cursor)
        await getTransactions(handle, startat, response.cursor);
}
var cnt = 0;
var totalSize = 0;
// var eosPrivate = new Eos(eosconfig);
var start = new Date();
var remainingTime;
var passedTime;
var speed;
async function clean(hexData) {
    if (hexData.length == 0)
        return;
    var buffer = new Serialize.SerialBuffer({
        textEncoder: new TextEncoder(),
        textDecoder: new TextDecoder(),
    });
    const origBuffer = hexToUint8Array(hexData);
    // buffer.pushVaruint32(origBufffer.length);
    buffer.pushBytes(origBuffer)
    buffer.restartRead();
    var bytes = buffer.getUint8Array(buffer.length);
    const res = arrayToHex(bytes);
    const base64data = Buffer.from(res, 'hex').toString('base64')
    const body = {
        "receiver": "dappservices",
        "method": "usage",
        "account": "dappservices",
        "data": {
            "usage_report": {
                "quantity": "0.0001 QUOTA",
                "provider": "",
                "payer": contractAccount,
                "service": "ipfsservice1",
                "package": "default",
                "success": 0
            }
        },
        "event": { "version": "1.0", "etype": "service_request", "payer": contractAccount, "service": "ipfsservice1", "action": "commit", "provider": "", "data": base64data },
        "meta": {
            "block_num": 170,
            "block_time": "2019-03-21T10:35:03.500",
            "elapsed": 275,
            "trx_id": "79936d0e3f2767c0fc176b90a69585d8b8334dd0c4efbb549ae3295993048e28",
            "receipt": {
                "receiver": "dappservices",
                "act_digest": "77f94e3cda1c581b9733654e649f2e970212749a3946c9bf1e2b1fbbc2a74247",
                "global_sequence": 684,
                "recv_sequence": 94,
                "auth_sequence": [
                    [
                        "ipfsservice1",
                        172
                    ]
                ],
                "code_sequence": 1,
                "abi_sequence": 3
            },
            "context_free": false,
            "producer_block_id": null,
            "account_ram_deltas": [],
            "except": null
        },
        "replay": true
    };
    var r = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
    (await r.text());
    totalSize += (hexData.length / 2) + 320
    if (++cnt % 5 == 0) {

        passedTime = (new Date().getTime() - start.getTime()) / 1000.0;
        // remainingTime = passedTime / pcnt;
        speed = (totalSize / (1024 * passedTime)).toFixed(2);
    }
    process.stdout.write("\r");
    process.stdout.write(`sent ${thelowest} ${cnt} saved ${(totalSize / (1024)).toFixed(2)}KB ${speed}KB/s                    `);

}
var thelowest = 0;

function chunk(arr, len) {

    var chunks = [],
        i = 0,
        n = arr.length;

    while (i < n) {
        chunks.push(arr.slice(i, i += len));
    }

    return chunks;
}
var res = [];

let lastBlock = 48623067;
async function run(lower_bound) {

    while (true) {
        var found = false;
        await getTransactions(trx => {
            const curLastBlock = parseInt(trx.execution_trace.block_num);
            if (curLastBlock >= lastBlock)
                lastBlock = curLastBlock + 1;
            // res.push(trx);
            // handleSingleTrx(trx)
            handleSingleTrx(trx);
            found = true;
            // lastBlock = trxs[trxs.length - 1].execution_trace.block_num;
        }, lastBlock);
        if (!found)
            break;
    }
    // res = res.map(a =>action_traces)
    var events = [];
    res = res.map(a => a.console).filter(a => a !== '');
    res.forEach(a => {
        a.split('\n').forEach(line => {
            try {
                const event = JSON.parse(line)
                events.push(event);
            }
            catch (e) {}
        })
    });
    var commits = events.filter(a => a.etype === "service_request" && a.service === "ipfsservice1" &&
        (a.action === "commit" || a.action === "cleanup")).map(a => a.data)
    commits = [...new Set(commits)];
    var chunks = chunk(commits, 1);
    for (var i = chunks.length; i--;) {
        var entries = chunks[i];
        // console.log(entries);
        await Promise.all(entries.map(a => {
            return clean(Buffer.from(a, 'base64').toString('hex'));
        }));
    }
    if (res.more) {
        return run(res.rows[res.rows.length - 1].id);
    }
}
run().then(a => {
    console.log(a);
})
