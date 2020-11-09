const Long = require('long');
const { sha256 } = require("js-sha256");
const async = require('async');
const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');  
const { Fetch }  = require("./http-client");
const { TextEncoder, TextDecoder } = require('util');   
const sleepTime = process.env.DAPP_CLIENT_PUSH_TRANSACTION_SLEEP || 10;

export function encodeName(name: string, littleEndian = true) {
    const charmap = '.12345abcdefghijklmnopqrstuvwxyz'
    const charidx = (ch: string) => {
        const idx = charmap.indexOf(ch)
        if (idx === -1)
            throw new TypeError(`Invalid character: '${ch}'`)
        return idx
    }
    if (typeof name !== 'string')
        throw new TypeError('name parameter is a required string')
    if (name.length > 12)
        throw new TypeError('A name can be up to 12 characters long')
    let bitstr = ''
    for (let i = 0; i <= 12; i++) { // process all 64 bits (even if name is short)
        const c = i < name.length ? charidx(name[i]) : 0
        const bitlen = i < 12 ? 5 : 4
        let bits = Number(c).toString(2)
        if (bits.length > bitlen) {
            throw new TypeError('Invalid name ' + name)
        }
        bits = '0'.repeat(bitlen - bits.length) + bits
        bitstr += bits
    }
    const value = Long.fromString(bitstr, true, 2)
    // convert to LITTLE_ENDIAN
    let leHex = ''
    const bytes = littleEndian ? value.toBytesLE() : value.toBytesBE()
    for (const b of bytes) {
        const n = Number(b).toString(16)
        leHex += (n.length === 1 ? '0' : '') + n
    }
    const ulName = Long.fromString(leHex, true, 16).toString()
    return ulName.toString()
}

export function toBound(numStr: string, bytes: number){
    return `${( new Array( bytes * 2 + 1 ).join( "0" ) + numStr ).substring( numStr.length ).toUpperCase()}`
};

export function bytesToHex(bytes: string) {
    let leHex = '';
    for (const b of bytes) {
        const n = Number(b).toString(16);
        leHex += (n.length === 1 ? '0' : '') + n;
    }
    return leHex;
}

export function nameToValue(name: string) {
    const charmap = '.12345abcdefghijklmnopqrstuvwxyz';
    const charidx = (ch: string) => {
        const idx = charmap.indexOf(ch);
        if (idx === -1) throw new TypeError(`Invalid character: '${ch}'`);
        return idx;
    };
    if (typeof name !== 'string') throw new TypeError('name parameter is a required string');
    if (name.length > 12) throw new TypeError('A name can be up to 12 characters long');
    let bitstr = '';
    for (let i = 0; i <= 12; i++) {
        // process all 64 bits (even if name is short)
        const c = i < name.length ? charidx(name[i]) : 0;
        const bitlen = i < 12 ? 5 : 4;
        let bits = Number(c).toString(2);
        if (bits.length > bitlen) {
            throw new TypeError('Invalid name ' + name);
        }
        bits = '0'.repeat(bitlen - bits.length) + bits;
        bitstr += bits;
    }
    return Long.fromString(bitstr, true, 2);
}

export function getTableBoundsForName(name: string, asLittleEndianHex = true) {
    const nameValue = this.nameToValue(name);
    const nameValueP1 = nameValue.add(1);
    if (!asLittleEndianHex) {
        return {
            lower_bound: nameValue.toString(),
            upper_bound: nameValueP1.toString()
        };
    }
    const lowerBound = this.bytesToHex(nameValue.toBytesLE());
    const upperBound = this.bytesToHex(nameValueP1.toBytesLE());
    return {
        lower_bound: lowerBound,
        upper_bound: upperBound,
    };
}

export function hashData256(data) {
    var hash = sha256.create();
    hash.update(data);
    return hash.hex();
};

const retryTrx = async (api, serializedTransaction) => {
    try {
        await api.pushSignedTransaction(serializedTransaction);
    } catch(e) {
        if(JSON.stringify(e).includes(`duplicate transaction`)) {
            if (process.env.VERBOSE_LOGS) console.log(`duplicate trx, big train keep on rolling`)
        } else {
            console.log(e);
        }
    }
}

const handlePushGuaranteeLevel = async (rpc, api, account, actor, action, data, push_guarantee, trxId, blockNum, serializedTransaction) => {
    switch(push_guarantee) {
        case 'in-block':
            if (process.env.VERBOSE_LOGS) console.log(`in-block`)
            await checkInBlock(rpc, api, account, actor, action, data, push_guarantee, trxId, blockNum, serializedTransaction);
            break;
        case 'handoffs:1':
            if (process.env.VERBOSE_LOGS) console.log(`handoffs:1`)
            await checkHandoffs(rpc, api, account, actor, action, data, push_guarantee, trxId, blockNum, serializedTransaction, 1);
            break;
        case 'handoffs:2':
            if (process.env.VERBOSE_LOGS) console.log(`handoffs:2`)
            await checkHandoffs(rpc, api, account, actor, action, data, push_guarantee, trxId, blockNum, serializedTransaction, 2);
            break;
        case 'handoffs:3':
            if (process.env.VERBOSE_LOGS) console.log(`handoffs:3`)
            await checkHandoffs(rpc, api, account, actor, action, data, push_guarantee, trxId, blockNum, serializedTransaction, 3);
            break;
        case 'irreversible':
            if (process.env.VERBOSE_LOGS) console.log(`irreversible`)
            await checkIrreversible(rpc, api, trxId, blockNum, serializedTransaction);
            break;
    }
}

const handlerMain = async (rpc, api, account, actor, action, data, push_guarantee = 'in-block', retryTrxSerialized = '') => {
    try {
        const useLastIrreversible = push_guarantee === 'irreversible' ? true : false;
        // update
        const expireSeconds = 300;
        let serializedTransaction;
        if(retryTrxSerialized) {
            serializedTransaction = retryTrxSerialized
        } else {
            serializedTransaction = await api.transact({
                actions: [{
                account: account,
                name: action,
                authorization: [{
                    actor,
                    permission: 'active',
                }],
                data,
                }]
            }, {
                blocksBehind: 3,
                expireSeconds,
                broadcast: false,
                useLastIrreversible
            });
        }
        const result = await api.pushSignedTransaction(serializedTransaction);
        const trxId = result.transaction_id;
        const blockNum = result.processed.block_num;
        await handlePushGuaranteeLevel(rpc, api, account, actor, action, data, push_guarantee, trxId, blockNum, serializedTransaction);
    } catch(e) {
        if(JSON.stringify(e).includes(`duplicate transaction`)) {
            console.log(`trx unable to be verified in-block, duplicate trx indicates trx exists`)
        } else {
            console.log(e)
        }
    }
}

export const pushGuaranteeQue = async.queue(function({endpoint, account, actor, action, data, private_key, push_guarantee}) {
    const defaultPrivateKey = private_key;
    const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
    const rpc = new JsonRpc(endpoint, { fetch: Fetch });
    const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
    handlerMain(rpc, api, account, actor, action, data, push_guarantee)
}, 1);

pushGuaranteeQue.drain = function() {
    if (process.env.VERBOSE_LOGS) console.log('All items have been processed')
};

function sleep(ms): any {
    if (process.env.VERBOSE_LOGS) console.log('Waiting to check in block again')
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

const handleFound = async (blockDetails, blockNum, trxId, api, serializedTransaction) => {
    let found = false;
    for(const el of blockDetails.transactions) {
        if(el.trx.id == trxId) {
            if (process.env.VERBOSE_LOGS) console.log(`trx id found in block ${blockNum}`)
            found = true
        }
    }
    if(!found) {
        if (process.env.VERBOSE_LOGS) console.log(`Could not find ${trxId} in block ${blockNum}, incrementing block`)
        blockNum++;
        if (process.env.VERBOSE_LOGS) console.log(`retrying trx`)
        await retryTrx(api, serializedTransaction);
    }
    return { found, blockNum }
}

const handleProducers = (producers, headBlockProducer, push_guarantee) => {
    if(producers.indexOf(headBlockProducer) === -1) {
        producers.push(headBlockProducer)
    } else if(push_guarantee.includes('handoffs')){
        if(process.env.VERBOSE_LOGS) console.log(`producer ${headBlockProducer} already in array`)
    }
    return producers;
}

const handlePushGuarantee = async (trxId,  blockNum, api, rpc, serializedTransaction, push_guarantee, producers) => {
    const blockDetails = await rpc.get_block(blockNum);
    const getInfo = await rpc.get_info();
    const headBlockProducer = getInfo.head_block_producer;
    const last_irreversible_block = getInfo.last_irreversible_block_num;
    producers = handleProducers(producers, headBlockProducer, push_guarantee);
    const foundObj = await handleFound(blockDetails, blockNum, trxId, api, serializedTransaction)
    blockNum = foundObj.blockNum
    const found = foundObj.found
    return { producers, blockNum, found, last_irreversible_block };
}

export const checkInBlock = async (rpc, api, account, actor, action, data, push_guarantee, trxId, blockNum, serializedTransaction, tries = 0) => {
    let found
    while (!found) {
        if (process.env.VERBOSE_LOGS) console.log(`hit in block with tries: ${tries}`)
        if(tries > 100) { 
            return await handlerMain(rpc, api, account, actor, action, data, push_guarantee, serializedTransaction)
        }
        try {
            let obj = await handlePushGuarantee(trxId,  blockNum, api, rpc, serializedTransaction, 'in-block', []);
            blockNum = obj.blockNum
            found = obj.found
        } catch(e) {
            if(JSON.stringify(e).includes(`Could not find block`)) {
                if (process.env.VERBOSE_LOGS) console.log(`Could not find block`)
            } else {
                console.log(e)
            }
        }
        const timer = await sleep(sleepTime);
        clearTimeout(timer);
        tries++;
    }
}

export const checkHandoffs = async (rpc, api, account, actor, action, data, push_guarantee, trxId, blockNum, serializedTransaction, handoffs, tries = 0) => {
    let producers = [];
    while (handoffs > producers.length - 1) {
        if (process.env.VERBOSE_LOGS) console.log(`hit handoffs-${handoffs} with tries: ${tries} and current handoffs: ${producers.length - 1}`)
        if(tries > (100 * handoffs * 7)) { 
            return await handlerMain(rpc, api, account, actor, action, data, push_guarantee, serializedTransaction)
        }
        try {
            let obj = await handlePushGuarantee(trxId,  blockNum, api, rpc, serializedTransaction, push_guarantee, producers);
            producers = obj.producers
            blockNum = obj.blockNum
        } catch(e) {
            if(JSON.stringify(e).includes(`Could not find block`)) {
                if (process.env.VERBOSE_LOGS) console.log(`Could not find block ${blockNum}`)
            } else {
                console.log(e)
            }
        }
        const timer = await sleep(sleepTime);
        clearTimeout(timer);
        tries++;
    }
    if (process.env.VERBOSE_LOGS) console.log(`producers handed off ${producers}`)
}

export const checkIrreversible = async (rpc, api, trxId, blockNum, serializedTransaction, tries = 0) => {
    let last_irreversible_block = 0;
    while (blockNum > last_irreversible_block) {
        if (process.env.VERBOSE_LOGS) console.log(`hit irreversible with tries: ${tries} and current gap behind LIB: ${blockNum - last_irreversible_block}`)
        try {
            let obj = await handlePushGuarantee(trxId, blockNum, api, rpc, serializedTransaction, 'irreversible', []);
            blockNum = obj.blockNum
            last_irreversible_block = obj.last_irreversible_block
        } catch(e) {
            if(JSON.stringify(e).includes(`Could not find block`)) {
                if (process.env.VERBOSE_LOGS) console.log(`Could not find block ${blockNum}`)
            } else {
                console.log(e)
            }
        }
        const timer = await sleep(sleepTime);
        clearTimeout(timer);
        tries++;
    }
    if (process.env.VERBOSE_LOGS) console.log(`blockNum: ${blockNum} last_irreversible_block: ${last_irreversible_block}`)
}