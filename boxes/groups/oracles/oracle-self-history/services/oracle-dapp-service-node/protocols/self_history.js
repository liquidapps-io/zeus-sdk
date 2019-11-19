const fetch = require('node-fetch');
const { getUrl } = require('../../../extensions/tools/eos/utils');
const getDefaultArgs = require('../../../extensions/helpers/getDefaultArgs');
const logger = require('../../../extensions/helpers/logger');

const url = getUrl(getDefaultArgs());
const extractPath = (item, field) => {
    const fieldPath = field.split('.');
    const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
    if (res)
        return Buffer.from(res.toString(), 'utf8');
};
module.exports = async({ proto, address }) => {
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
    return extractPath(item, field);
};
