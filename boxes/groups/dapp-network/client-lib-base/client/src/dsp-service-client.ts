import { EosioClient } from "./eosio-client";

export class DSPServiceClient extends EosioClient{
    public config:any;
    public api: any;
    public contract: string;
    public serviceContract: string;
    constructor( api:any, contract:string, config:any, serviceContract:string ) {
        super(config.network, {endpoint: config.httpEndpoint,
            fetch,
            api});
        this.config = config;
        this.api = api;
        this.contract = contract;
        this.serviceContract = serviceContract;
    }
}

