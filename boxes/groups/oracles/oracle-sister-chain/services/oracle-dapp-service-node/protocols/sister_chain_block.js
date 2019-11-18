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
const extractPath = (item, field) => {
    const fieldPath = field.split('.');
    const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
    if (res)
        return Buffer.from(res.toString(), 'utf8');
};
module.exports = async({ proto, address }) => {
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
    return extractPath(res, field);
};
