import {
    Package,
    Accountext,
    Staking,
    Refunds,
} from "./types/dappservices";
import * as provider_info from "./types/dsp/provider_info";
import { Fetch } from "./http-client";
import { EosioClient } from "./eosio-client";
import * as names from "./types/names";
import {getTableBoundsForName} from './dapp-common'

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
export class DappClient extends EosioClient {
    public dappservices = "dappservices";

    constructor( network: string, options: {
        endpoint?: string,
        fetch?: Fetch,
        dappservices?: string,
        api?: any
    } = {} ) {
        super( network, options );
        this.dappservices = options.dappservices || this.dappservices;
    }

    /**
     * Get TABLE package - returns all DSP packages from the dappservices package table
     *
     * @param {object} [options={}] optional params
     * @param {string} [options.lower_bound] Filters results to return the first element that is not less than provided value in set
     * @param {string} [options.upper_bound] Filters results to return the first element that is greater than provided value in set
     * @param {number} [options.limit=1500] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @example
     *
     * const response = await client.get_table_package({ limit: 500 });
     *
     * for (const row of response.rows) {
     *     console.log(row);
     *     // {
     *     //     id: 9,
     *     //     api_endpoint: 'https://kylin-dsp-2.liquidapps.io',
     *     //     package_json_uri: 'https://kylin-dsp-2.liquidapps.io/package1.dsp-package.json',
     *     //     package_id: 'package1',
     *     //     service: 'ipfsservice1',
     *     //     provider: 'heliosselene',
     *     //     quota: '1.0000 QUOTA',
     *     //     package_period: 86400,
     *     //     min_stake_quantity: '10.0000 DAPP',
     *     //     min_unstake_period: 3600,
     *     //     enabled: 1
     *     // }
     * }
     */
    public get_table_package( options: {
        lower_bound?: string,
        upper_bound?: string,
        limit?: number,
        show_payer?: boolean,
    } = {} ) {
        return this.get_all_table_rows<Package>( this.dappservices, this.dappservices, "package", "api_endpoint", options );
    }

    /**
     * Get TABLE package by package name and dsp service - returns DSP packages from the dappservices package table that match the package and dsp service provided
     *
     * @param {string} package dsp package name
     * @param {string} service dsp service
     * @param {string} provider dsp account
     * @param {object} [options={}] optional params
     * @param {number} [options.limit=1500] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @example
     *
     * const response = await client.get_table_package_by_package_service_provider('package1', 'ipfsservice1', 'heliosselene' { limit: 500 });
     *
     * for (const row of response.rows) {
     *     console.log(row);
     *     // {
     *     //     id: 9,
     *     //     api_endpoint: 'https://kylin-dsp-2.liquidapps.io',
     *     //     package_json_uri: 'https://kylin-dsp-2.liquidapps.io/package1.dsp-package.json',
     *     //     package_id: 'package1',
     *     //     service: 'ipfsservice1',
     *     //     provider: 'heliosselene',
     *     //     quota: '1.0000 QUOTA',
     *     //     package_period: 86400,
     *     //     min_stake_quantity: '10.0000 DAPP',
     *     //     min_unstake_period: 3600,
     *     //     enabled: 1
     *     // }
     * }
     */
    public get_table_package_by_package_service_provider( package_name: string, service: string, provider: string) {
        return this.get_table_package_by_package_service_provider_logic( package_name, service, provider);
    }

    /**
     * Get TABLE staking - returns staking information for specified account
     *
     * @param {string} scope dsp account
     * @param {object} [options={}] optional params
     * @param {string} [options.lower_bound] Filters results to return the first element that is not less than provided value in set
     * @param {string} [options.upper_bound] Filters results to return the first element that is greater than provided value in set
     * @param {number} [options.limit=10] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @example
     *
     * const response = await client.get_table_staking('heliosselene', { limit: 500 });
     *
     * for (const row of response.rows) {
     *     console.log(row);
     *     // {
     *     //     id: 0,
     *     //     account: 'heliosselene',
     *     //     balance: '0.0000 DAPP',
     *     //     provider: 'heliosselene',
     *     //     service: 'ipfsservice1'
     *     // }
     * }
     */
    public get_table_staking( scope: string, options: {
        lower_bound?: string,
        upper_bound?: string,
        limit?: number,
        show_payer?: boolean,
    } = {} ) {
        return this.get_table_rows<Staking>( this.dappservices, scope, "staking", options );
    }

    /**
     * Get TABLE refunds - returns refund information for specified account
     *
     * @param {string} scope dsp account
     * @param {object} [options={}] optional params
     * @param {string} [options.lower_bound] Filters results to return the first element that is not less than provided value in set
     * @param {string} [options.upper_bound] Filters results to return the first element that is greater than provided value in set
     * @param {number} [options.limit=10] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @example
     *
     * const response = await client.get_table_refunds('heliosselene', {limit: 500});
     *
     * for (const row of response.rows) {
     *     console.log(row);
     *     // {
     *     //     id: 0,
     *     //     account: 'heliosselene',
     *     //     amount: '10.0000 DAPP',
     *     //     unstake_time: 12345678
     *     //     provider: 'heliosselene',
     *     //     service: 'ipfsservice1'
     *     // }
     * }
     */
    public get_table_refunds( scope: string, options: {
        lower_bound?: string,
        upper_bound?: string,
        limit?: number,
        show_payer?: boolean,
    } = {} ) {
        return this.get_table_rows<Refunds>( this.dappservices, scope, "refunds", options );
    }

    /**
     * Get TABLE accountext - returns all DSP package usage and stake information for all accounts
     *
     * @param {object} [options={}] optional params
     * @param {string} [options.lower_bound] Filters results to return the first element that is not less than provided value in set
     * @param {string} [options.upper_bound] Filters results to return the first element that is greater than provided value in set
     * @param {number} [options.limit=1500] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @example
     *
     * const response = await client.get_table_accountext();
     *
     * for (const row of response.rows) {
     *     console.log(row);
     *     // {
     *     //     id: 29,
     *     //     account: 'heliosselene',
     *     //     service: 'ipfsservice1',
     *     //     provider: 'heliosselene',
     *     //     quota: '0.0001 QUOTA',
     *     //     balance: '255101.1461 DAPP',
     *     //     last_usage: '1555466031000',
     *     //     last_reward: '1555466031000',
     *     //     package: 'package2',
     *     //     pending_package: 'package2',
     *     //     package_started: '1555466031000',
     *     //     package_end: '1555469631000'
     *     // }
     * }
     */
    public get_table_accountext( options: {
        lower_bound?: string,
        upper_bound?: string,
        limit?: number,
        show_payer?: boolean,
    } = {} ) {
        return this.get_all_table_rows<Accountext>( this.dappservices, names.DAPP, "accountext", "account", options );
    }

    /**
     * Get TABLE accountext by account name and dsp service - returns all DSP package usage and stake information for accounts matching the account and dsp service provided
     *
     * @param {string} account staker account
     * @param {string} service dsp service
     * @param {object} [options={}] optional params
     * @param {number} [options.limit=1500] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @example
     *
     * const response = await client.get_table_accountext_by_account_service('cardgame1112', 'ipfsservice1');
     *
     * for (const row of response.rows) {
     *     console.log(row);
     *     // {
     *     //     id: 29,
     *     //     account: 'heliosselene',
     *     //     service: 'ipfsservice1',
     *     //     provider: 'heliosselene',
     *     //     quota: '0.0001 QUOTA',
     *     //     balance: '255101.1461 DAPP',
     *     //     last_usage: '1555466031000',
     *     //     last_reward: '1555466031000',
     *     //     package: 'package2',
     *     //     pending_package: 'package2',
     *     //     package_started: '1555466031000',
     *     //     package_end: '1555469631000'
     *     // }
     * }
     */
    public get_table_accountext_by_account_service( account: string, service: string, options: {
        limit?: number,
        show_payer?: boolean,
        key_type?: string,
        index_position?: number,
    } = {} ) {
        return this.get_table_accountext_by_account_service_logic( account, service );
    }

    /**
     * Get TABLE accountext by account name, DSP service, and DSP provider name - returns all DSP package usage and stake information for accounts matching the account and dsp service provided
     *
     * @param {string} account staker account
     * @param {string} service dsp service
     * @param {string} provider dsp provider
     * @param {object} [options={}] optional params
     * @param {number} [options.limit=1500] Limit the result amount
     * @param {boolean} [options.show_payer=false] Show Payer
     * @example
     *
     * const response = await client.get_table_accountext_by_account_service_provider('cardgame1112', 'ipfsservice1', 'heliosselene');
     *
     * for (const row of response.rows) {
     *     console.log(row);
     *     // {
     *     //     id: 29,
     *     //     account: 'heliosselene',
     *     //     service: 'ipfsservice1',
     *     //     provider: 'heliosselene',
     *     //     quota: '0.0001 QUOTA',
     *     //     balance: '255101.1461 DAPP',
     *     //     last_usage: '1555466031000',
     *     //     last_reward: '1555466031000',
     *     //     package: 'package2',
     *     //     pending_package: 'package2',
     *     //     package_started: '1555466031000',
     *     //     package_end: '1555469631000'
     *     // }
     * }
     */
    public get_table_accountext_by_account_service_provider( account: string, service: string, provider: string, options: {
        limit?: number,
        show_payer?: boolean,
        key_type?: string,
        index_position?: number,
    } = {} ) {
        return this.get_table_accountext_by_account_service_provider_logic( account, service, provider );
    }

    public get_package_info = async ( contract: string, service: string) => {
        const provider_info: provider_info.Package = {
            api_endpoint: "",
            package_json_uri: "",
            package_id: "",
            service: "",
            provider: "",
            quota: "",
            package_period: "",
            min_stake_quantity: "",
            min_unstake_period: "",
            enabled: "",
        };
        const staked_packages = await this.get_table_accountext_by_account_service_logic(
            contract, service);
        // TODO: shuffle packages
        for ( const row of staked_packages.rows ) {
            const el: any = await this.get_table_package_by_package_service_provider_logic(row.package,service,row.provider);
            if ( el.api_endpoint == "null" )
                continue;
            provider_info.api_endpoint = el.api_endpoint;
            provider_info.package_json_uri = el.package_json_uri;
            provider_info.package_id = el.package_id;
            provider_info.service = el.service;
            provider_info.provider = el.provider;
            provider_info.quota = el.quota;
            provider_info.package_period = el.package_period;
            provider_info.min_stake_quantity = el.min_stake_quantity;
            provider_info.min_unstake_period = el.min_unstake_period;
            provider_info.enabled = el.enabled;
            return provider_info;
        }
    }

    private get_table_package_by_package_service_provider_logic(package_name: string, service: string, provider: string) {
        let options:any = {};
        options.key_type = 'sha256';
        options.index_position = 2;
        const packageHexLE = getTableBoundsForName(package_name).lower_bound;
        const serviceBounds = getTableBoundsForName(service).lower_bound;
        const providerBounds = getTableBoundsForName(provider);
        options.lower_bound = `${packageHexLE}${`0`.repeat(16)}${providerBounds.lower_bound}${serviceBounds}`;
        options.upper_bound = `${packageHexLE}${`0`.repeat(16)}${providerBounds.upper_bound}${serviceBounds}`;
        return this.get_table_rows<Package>( this.dappservices, this.dappservices, "package", options );
    }

    private get_table_accountext_by_account_service_logic(account: string, service: string) {
        let options:any = {};
        options.key_type = 'i128';
        options.index_position = 3;
        const accountHexLE = getTableBoundsForName(account).lower_bound;
        const serviceBounds = getTableBoundsForName(service);
        options.lower_bound = `0x${serviceBounds.lower_bound}${accountHexLE}`;
        options.upper_bound = `0x${serviceBounds.upper_bound}${accountHexLE}`;
        return this.get_table_rows<Accountext>( this.dappservices, names.DAPP, "accountext", options );
    }

    private get_table_accountext_by_account_service_provider_logic(account: string, service: string, provider: string ) {
        let options:any = {};
        options.key_type = 'sha256';
        options.index_position = 2;
        const accountHexLE = getTableBoundsForName(account).lower_bound;
        const serviceBounds = getTableBoundsForName(service).lower_bound;
        const providerBounds = getTableBoundsForName(provider);
        options.lower_bound = `${accountHexLE}${`0`.repeat(16)}${providerBounds.lower_bound}${serviceBounds}`;
        options.upper_bound = `${accountHexLE}${`0`.repeat(16)}${providerBounds.upper_bound}${serviceBounds}`;
        return this.get_table_rows<Accountext>( this.dappservices, names.DAPP, "accountext", options );
    }
}
