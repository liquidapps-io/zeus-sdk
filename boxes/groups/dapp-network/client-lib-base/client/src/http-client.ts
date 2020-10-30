import { RpcError, RpcStatusError } from "./types/error";
import { HttpQueryParameters } from "./types/http-client";
import network_config from "./network-config.json";
import WebSocketClient from 'ws';
import { createDfuseClient, DfuseClient } from '@dfuse/client';
import { IncomingMessage } from "http";

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
 * @param {string} [options.dfuse_key=""] Dfuse API key
 * @param {string} [options.dfuse_guarantee="in-block"] Dfuse Push Guarantee
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
    public dfuse_key?: string;
    public dfuse_guarantee?: string;

    constructor( network: string, options: {
        endpoint?: string,
        fetch?: Fetch,
        api?: any,
        dfuse_key?: string,
        dfuse_guarantee?: string
    } = {} ) {
        this.network = network;
        this.endpoint = options.endpoint || "";
        this.fetch = inferFetch( options.fetch );
        this.api = options.api;
        this.dfuse_key = options.dfuse_key || "";
        this.dfuse_guarantee = options.dfuse_guarantee || "in-block";
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
        const headers: HeadersInit = this.dfuse_key ? {
            'Authorization': `Bearer ${await this.getDfuseJwt()}`,
            'X-Eos-Push-Guarantee': `${this.dfuse_guarantee}`
        } : {};
        try {
            response = await this.fetch( this.endpoint + path, {
                body: JSON.stringify( body ),
                method: "POST",
                headers
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
        const headers: HeadersInit = this.dfuse_key ? {
            'Authorization': `Bearer ${await this.getDfuseJwt()}`,
            'X-Eos-Push-Guarantee': `${this.dfuse_guarantee}`
        } : {};
        const url = params ?
            this.endpoint + path + "?" + queryParams( params ) :
            this.endpoint + path;
        try {
            response = await this.fetch( url, {
                method: "GET",
                headers
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

    private webSocketFactory = async (url: string, protocols: string[] = []) => {
        const webSocket = new WebSocketClient(url, protocols, {
          handshakeTimeout: 30 * 1000, // 30s
          maxPayload: 200 * 1024 * 1000 * 1000 // 200Mb
        })
      
        const onUpgrade = (response: IncomingMessage) => {
          console.log("Socket upgrade response status code.", response.statusCode)
      
          // You need to remove the listener at some point since this factory
          // is called at each reconnection with the remote endpoint!
          webSocket.removeListener("upgrade", onUpgrade)
        }
      
        webSocket.on("upgrade", onUpgrade)
      
        return webSocket
    }
    
    private getDfuseJwt = async () => {
        const dfuseClient: DfuseClient = createDfuseClient({
            apiKey: this.dfuse_key,
            network: this.network,
            httpClientOptions: {
              fetch: this.fetch
            },
            graphqlStreamClientOptions: {
              socketOptions: {
                // The WebSocket factory used for GraphQL stream must use this special protocols set
                // We intend on making the library handle this for you automatically in the future,
                // for now, it's required otherwise, the GraphQL will not connect correctly.
                webSocketFactory: (url) => this.webSocketFactory(url, ["graphql-ws"]),
                reconnectDelayInMs: 250
              }
            },
            streamClientOptions: {
              socketOptions: {
                webSocketFactory: (url) => this.webSocketFactory(url)
              }
            }
        });
      const jwtApiKey = await dfuseClient.getTokenInfo();
      return jwtApiKey.token
    }
}
