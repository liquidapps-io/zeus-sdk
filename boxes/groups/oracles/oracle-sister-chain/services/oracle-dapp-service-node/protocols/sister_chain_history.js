const extractPath = (item, field) => {
    const fieldPath = field.split('.');
    const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
    if (res)
        return Buffer.from(res.toString(), 'utf8');
};

const fetch = require('node-fetch');

// Replace with self owned nodes
const endpoints = {
    'mainnet': 'http://api.eossweden.se',
    'bos': 'https://api.bos.eostribe.io',
    'telos': 'https://api.telos.eostribe.io',
    'kylin': 'https://kylin.eoscanada.com',
    'worbli': 'https://api.worbli.eostribe.io',
    'jungle': 'https://junglehistory.cryptolions.io:4433',
    'meetone': 'https://fullnode.meet.one'
};
const resolveHistoryEndpointForSisterChain = (chain) => {
    const endpoint = endpoints[chain];
    if (!endpoint) { throw new Error('endpoint not found for ' + chain); }
    return endpoint;
};
module.exports = async({ proto, address }) => {
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
    return extractPath(item, field);
};
