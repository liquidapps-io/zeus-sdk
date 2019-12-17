import {sha256} from "js-sha256";

const serviceContract = "authfndspsvc"
import {DSPServiceClient} from '../dsp-service-client';
import * as common from "../dapp-common";
import * as get_table_row from "../types/chain/get_table_row";
const defaultAuth:string = `authenticato`;

export default class AuthService extends DSPServiceClient {
    methodSuffix: string;
    chainId: string;
    method: string;
    authContract: string;
    constructor( api:any, contract:string, config:any) {
        super( api, contract, config, serviceContract);
        this.methodSuffix = "authusage";
        this.method = "x" + this.methodSuffix;
        this.authContract = defaultAuth;
        this.chainId = "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906";
    }
    hashData256(data) {
        var hash = sha256.create();
        hash.update(data);
        return hash.hex();
    };


   async createAPICallTransaction(contract:string, method:string, account:string, permission:string, actionData:any, key:any) {
    var opts = {
      authorization: `${account}@${permission}`,
      broadcast: false,
      sign: true,
      keyProvider: [key]
    };
    var theContract = await this.api.contract(contract);

    var trx = await theContract[method](actionData, opts);
    return trx;

  };

  public invokeAuthedCall = async ({
    payload,
    account,
    permission = "active",
    key,
    contract,
    action = 'auth_account_call',
    service = 'authfndspsvc',
  }) =>{

    var payloadStr = JSON.stringify(payload);
    var payload_hash = this.hashData256(payloadStr);
    var actionData = {
      account,
      permission,
      payload_hash,
      client_code: "",
      signature:"",
      current_provider: "",
      "package": ""
    }
    contract = contract || this.authContract;
    var trx = await this.createAPICallTransaction(contract, this.method, account, permission, actionData, key);
    return this.post(`/v1/dsp/${service}/${action}`, {
      trx,
      payload: payloadStr
    }, { contract } );
  };
}
