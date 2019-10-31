const { getCreateKeys } = require('../../../extensions/helpers/key-utils');
const { loadModels } = require('../../../extensions/tools/models');
const { deserialize, eosDSPGateway, generateABI, genNode, eosPrivate, paccount, forwardEvent, resolveProviderData, resolveProvider, getProviders, resolveProviderPackage, paccountPermission } = require('../../dapp-services-node/common');
const logger = require('../../../extensions/helpers/logger');
const loader = require("assemblyscript/lib/loader");
const fs = require('fs');
const path = require('path');
const util = require('util')

const contractEnv = {
    action_data_size: () => {},
    current_receiver: () => {},
    current_time: () => {},
    db_find_i64: () => {},
    db_get_i64: () => {},
    db_remove_i64: () => {},
    db_store_i64: () => {},
    db_update_i64: () => {},
    db_previous_i64: () => {},
    db_idx256_store: () => {},
    db_next_i64: () => {},
    set_blockchain_parameters_packed: () => {},
    get_blockchain_parameters_packed: () => {},
    set_proposed_producers: () => {},
    get_active_producers: () => {},
    cancel_deferred: () => {},
    db_idx128_store: () => {},
    printhex: () => {},
    db_lowerbound_i64: () => {},
    tapos_block_prefix: () => {},
    db_idx256_find_primary: () => {},
    db_idx256_lowerbound: () => {},
    db_idx128_update: () => {},
    db_idx256_remove: () => {},
    db_idx128_remove: () => {},
    db_idx256_upperbound: () => {},
    db_idx128_lowerbound: () => {},
    db_idx256_update: () => {},
    db_idx128_find_primary: () => {},
    db_idx128_upperbound: () => {},
    db_idx128_next: () => {},
    db_idx256_next: () => {},
    eosio_assert: () => {},
    eosio_exit: () => {},
    print: () => {},
    is_account: () => {},
    memcpy: () => {},
    memset: () => {},
    memmove: () => {},
    read_action_data: () => {},
    require_auth: () => {},
    require_auth2: () => {},
    require_recipient: () => {},
    send_inline: () => {},
    send_deferred: () => {},
    __extendsftf2: () => {},
    __floatsitf: () => {},
    __multf3: () => {},
    __letf2: () => {},
    __ashlti3: () => {},
    __netf2: () => {},
    __subtf3: () => {},
    __trunctfdf2: () => {},
    __getf2: () => {},
    __trunctfsf2: () => {},
    __unordtf2: () => {},
    __fixunstfsi: () => {},
    __fixtfsi: () => {},
    __floatunsitf: () => {},
    __divtf3: () => {},
    __addtf3: () => {},
    __extenddftf2: () => {},
    __eqtf2: () => {},
    eosio_assert_code: () => {},
    prints_l: () => {},
    db_end_i64: () => {},
    sha256: () => {},
    sha1: () => {},
    sha512: () => {},
    assert_recover_key: () => {},
    prints: () => {},
    printn: () => {},
    assert_sha1: () => {},
    assert_sha256: () => {},
    assert_sha512: () => {},
    assert_ripemd160: () => {},
    ripemd160: () => {},
    recover_key: () => {},
    transaction_size: () => {},
    read_transaction: () => {},
}

const env = {
    memoryBase: 0,
    tableBase: 0,
    memory: new WebAssembly.Memory({
        initial: 256
    }),
    table: new WebAssembly.Table({
        initial: 0,
        element: 'anyfunc'
    }),
    abort: () => {
        logger.error('abort');
    },
    __alloc: () => {
        logger.warn('__alloc');
    },
    __retain: () => {
        logger.warn('__retain');
    },
    ...contractEnv
}

function loadWasmForContract(contract_code) {
    return fs.readFileSync(path.join(__dirname, `../../../contracts/eos/${contract_code}/vcpu/${contract_code}-VCPU.wasm`));

}

function arrayBufferToBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

async function run(wasm, fn, payload) {

    module = loader.instantiateSync(wasm, {
        env: { ...env,
            prints: (str) => {
                const U32 = new Uint8Array(module.memory.buffer);
                for (var i = 0; i < 16; i++) {
                    logger.debug(`got1 ${U32[str+i]}`);
                }
            },
            print: (str) => {
                const U32 = new Uint8Array(module.memory.buffer);
                for (var i = 0; i < 16; i++) {
                    logger.debug(`got2 ${U32[str+i]}`);
                }
            },
            prints_l: (str, l) => {
                const U32 = new Uint8Array(module.memory.buffer);
                for (var i = 0; i < 16; i++) {
                    logger.debug(`got3 ${U32[str+i]} ${l}`);
                }
            },
            eosio_assert: (condition, str) => {
                if (!condition) {
                    str = arrayBufferToBuffer(module.__getArrayBuffer(str));
                    logger.debug(`gote ${str}`);
                }
            },


        }
    });

    var payload2 = Buffer.from(payload, 'hex');
    logger.info(`payload2: ${payload2.toString('hex')}`);

    var ptr = module['initialize'](payload2.length);
    let U32 = new Uint8Array(module.memory.buffer);
    for (var i = 0; i < payload2.length; i++) {
        U32[ptr + i] = payload2[i];
    }
    var l = module['run_query'](fn, ptr);
    var resptr = module['initialize'](0);
    var res = new Array(l)
    U32 = new Uint8Array(module.memory.buffer);
    for (var i = 0; i < l; i++) {
        res[i] = U32[resptr + i];
    }
    logger.info(`res: ${Buffer.from(res).toString('hex')}`);
    return res;
}
module.exports = async({ event, rollback }, { uri, payload }, state) => {
    if (rollback) {
        event.action = 'vrunclean';
        console.log('vcpu after failed transaction', uri);
        return {
            size: 0,
            uri
        };
    }
    const { payer, packageid, current_provider } = event;
    var contract_code = payer;
    var loadedExtensions = await loadModels("dapp-services");
    var service = loadedExtensions.find(a => a.name == "vcpu").contract;
    const uriStr = Buffer.from(uri, 'hex').toString('utf8');

    var resolvedPackages = await resolveProviderPackage(contract_code, service, paccount);
    const payloadParts = uriStr.split('://', 4);
    let partIdx = 0;
    const trxId = payloadParts[partIdx++];
    const tapos = payloadParts[partIdx++];
    const method = payloadParts[partIdx++];
    // const payloadhash = payloadParts[partIdx++];

    var wasm = await loadWasmForContract(contract_code);
    let res;
    let data;
    try {
        res = await run(wasm, method, payload);
        data = new Buffer(res, 'base64');
    }
    catch (e) {
        logger.error(`error running vcpu fn: ${e}`);
        return {
            uri,
            data: '',
            size: 0
        };

    }

    return {
        uri,
        data,
        size: data.length
    };

}
