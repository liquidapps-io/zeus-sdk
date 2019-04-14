var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const fetch = require('node-fetch');
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

var handlers = {
    "http": httpGetHandler,
    "https": httpGetHandler,
    "https+post": httpPostHandler,
    "http+post": httpPostHandler,
};

// TODO: add/overwrite handlers from dir

nodeFactory('oracle', {
    geturi: async({ event, rollback }, { uri }) => {
        if (rollback) return;
        const parts = Buffer.from(uri, 'hex').toString('utf8').split("://", 2);
        const proto = parts[0];
        const address = parts[1];
        const handler = handlers[proto];

        if (!handler)
            throw new Error(`unsupported protocol ${proto}`);
        const data = await handler({ proto, address });
        return {
            uri,
            data: data,
            size: data.length
        };
    }
});
