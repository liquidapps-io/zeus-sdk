let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;
let wasm;
const { TextDecoder } = require(`util`);

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0;
function getUint8Memory0() {
    if (cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @param {Uint8Array} proof
* @param {Uint8Array} inputs
* @param {Uint8Array} vk
* @returns {boolean}
*/
module.exports.verify_halo2_proof = function(proof, inputs, vk) {
    const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(inputs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(vk, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.verify_halo2_proof(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret !== 0;
};

/**
* @param {Uint8Array} proof
* @param {Uint8Array} inputs
* @param {Uint8Array} vk
* @returns {boolean}
*/
module.exports.verify_groth16_proof = function(proof, inputs, vk) {
    const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(inputs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(vk, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.verify_groth16_proof(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret !== 0;
};

/**
* @param {Uint8Array} proof
* @param {Uint8Array} inputs
* @param {Uint8Array} vk
* @returns {boolean}
*/
module.exports.verify_zeos_proof = function(proof, inputs, vk) {
    const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(inputs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(vk, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.verify_zeos_proof(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret !== 0;
};

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

const path = require('path').join(__dirname, 'zeos_verifier_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);

