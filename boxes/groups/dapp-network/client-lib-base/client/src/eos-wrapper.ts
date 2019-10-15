import { Api, JsonRpc } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
const { TextDecoder, TextEncoder } = require( "text-encoding" );
import { DappClient } from "./dapp-network";
import { DappAirHODLClient } from "./dapp-airhodl";
import * as provider_info from "./types/dsp/provider_info";

async function createClient(config: {
    network?: string,
    expireSeconds?: Number,
    sign?: Boolean,
    broadcast?: Boolean,
    keyProvider?: any,
    httpEndpoint?: string,
    endPointForContract?: string,
    services?: string[],
    fetch?: any,
    blocksBehind?: Number
  }):Promise<any> {
  const defaults = {
    expireSeconds: 60,
    sign: true,
    broadcast: true,
    blocksBehind: 10
  }

  config = {...defaults, ...config};

  let rpc:JsonRpc = new JsonRpc(config.httpEndpoint, { fetch:config.fetch });
  if (config.keyProvider && !Array.isArray(config.keyProvider))
    config.keyProvider = [config.keyProvider];
  const signatureProvider = config.keyProvider ? new JsSignatureProvider(config.keyProvider) : new JsSignatureProvider([]);
  const dappNetwork = new DappClient( "", { endpoint: config.httpEndpoint, fetch:config.fetch } );;
  const dappAirHODLClient = new DappAirHODLClient( "", { endpoint: config.httpEndpoint, fetch:config.fetch } );;
  let api:any = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
  if(config.endPointForContract){
    for (let i=0;i < config.services.length;i++){
      let serviceName = config.services[i];
      const provider_info: provider_info.ApiProvider = await api.dappNetwork.get_package_info( config.endPointForContract, serviceName );
      let endpoint:string = provider_info.api_endpoint;
      if(!endpoint)
        continue;
      config.httpEndpoint = endpoint;

      rpc = new JsonRpc(endpoint, { fetch:config.fetch });
    }
  }
  api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
  api.dappNetwork = dappNetwork;
  api.config = config;
  api.getTableRows = (payload:any) => rpc.get_table_rows(payload);
  api.get_table_rows = (payload:any) => rpc.get_table_rows(payload);
  api.get_info = () => rpc.get_info();
  api.service = (async(service: string, account:string) => {
    let serviceObject = require("./services/" + service + ".js").default;
    let s = await new serviceObject(api, account || config.endPointForContract, config);
    let endpoint:string = s.endpoint;
    const serviceConfig = {...config,httpEndpoint: endpoint}
    return new serviceObject(api, account || config.endPointForContract, serviceConfig);
  }),
  api.airhodl = dappAirHODLClient;
  api.contract = (async(config:any, account:string) => {
    let currentRpc:JsonRpc = rpc;
    let currentApi = api;
    if(config.services){
      for (let i=0;i < config.services.length;i++){
        let serviceName = config.services[i];
        let serviceObject = require("./services/" + serviceName + ".js").default;
        let s = await new serviceObject(api, account, config);
        let endpoint:string = s.endpoint;
        if(!endpoint)
          continue;
        config.httpEndpoint = endpoint;
        currentRpc = new JsonRpc(endpoint, { fetch:config.fetch });
        currentApi = new Api({ rpc:currentRpc, signatureProvider , textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
      }
    }

    const contractObj = await api.getContract(account);
    const { actions } = contractObj;
    let contractWrapper:any = {
      api
    }
    let actionNames = actions.keys();
    for (let nameIter of actionNames) {
      let action = actions.get(nameIter);
      let name = action.name;
      let newFunc = async(action:any, name:string, config:any, ...args:any[]) => {
        let options = args[args.length - 1];
        let transformedData = args.slice(0, args.length - 1);
        if (transformedData.length == 1) {
          transformedData = transformedData[0];
        }
        else {
          let newTransformedData:any = {};
          for (let i = 0; i < transformedData.length; i++) {
            let field = action.fields[i].name;
            newTransformedData[field] = transformedData[i];
          }
          transformedData = newTransformedData;
        }
        let authorization = [];
        if (options.authorization) {
          if (typeof(options.authorization) == 'string')
            options.authorization = [options.authorization];
          for (let i = 0; i < options.authorization.length; i++) {
            const parts = options.authorization[i].split('@');
            let partIdx = 0;
            authorization.push({
              actor: parts[partIdx++],
              permission: parts[partIdx++],
            });
          }
        }
        let finalOpts = { ...defaults, ...config, ...options };
        if (finalOpts.keyProvider !== config.keyProvider) {
          if (!Array.isArray(finalOpts.keyProvider))
            finalOpts.keyProvider = [finalOpts.keyProvider];
          currentApi = new Api({ rpc:currentRpc, signatureProvider: new JsSignatureProvider(finalOpts.keyProvider), textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
        }
        let result;
        try {
          result = await currentApi.transact({
            actions: [{
              account,
              name,
              authorization,
              data: transformedData,
            }]
          }, finalOpts);
        }
        catch (e) {
          if (e.json)
            e.error = e.json.error;
          throw e;
        }
        return result;
      }
      contractWrapper[nameIter] = newFunc.bind(contractWrapper, action, name, config);
    }
    contractWrapper.service = (async(service: string) => {
      let serviceObject = require("./services/" + service + ".js").default;
      return new serviceObject(api, account, config);
    });
    return contractWrapper;
  }).bind(api, config);
  return api;
}

export {createClient};