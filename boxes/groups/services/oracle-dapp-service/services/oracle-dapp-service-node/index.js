var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const fetch = require('node-fetch');
const { getUrl } = require('../../extensions/tools/eos/utils');
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');

var url = getUrl(getDefaultArgs());

const httpGetHandler = async({ proto, address }) => {
    const r = await fetch(`${proto}://${address}`, { method: 'GET' });
    return await r.text();
};

const httpPostHandler = async({ proto, address }) => {
    const parts = address.split('/');
    const body = Buffer.from(parts[0], 'base64').toString();
    address = parts[1];
    const r = await fetch(`${proto}://${address}`, { method: 'POST', body });
    return await r.text();
};

const wolframAlphaHandler = async({ proto, address }) => {
    // mock for tests:
    if (address == "What is the average air speed velocity of a laden swallow?")
        return "What do you mean, an African or European Swallow?";
    return await httpGetHandler({ proto: "http", address: `api.wolframalpha.com/v1/result?i=${escape(address)}&appid=${process.env.WOLFRAM_APP_ID || "DEMO"}` })
}
const historyHandler = async({ proto, address }) => {
    //  self_history://account/pos/offset/inner_offset/field

    const parts = address.split('/');
    let partIds = 0;
    const body = {};
    body.account_name = parts[partIds++];
    body.pos = parts[partIds++];
    body.offset = parts[partIds++];
    let inner_offset = parseInt(parts[partIds++]);
    const field = parts[partIds++];

    address = parts[1];
    // http://localhost:13115/v1/history/get_actions -X POST -d '{"account_name":"eosio.token"}'
    const r = await fetch(`${url}/v1/history/get_actions`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    const res = await r.json();
    if (inner_offset < 0) {
        inner_offset = res.actions.length + inner_offset;
    }
    const item = res.actions[inner_offset];
    const fieldPath = field.split('.');
    return fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
};

const endpoints = {
    "mainnet": "http://api.eossweden.se",
    "bos": "https://api.bos.eostribe.io",
    "telos": "https://api.telos.eostribe.io",
    "kylin": "http://kylin-dsp-1.liquidapps.io",
    "worbli": "https://api.worbli.eostribe.io",
    "jungle": "https://junglehistory.cryptolions.io:4433",
    "meetone": "https://fullnode.meet.one"
}
const resolveHistoryEndpointForSisterChain = (chain) => {
    var endpoint = endpoints[chain];
    if (!endpoint)
        throw new Error('endpoint not found for ' + chain);
    return endpoint;
}
const sisterChainHistoryHandler = async({ proto, address }) => {
    //  sister_chain_history://chain/account/pos/offset/inner_offset/field

    const parts = address.split('/');
    let partIds = 0;
    const body = {};
    let chain = parts[partIds++];
    const historyEndpointUrl = await resolveHistoryEndpointForSisterChain(chain);
    body.account_name = parts[partIds++];
    body.pos = parts[partIds++];
    body.offset = parts[partIds++];
    let inner_offset = parseInt(parts[partIds++]);
    const field = parts[partIds++];

    address = parts[1];
    // endpoint/v1/history/get_actions -X POST -d '{"account_name":"eosio.token"}'
    const r = await fetch(`${historyEndpointUrl}/v1/history/get_actions`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    const res = await r.json();
    if (inner_offset < 0) {
        inner_offset = res.actions.length + inner_offset;
    }
    const item = res.actions[inner_offset];
    const fieldPath = field.split('.');
    return fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
};

const randomHandler = async({ proto, address }) => {
    // random://1024
    const range = parseInt(address);
    return Math.floor(Math.random() * range).toString();
}
const sisterChainBlocksHandler = async({ proto, address }) => {
    // sister_chain_block://chain/id/field

    const parts = address.split('/');
    let partIds = 0;
    const body = {};
    let chain = parts[partIds++];
    const historyEndpointUrl = await resolveHistoryEndpointForSisterChain(chain);
    body.block_num_or_id = parts[partIds++];
    const field = parts[partIds++];

    address = parts[1];
    // endpoint/v1/history/get_block -X POST -d '{"block_num_or_id":"1111"}'
    const r = await fetch(`${historyEndpointUrl}/v1/chain/get_block`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    const res = await r.json();
    const fieldPath = field.split('.');
    return fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], res);
};
var handlers = {
    "http": httpGetHandler,
    "https": httpGetHandler,
    "https+post": httpPostHandler,
    "http+post": httpPostHandler,
    "wolfram_alpha": wolframAlphaHandler,
    "self_history": historyHandler,
    "sister_chain_history": sisterChainHistoryHandler,
    "sister_chain_block": sisterChainBlocksHandler,
    "random": randomHandler,
};
nodeFactory('oracle', {
    geturi: async({ event, rollback }, { uri }) => {
        if (rollback) return;
        const parts = Buffer.from(uri, 'hex').toString('utf8').split("://", 2);
        const proto = parts[0];
        const address = parts[1];
        const handler = handlers[proto];

        if (!handler)
            throw new Error(`unsupported protocol ${proto}`);
        try {
            const data = await handler({ proto, address });
            return {
                uri,
                data: data,
                size: data.length
            };
        }
        catch (e) {
            console.error(e);
            throw e;

        }
    }
});
