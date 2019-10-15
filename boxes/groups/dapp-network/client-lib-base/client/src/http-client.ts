import { RpcError, RpcStatusError } from "./types/error";
import { HttpQueryParameters } from "./types/http-client";
import network_config from "./network-config.json";

function inferFetch( fetch?: Fetch ): Fetch {



    // In both of the condition below to determine a global `fetch` to use,
    // we bind the `fetch` method to the global scope (either `window` or `global`
    // depending on the target environment).
    //
    // It happens in a bundler environment like WebPack that the `fetch` method
    // loses it's contextual `this` variable. The `this` is used internal by the
    // implementation for certain features of the specification.
    //
    // By doing a `.bind(<global scope>)`, we ensure the `fetch` remains bound
    // to the correct `this` variable.

    // If we are in a Browser environment and `fetch` is available, use it
    if ( typeof window !== "undefined" && window.fetch != null ) {
      return window.fetch.bind( window );
    }

    // If we are in a Node.js like environment and `fetch` is available, use it
    if ( typeof global !== "undefined" && ( global as any ).fetch != null ) {
      return ( global as any ).fetch.bind( global );
    }

    // Otherwise, throw an exception
    const messages = [
      "You did not provide a `fetch` option and we were not able to infer one from the global scope.",
      "",
      "You are most likely in a Node.js environment where a global `fetch` is not available by defaut.",
      "To resolve the issue, either pass a compatible `fetch` option or globally defined a `global.fetch`",
      "variable pointing to a compatible `fetch` method.",
    ];

    throw new RpcError( messages.join( "\n" ) );
  }

function queryParams( params: HttpQueryParameters ) {
    const entries = [];
    for ( const key of Object.keys( params ) ) {
        const value = params[key];
        if ( value !== undefined ) {
            entries.push( encodeURIComponent( key ) + "=" + encodeURIComponent( value ) );
        }
    }
    return entries.join( "&" );
}

export type Fetch = ( url: string | Request, init?: RequestInit ) => Promise<Response>;
declare const global: any;

/**
 * Default HTTP Client
 *
 * @private
 * @name DappClient
 * @param {string} network network
 * @param {object} [options={}] optional params
 * @param {endpoint} [options.endpoint] dsp endpoint
 * @param {Fetch} [options.fetch=global.fetch] fetch
 * @example
 *
 * const network = "kylin"
 * const endpoint = "https://kylin-dsp-2.liquidapps.io"
 * const client = new HttpClient(network, { endpoint, fetch })
 */
export class HttpClient {
    public network: string;
    public endpoint: string;
    public fetch: Fetch;
    public api: any;

    constructor( network: string, options: {
        endpoint?: string,
        fetch?: Fetch,
        api?: any
    } = {} ) {
        this.network = network;
        this.endpoint = options.endpoint || "";
        this.fetch = inferFetch( options.fetch );
        this.api = options.api;
    }

    /**
     * post
     *
     * POST `body` to `endpoint + path`.
     * Throws detailed error information in `RpcError` when available.
     *
     * @private
     */
    public async post<T>( path: string, body = {}, options: {
        contract?: string,
        network?: string,
    } = {} ): Promise<T> {
        // set DSP API endpoint if not set, otherwise set regular API
        // endpoint if no contract provided to query for package
        let response, json;
        try {
            response = await this.fetch( this.endpoint + path, {
                body: JSON.stringify( body ),
                method: "POST",
            } );
            json = await response.json();
            if ( json.processed && json.processed.except ) {
                throw new RpcStatusError( json );
            }
        } catch ( e ) {
            e.isFetchError = true;
            throw e;
        }
        if ( response && !response.ok ) {
           throw new RpcError( json );
        }
        return json;
    }

    /**
     * get
     *
     * GET `params` to `endpoint + path`.
     * Throws detailed error information in `RpcError` when available.
     *
     * @private
     */
    public async get<T>( path: string, params?: any ): Promise<T> {
        // set API endpoint if not set
        let response, json;
        const url = params ?
            this.endpoint + path + "?" + queryParams( params ) :
            this.endpoint + path;
        try {
            response = await this.fetch( url, {
                method: "GET",
            } );
            if ( response.status !== 200 ) {
                throw new RpcStatusError( response );
            }
            json = await response.json();
            if ( json.processed && json.processed.except ) {
                throw new RpcError( json );
            }
        } catch ( e ) {
            e.isFetchError = true;
            throw e;
        }
        if ( !response.ok ) {
            throw new RpcError( json );
        }
        return json;
    }
}
