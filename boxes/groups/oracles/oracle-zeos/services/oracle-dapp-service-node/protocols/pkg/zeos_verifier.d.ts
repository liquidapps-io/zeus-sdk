/* tslint:disable */
/* eslint-disable */
/**
* @param {Uint8Array} proof
* @param {Uint8Array} inputs
* @param {Uint8Array} vk
* @returns {boolean}
*/
export function verify_halo2_proof(proof: Uint8Array, inputs: Uint8Array, vk: Uint8Array): boolean;
/**
* @param {Uint8Array} proof
* @param {Uint8Array} inputs
* @param {Uint8Array} vk
* @returns {boolean}
*/
export function verify_groth16_proof(proof: Uint8Array, inputs: Uint8Array, vk: Uint8Array): boolean;
/**
* @param {Uint8Array} proof
* @param {Uint8Array} inputs
* @param {Uint8Array} vk
* @returns {boolean}
*/
export function verify_zeos_proof(proof: Uint8Array, inputs: Uint8Array, vk: Uint8Array): boolean;
