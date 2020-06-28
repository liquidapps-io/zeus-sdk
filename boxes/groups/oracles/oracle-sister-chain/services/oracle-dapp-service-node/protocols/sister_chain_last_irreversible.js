const fetch = require('node-fetch');
const { resolveHistoryEndpointForSisterChain, extractPath } = require('./helpers')

module.exports = async({ proto, address }) => {
    // sister_chain_last_irreversible://chain

    const parts = address.split('/');
    let partIds = 0;
    let body = {};
    let chain = parts[partIds++];
    const historyEndpointUrl = await resolveHistoryEndpointForSisterChain(chain);

    const rInfo = await fetch(`${historyEndpointUrl}/v1/chain/get_info`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    const resInfo = await rInfo.json();
    const lastIrreversible = resInfo.last_irreversible_block_num;
    body = { block_num_or_id: lastIrreversible };
    const rBlock = await fetch(`${historyEndpointUrl}/v1/chain/get_block`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    const resBlock = await rBlock.json();
    const timestamp = resBlock.timestamp;
    const secSinceEpoch = Math.floor(new Date(timestamp).getTime()/1000).toString();
    return secSinceEpoch; 
};
