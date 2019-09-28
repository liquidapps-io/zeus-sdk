import * as endpoints from "./types/endpoints";
import { delay } from "./utils";
import {
    GetInfo,
    GetTableRows,
} from "./types";
import { HttpClient, Fetch } from "./http-client";

/**
 * EOSIO Client
 *
 * @name EosioClient
 * @param {string} network network
 * @param {object} [options={}] optional params
 * @param {endpoint} [options.endpoint] dsp endpoint
 * @param {Fetch} [options.fetch=global.fetch] fetch
 * @example
 *
 * const network = "kylin"
 * const endpoint = "https://kylin-dsp-2.liquidapps.io"
 * const client = new EosioClient(network, { endpoint, fetch })
 */
export class EosioClient extends HttpClient {
    constructor( network: string, options: {
        endpoint?: string,
        fetch?: Fetch,
        api?: any
    } = {} ) {
        super( network, options );
    }

    /**
     * [GET /v1/chain/get_table_rows](https://developers.eos.io/eosio-nodeos/reference#get_table_rows)
     *
     * Returns an object containing rows from the specified table.
     *
     * @param {string} code The name of the smart contract that controls the provided table
     * @param {string} scope The account to which this data belongs
     * @param {string} table The name of the table to query
     * @param {object} [options={}] optional params
     * @param {string} [options.lower_bound] Filters results to return the first element that is not less than provided value in set
     * @param {string} [options.upper_bound] Filters results to return the first element that is greater than provided value in set
     * @param {number} [options.limit=10] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @param {boolean} [options.json=true] JSON response
     * @param {number} [options.index_position=1] Position of the index used
     * @param {string} [options.key_type] Type of key specified by index_position (for example - uint64_t or name)
     * @param {string} [options.table_key] Table Key
     * @param {string} [options.encode_type] Encode type
     * @returns {Promise<GetTableRows>} table rows
     * @example
     *
     * const response = await rpc.get_table_rows("<code>", "<scope>", "<table>");
     * console.log(response);
     */
    public get_table_rows<T = unknown>( code: string, scope: string, table: string, options: {
        index_position?: number,
        json?: boolean,
        key_type?: string,
        lower_bound?: string,
        upper_bound?: string,
        table_key?: string,
        encode_type?: string,
        show_payer?: boolean,
        limit?: number,
    } = {} ) {
        // Optional params
        const json = options.json === false ? false : true;
        const index_position = options.index_position || 1;
        const limit = options.limit || 10;
        const key_type = options.key_type || "";
        const table_key = options.table_key || "";
        const lower_bound = options.lower_bound || "";
        const upper_bound = options.upper_bound || "";
        const encode_type = options.encode_type || "";
        const show_payer = options.show_payer === true ? true : false;

        return this.post<GetTableRows<T>>( endpoints.V1_GET_TABLE_ROWS, {
            code,
            table,
            scope,
            json,
            index_position,
            key_type,
            table_key,
            lower_bound,
            upper_bound,
            encode_type,
            show_payer,
            limit,
        } );
    }

    /**
     * [GET /v1/chain/get_table_rows](https://developers.eos.io/eosio-nodeos/reference#get_table_rows)
     *
     * Returns all objects containing rows from the specified table.
     *
     * @param {string} code The name of the smart contract that controls the provided table
     * @param {string} scope The account to which this data belongs
     * @param {string} table The name of the table to query
     * @param {string} lower_bound_key Key value to identify `lower_bound` object
     * @param {object} [options={}] optional params
     * @param {string} [options.lower_bound] Filters results to return the first element that is not less than provided value in set
     * @param {string} [options.upper_bound] Filters results to return the first element that is greater than provided value in set
     * @param {number} [options.limit=1500] Limit the result amount per `get_table_rows` API request
     * @param {boolean} [options.show_payer=false] Show Payer
     * @param {boolean} [options.json=true] JSON response
     * @param {number} [options.index_position=1] Position of the index used
     * @param {string} [options.key_type] Type of key specified by index_position (for example - uint64_t or name)
     * @param {string} [options.table_key] Table Key
     * @param {string} [options.encode_type] Encode type
     * @param {number} [options.delay_ms] Delay in ms between API calls (helps prevents rate limited APIs)
     * @returns {Promise<GetTableRows>} table rows
     * @example
     *
     * const response = await rpc.get_all_table_rows("<code>", "<scope>", "<table>", "<lower_bound_key>");
     * console.log(response);
     */
    public async get_all_table_rows<T = unknown>( code: string, scope: string, table: string, lower_bound_key: string, options: {
        index_position?: number,
        json?: boolean,
        key_type?: string,
        lower_bound?: string,
        upper_bound?: string,
        table_key?: string,
        encode_type?: string,
        show_payer?: boolean,
        limit?: number,
        delay_ms?: number,
    } = {} ): Promise<GetTableRows<T>> {
        // Optional params from `get_table_rows`
        const json = options.json === false ? false : true;
        const index_position = options.index_position || 1;
        const limit = options.limit || 1500;
        const key_type = options.key_type || "";
        const table_key = options.table_key || "";
        const upper_bound = options.upper_bound || "";
        const encode_type = options.encode_type || "";
        const show_payer = options.show_payer === true ? true : false;
        // Delay in ms between API calls (helps prevents rate limited APIs)
        const delay_ms = options.delay_ms || 10;
        // Track latest used `lower_bound` unique identifier key
        let lower_bound = options.lower_bound || "";
        // Data container
        const rows = new Map<string, T>();
        while ( true ) {
            const response = await this.get_table_rows<any>( code, scope, table, {
                json,
                index_position,
                limit,
                key_type,
                table_key,
                lower_bound,
                upper_bound,
                encode_type,
                show_payer,
            } );
            for ( const row of response.rows ) {
                // Adding to Map removes duplicates entries
                const key = row[lower_bound_key];
                rows.set( key, row );

                // Set lower bound
                lower_bound = key;
            }
            // prevent hitting rate limits from API endpoints
            await delay( delay_ms );

            // end of table rows
            if ( response.more === false ) { break; }
        }
        
        return {
            more: false,
            rows: Array.from( rows.values() ),
        };
    }

    /**
     * [GET /v1/chain/get_info](https://developers.eos.io/eosio-nodeos/reference#get_info)
     *
     * Returns an object containing various details about the blockchain.
     *
     * @returns {Promise<GetInfo>} table rows
     * @example
     *
     * const response = await rpc.get_info();
     * console.log(response);
     */
    public get_info() {
        return this.post<GetInfo>( endpoints.V1_GET_INFO );
    }
}
