const fetch = require('node-fetch');
const { resolveHistoryEndpointForSisterChain, extractPath } = require('./helpers')

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
