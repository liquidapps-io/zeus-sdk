import {DSPServiceClient} from '../dsp-service-client';


const serviceContract = "liquidstorag"

export default class LiquidStorageService extends DSPServiceClient {
    auth: any;
    constructor( api:any, contract:string, config:any) {
        super( api, contract, config, serviceContract);
        this.auth = new (require('./auth').default)(api, contract, config);

    }

    public upload_public_file = async (
        buffer: any,
        key: any,
        permission:string = "uploader",
        apiID?:string
    )  => {
        return await this.auth.invokeAuthedCall({ apiID, payload: { data: buffer.toString('hex'), contract: this.contract }, service: serviceContract, account:this.contract, permission, keys:{active:key}, action: "upload_public"});
    }
    public unpin = async (
        uri: any,
        key: any,
        permission:string = "deleter",
        apiID?:string
    )  => {
        return await this.auth.invokeAuthedCall({ apiID, payload: { uri, contract: this.contract }, service: serviceContract, account:this.contract, permission, keys:{active:key}, action: "unpin"});
    }

}