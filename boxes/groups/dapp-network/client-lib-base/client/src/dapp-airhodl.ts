import { DapphdlAccounts } from "./types/dappairhodl1";
import { Fetch } from "./http-client";
import { EosioClient } from "./eosio-client";

/**
 * Dapp Network Client
 *
 * Library for accessing DAPP Network services
 *
 * @name DappClient
 * @param {string} network network
 * @param {object} [options={}] optional params
 * @param {string} [options.endpoint] dsp endpoint
 * @param {string} [options.dappservices="dappservices"] DAPP Services contract
 * @param {Fetch} [options.fetch=global.fetch] fetch
 * @example
 *
 * const endpoint = "https://kylin-dsp-2.liquidapps.io"
 * const network = "kylin"
 * const client = new DappClient(network { endpoint, fetch })
 */
export class DappAirHODLClient extends EosioClient {
    public dappservices = "dappservices";
    public dappairhodl1 = "dappairhodl1";

    constructor( network: string, options: {
        endpoint?: string,
        fetch?: Fetch,
        dappservices?: string,
        dappairhodl1?: string,
    } = {} ) {
        super( network, options );
        this.dappservices = options.dappservices || this.dappservices;
        this.dappairhodl1 = options.dappairhodl1 || this.dappairhodl1;
    }

    /**
     * Get TABLE accounts from dappairhodl1 contract - returns account information for DAPPHDL tokens
     *
     * @param {string} scope user account
     * @param {object} [options={}] optional params
     * @param {string} [options.lower_bound] Filters results to return the first element that is not less than provided value in set
     * @param {string} [options.upper_bound] Filters results to return the first element that is greater than provided value in set
     * @param {number} [options.limit=10] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @example
     *
     * const response = await client.get_dapphdl_accounts('heliosselene', {limit: 500});
     *
     * for (const row of response.rows) {
     *     console.log(row);
     *     // {
     *     //     balance: '0.0000 DAPPHDL',
     *     //     allocation: '0.0000 DAPPHDL',
     *     //     staked: '0.0000 DAPPHDL',
     *     //     claimed: false
     *     // }
     * }
     */
    public get_dapphdl_accounts( scope: string ) {
        return this.get_table_rows<DapphdlAccounts>( this.dappairhodl1, scope, "accounts" );
    }
}
