const { requireBox } = require('@liquidapps/box-utils');
const { resolveHistoryEndpointForSisterChain, extractPath } = require('./helpers')
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

module.exports = async({ proto, address }) => {
    // sister_chain_table_row://chain/code/table/scope/key/field
    const parts = address.split('/');
    let partIds = 0;
    const chain = parts[partIds++];
    const code = parts[partIds++];
    const table = parts[partIds++];
    const scope = parts[partIds++];
    const key = parts[partIds++];
    const lower_bound = key;
    const upper_bound = (Number(key) + 1).toString();
    const limit = 1;
    const field = parts[partIds++];

    const historyEndpointUrl = await resolveHistoryEndpointForSisterChain(chain);
    const eos = getEosWrapper({ httpEndpoint: historyEndpointUrl });
    const res = await eos.getTableRows({
        'json': true,
        'scope': scope,
        'code': code,
        'table': table,
        'lower_bound': lower_bound,
        'upper_bound': upper_bound,
        'limit': limit
    })
    return extractPath(res.rows[0], field);
};
