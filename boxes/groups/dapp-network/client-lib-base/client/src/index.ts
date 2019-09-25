// config
// discovery
// wrapper
// per service extension (from model + custom)
// eos wrapper
let defaultConfig = {};
const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig'); // development only
const fetch = require('node-fetch'); // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util'); // node only; native TextEncoder/Decoder

function getEosWrapper(config: any) {
  const defaults = {
    expireSeconds: 60,
    sign: true,
    broadcast: true,
    blocksBehind: 10
  }
  const rpc = new JsonRpc(config.httpEndpoint, { fetch });
  if (config.keyProvider && !Array.isArray(config.keyProvider))
    config.keyProvider = [config.keyProvider];
  const signatureProvider = config.keyProvider ? new JsSignatureProvider(config.keyProvider) : new JsSignatureProvider([]);
  const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

  api.getTableRows = (payload:any) => rpc.get_table_rows(payload);
  api.get_info = (payload:any) => rpc.get_info(payload);

  api.contract = (async(config:any, account:string) => {
    const contractObj = await api.getContract(account);

    const { actions } = contractObj;
    var contractWrapper:any = {
      api
    }
    var actionNames = actions.keys();
    for (var nameIter of actionNames) {
      var action = actions.get(nameIter);
      var name = action.name;
      var newFunc = async(action:any, name:string, config:any, ...args:any[]) => {
        var options = args[args.length - 1];
        let transformedData = args.slice(0, args.length - 1);
        if (transformedData.length == 1) {
          transformedData = transformedData[0];
        }
        else {
          var newTransformedData:any = {};
          for (var i = 0; i < transformedData.length; i++) {
            var field = action.fields[i].name;
            newTransformedData[field] = transformedData[i];
          }
          transformedData = newTransformedData;
        }
        var authorization = [];
        if (options.authorization) {
          if (typeof(options.authorization) == 'string')
            options.authorization = [options.authorization];
          for (var i = 0; i < options.authorization.length; i++) {
            const parts = options.authorization[i].split('@');
            let partIdx = 0;
            authorization.push({
              actor: parts[partIdx++],
              permission: parts[partIdx++],
            });
          }
        }
        var finalOpts = { ...defaults, ...config, ...options };

        var currentApi = api;
        if (finalOpts.keyProvider !== config.keyProvider) {
          if (!Array.isArray(finalOpts.keyProvider))
            finalOpts.keyProvider = [finalOpts.keyProvider];
          currentApi = new Api({ rpc, signatureProvider: new JsSignatureProvider(finalOpts.keyProvider), textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

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
    return contractWrapper;
  }).bind(api, config);
  return api;
}

class Eos {
  // ctor (config)

}

export default { Eos,getEosWrapper }
