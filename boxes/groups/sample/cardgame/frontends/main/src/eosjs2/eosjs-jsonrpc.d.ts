/**
 * @module JSON-RPC
 */
import { AbiProvider, AuthorityProvider, AuthorityProviderArgs, BinaryAbi } from "./eosjs-api-interfaces";
import { GetAbiResult, GetBlockResult, GetCodeResult, GetInfoResult, GetRawCodeAndAbiResult, PushTransactionArgs } from "./eosjs-rpc-interfaces";
/** Make RPC calls */
export default class JsonRpc implements AuthorityProvider, AbiProvider {
    endpoint: string;
    fetchBuiltin: (input?: Request | string, init?: RequestInit) => Promise<Response>;
    /**
     * @param args
     *    * `fetch`:
     *      * browsers: leave `null` or `undefined`
     *      * node: provide an implementation
     */
    constructor(endpoint: string, args?: {
        fetch?: (input?: string | Request, init?: RequestInit) => Promise<Response>;
    });
    /** Post `body` to `endpoint + path`. Throws detailed error information in `RpcError` when available. */
    fetch(path: string, body: any): Promise<any>;
    /** Raw call to `/v1/chain/get_abi` */
    get_abi(account_name: string): Promise<GetAbiResult>;
    /** Raw call to `/v1/chain/get_account` */
    get_account(account_name: string): Promise<any>;
    /** Raw call to `/v1/chain/get_block_header_state` */
    get_block_header_state(block_num_or_id: number | string): Promise<any>;
    /** Raw call to `/v1/chain/get_block` */
    get_block(block_num_or_id: number | string): Promise<GetBlockResult>;
    /** Raw call to `/v1/chain/get_code` */
    get_code(account_name: string): Promise<GetCodeResult>;
    /** Raw call to `/v1/chain/get_currency_balance` */
    get_currency_balance(code: string, account: string, symbol?: string): Promise<any>;
    /** Raw call to `/v1/chain/get_currency_stats` */
    get_currency_stats(code: string, symbol: string): Promise<any>;
    /** Raw call to `/v1/chain/get_info` */
    get_info(): Promise<GetInfoResult>;
    /** Raw call to `/v1/chain/get_producer_schedule` */
    get_producer_schedule(): Promise<any>;
    /** Raw call to `/v1/chain/get_producers` */
    get_producers(json?: boolean, lower_bound?: string, limit?: number): Promise<any>;
    /** Raw call to `/v1/chain/get_raw_code_and_abi` */
    get_raw_code_and_abi(account_name: string): Promise<GetRawCodeAndAbiResult>;
    /** calls `/v1/chain/get_raw_code_and_abi` and pulls out unneeded raw wasm code */
    getRawAbi(accountName: string): Promise<BinaryAbi>;
    /** Raw call to `/v1/chain/get_table_rows` */
    get_table_rows({ json, code, scope, table, table_key, lower_bound, upper_bound, limit }: any): Promise<any>;
    /** Get subset of `availableKeys` needed to meet authorities in `transaction`. Implements `AuthorityProvider` */
    getRequiredKeys(args: AuthorityProviderArgs): Promise<string[]>;
    /** Push a serialized transaction */
    push_transaction({ signatures, serializedTransaction }: PushTransactionArgs): Promise<any>;
    /** Raw call to `/v1/db_size/get` */
    db_size_get(): Promise<any>;
    /** Raw call to `/v1/history/get_actions` */
    history_get_actions(account_name: string, pos?: number, offset?: number): Promise<any>;
    /** Raw call to `/v1/history/get_transaction` */
    history_get_transaction(id: string, block_num_hint?: number): Promise<any>;
    /** Raw call to `/v1/history/get_key_accounts` */
    history_get_key_accounts(public_key: string): Promise<any>;
    /** Raw call to `/v1/history/get_controlled_accounts` */
    history_get_controlled_accounts(controlling_account: string): Promise<any>;
}
