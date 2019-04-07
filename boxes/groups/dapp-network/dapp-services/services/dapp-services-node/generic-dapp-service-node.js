#!/usr/bin/env node

require("babel-core/register");
require("babel-polyfill");
if (process.env.DAEMONIZE_PROCESS)
    require('daemonize-process')();

const { loadModels } = require("../../extensions/tools/models")
const { getCreateKeys } = require('../../extensions/tools/eos/utils');
const { getContractAccountFor } = require("../../extensions/tools/eos/dapp-services")

const { deserialize, generateABI, genNode, eosPrivate, paccount, forwardEvent, resolveProviderData, resolveProvider, resolveProviderPackage } = require('./common');
const handleRequest = async(handler, act, packageid, serviceName, abi) => {
    let { service, payer, provider, action, data } = act.event;
    data = deserialize(abi, data, action);
    if (!data)
        return;

    act.event.current_provider = paccount;
    act.event.packageid = packageid;

    var responses = await handler(act, data);
    if (!responses)
        return;
    if (!Array.isArray(responses)) // needs conversion from a normal object
        responses = respond(act.event, packageid, responses);

    await Promise.all(responses.map(async(response) => {

        var contract = await eosPrivate.contract(payer);

        let key;
        if (!process.env.DSP_PRIVATE_KEY)
            key = await getCreateKeys(paccount);
        try {
            await contract[response.action](response.payload, {
                authorization: `${paccount}@active`,
                broadcast: true,
                sign: true,
                keyProvider: [process.env.DSP_PRIVATE_KEY || key.privateKey]
            });
        }
        catch (e) {
            if (e.toString().indexOf("duplicate") == -1) {
                console.log("response error, could not call contract callback", e);
                throw e;
            }
        }
        // dispatch on chain response - call response.action with params with paccount permissions
    }));
}

const actionHandlers = {
    'service_request': async(act, simulated, serviceName, handlers) => {
        let isReplay = act.replay;
        let { service, payer, provider, action, data } = act.event;
        var handler = handlers[action];
        var models = await loadModels('dapp-services');
        var model = models.find(m => m.name == serviceName);
        if (isReplay && provider == "") {
            provider = paccount;
            if (!(getContractAccountFor(model) == service && handler))
                return;
            await handleRequest(handler, act, packageid, serviceName, handlers.abi);
            return;
        }
        provider = await resolveProvider(payer, service, provider);
        var packageid = isReplay ? "replaypackage" : await resolveProviderPackage(payer, service, provider);
        if (!simulated) {
            if (!(getContractAccountFor(model) == service && handler))
                return;
            await handleRequest(handler, act, packageid, serviceName, handlers.abi);
            return;
        }
        if (!act.exception)
            return;

        if (getContractAccountFor(model) == service && handler) {
            await handleRequest(handler, act, packageid, serviceName, handlers.abi);
            return "retry";
        }
        var providerData = await resolveProviderData(service, provider);
        if (!providerData)
            return;

        return await forwardEvent(act, providerData.endpoint, act.exception);
    },
    'service_signal': async(act, simulated, serviceName, handlers) => {
        if (simulated)
            return;
        let { action, data } = act.event;
        var typeName = `sig_${action}`;
        var handler = handlers[typeName];
        var sigData = deserialize(handlers.abi, data, typeName);

        // todo: verify sig and usage for each xaction
        if (!handler && !sigData) {
            // console.log('unhandled signal', act);
            return;
        }
        await handler(sigData);
    },
    'usage_report': async(act, simulated, serviceName, handlers) => {
        if (simulated)
            return;
        var handler = handlers[`_usage`];
        // todo: handle quota and verify sig and usage for each xaction
        if (handler) {
            await handler(act.event);
        }
        else {
            // console.log('unhandled usage_report', act.event);
        }

    }
}

const nodeFactory = async(serviceName, handlers) => {
    var models = await loadModels('dapp-services');
    var model = models.find(m => m.name == serviceName);
    return genNode(actionHandlers, process.env.SVC_PORT || model.port, serviceName, handlers, await generateABI(model));
}

const respond = (request, packageid, payload) => {
    payload.current_provider = request.current_provider;
    payload.package = packageid;
    return [{
        action: `x${request.action}`,
        payload,
        request
    }];
}

module.exports = { nodeFactory, respond }
