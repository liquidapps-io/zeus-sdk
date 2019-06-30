/**
 * @module RPC-Error
 */
/** Holds detailed error information */
export default class RpcError extends Error {
    /** Detailed error information */
    json: any;
    constructor(json: any);
}
