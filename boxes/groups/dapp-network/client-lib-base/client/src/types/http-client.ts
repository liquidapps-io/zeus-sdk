export type HttpQueryParameters = Record<string, any>;

/**
 * This interface is the bare minimum as required by our internal usage.
 *
 * This is copied to ensure minimal compatiblity with `fetch` is required
 * and thus, it's required to provide a full clone of `fetch` handling.
 * To avoid that problem of over-complexifying , we define a small interface of what we really use
 * inside the library. It's the only part's that are needed.
 *
 * Passing the `window.fetch` (in the Browser) or `global.fetch` (polyfilled in Node.js)
 * should always be accepted as a valid usage.
 *
 * @ignore
 */
export type Fetch = ( url: string, options?: RequestInit ) => Promise<HttpResponse>;

export interface RequestInit {
  body?: any;
  headers?: any;
  method?: string;
}

/**
 * @ignore
 */
export interface HttpBody {
  json(): Promise<any>;
  text(): Promise<string>;
}

/**
 * @ignore
 */
export type HttpResponse = {
  readonly headers: any
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly url: string,
} & HttpBody;
