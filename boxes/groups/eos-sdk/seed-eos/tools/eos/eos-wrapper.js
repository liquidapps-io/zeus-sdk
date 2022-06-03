const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig'); // development only
// const { Api, JsonRpc, RpcError, JsSignatureProvider } = require('eosjs');
const fetch = require('node-fetch'); // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util'); // node only; native TextEncoder/Decoder
const { PushGuarantee } = require("eosio-push-guarantee");


function getEosWrapper(config) {
    const defaults = {
        expireSeconds: process.env.DSP_EOSIO_TRANSACTION_EXPIRATION || 180,
        sign: true,
        broadcast: true,
        blocksBehind: 3,
        pushGuarantee: process.env.DSP_PUSH_GUARANTEE || 'in-block',
        readRetries: process.env.DSP_READ_RETRIES ||  10,
        pushRetries: process.env.DSP_PUSH_RETRIES ||  3,
        backoffExponent: process.env.DSP_BACKOFF_EXPONENT ||  1.1,
        backoff: process.env.DSP_BACKOFF ||  10
    }

    const rpc = new JsonRpc(config.httpEndpoint, { fetch });

    if (config.keyProvider && !Array.isArray(config.keyProvider))
        config.keyProvider = [config.keyProvider];
    const signatureProvider = config.keyProvider ? new JsSignatureProvider(config.keyProvider) : new JsSignatureProvider([]);
    let api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

    api.getTableRows = (payload) => rpc.get_table_rows(payload);
    api.rpc = rpc;
    api.get_info = (payload) => rpc.get_info(payload);

    api.contract = (async(config, account) => {
        const contractObj = await api.getContract(account);

        const { actions } = contractObj;
        let contractWrapper = {
            api
        }
        let actionNames = actions.keys();
        for (let nameIter of actionNames) {
            let action = actions.get(nameIter);
            let name = nameIter;
            let newFunc = async(action, name, config, ...args) => {
                let options = args[args.length - 1];
                let transformedData = args.slice(0, args.length - 1);
                if (transformedData.length == 1) {
                    transformedData = transformedData[0];
                }
                else {
                    let newTransformedData = {};
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

                let currentApi = api;
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

    rpc.fetch = (async(path, body) => {
        const push_guarantee_rpc = new PushGuarantee(rpc, fetch, defaults);
        let response;
        let json;        
        try {
            if(path === '/v1/chain/push_transaction' || path === '/v1/chain/send_transaction') {
                response = await push_guarantee_rpc.push_transaction(body, defaults);
            } else {
                response = await fetch(config.httpEndpoint + path, {
                    body: JSON.stringify(body),
                    method: 'POST',
                });
            } 
            json = await response.json();
            if (json.processed && json.processed.except) {
                throw new RpcError(json);
            }
        } catch (e) {
            e.isFetchError = true;
            throw e;
        }
        if (!response.ok) {
            throw new RpcError(json);
        }
        return json;
    }).bind(rpc);
    return api;
}

module.exports = {
    getEosWrapper
};
