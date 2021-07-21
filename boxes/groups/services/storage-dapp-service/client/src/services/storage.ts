const ecc = require('eosjs-ecc');
const { DSPServiceClient } = require('../dsp-service-client');
const { hashData256 } = require('../dapp-common');

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
        apiID?:string,
        options: {
            // if true, DAG leaves will contain raw file data and not be wrapped in a protobuf
            rawLeaves?: boolean
        } = {},
    )  => {
        options.rawLeaves == false ? false : true;
        return await this.auth.invokeAuthedCall({ 
            apiID, 
            payload: { 
                data: buffer.toString('base64'), 
                contract: this.contract, 
                options
            }, 
            service: serviceContract, 
            account:this.contract, 
            permission, 
            key, 
            action: "upload_public"
        });
    }

    public upload_public_archive = async (
        buffer: any,
        key: any,
        permission:string = "uploader",
        format:string = `tar`,
        apiID?:string,
        options: {
            // if true, DAG leaves will contain raw file data and not be wrapped in a protobuf
            rawLeaves?:boolean
        } = {},
    )  => {
        options.rawLeaves == false ? false : true;
        return await this.auth.invokeAuthedCall({ 
            apiID, 
            payload: {
                archive: 
                    { 
                        format, 
                        data: buffer.toString('base64') 
                    }, 
                contract: this.contract, 
                options
            }, 
            service: serviceContract, 
            account:this.contract, 
            permission, 
            key, 
            action: "upload_public"
        });
    }

    public upload_public_file_from_vaccount = async (
        buffer: Buffer,
        vaccount: {
            key: string,
            name: string
        },
        options: {
            // if true, DAG leaves will contain raw file data and not be wrapped in a protobuf
            rawLeaves?: boolean
        } = {},
    )  => {
        options.rawLeaves == false ? false : true;
        // no contract-level auth verification needed, only vaccount
        const hashHex = hashData256(buffer)
        // sign it directly without hashing again, ecc.sign does hash + sign
        const hashSignature = ecc.signHash(hashHex, vaccount.key, `hex`).toString()
        return this.post(`/v1/dsp/${serviceContract}/upload_public_vaccount`, {
            data: buffer.toString(`base64`),
            hash: hashHex,
            hashSignature,
            vaccountName: vaccount.name,
            contract: this.contract,
            options,
          }, { contract: this.contract } );
    }

    public unpin = async (
        uri: any,
        key: any,
        permission:string = "deleter",
        apiID?:string
    )  => {
        return await this.auth.invokeAuthedCall({ apiID, payload: { uri, contract: this.contract }, service: serviceContract, account:this.contract, permission, key, action: "unpin"});
    }

}