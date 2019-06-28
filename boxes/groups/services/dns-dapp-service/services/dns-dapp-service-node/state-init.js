const { deserialize, eosPrivate } = require('../dapp-services-node/common');
var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { getUrl } = require('../../extensions/tools/eos/utils');
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }); // equivalent


const eosjs2 = require('../demux/eosjs2');
const { JsonRpc } = eosjs2;
const fetch = require('node-fetch');

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });


var dnsd = require('dnsd');
var zone = process.env.DNS_ZONE || 'example.com';
var ns = process.env.DNS_ZONE_NS || 'ns1.example.com';
var email = process.env.DNS_SOA_EMAIL || 'us@example.com';
const hashData256 = (data) => {
    var hash = sha256.create();
    hash.update(data);
    return hash.hex();
};


const getContractEntry = async(contract, scope, type, host) => {
    var str = `${type}-${host}`;
    var hash = hashData256(Buffer.from(str));
    console.log('getting dns record for ', hash, contract, scope, type, host)

    var matchHash = hash.match(/.{16}/g).map(a => a.match(/.{2}/g).reverse().join('')).join('').match(/.{32}/g).reverse().join('').match(/.{2}/g).reverse().join('');
    const payload = {
        'json': true,
        'scope': scope,
        'code': contract,
        'table': 'dnsentry',
        'lower_bound': matchHash,
        'key_type': 'sha256',
        'encode_type': 'hex',
        'index_position': 2,
        'limit': 1
    };
    const res = await rpc.get_table_rows(payload);
    var result = res.rows.find(a => a.type == type && a.subdomain == host);
    if (result)
        return JSON.parse(result.payload);
    return [];
}

async function handler(req, res) {
    console.log('%s:%s/%s %j', req.connection.remoteAddress, req.connection.remotePort, req.connection.type, req)
    for (var i = 0; i < req.question.length; i++) {
        var question = req.question[i];
        var fullHostname = question.name;
        var parts = fullHostname.split('.');
        // report usage of contract
        var subdomain = parts[0];
        var scope = parts[1].replace(/\-/g, '.');
        var contract = parts[2].replace(/\-/g, '.');
        var entry = await getContractEntry(contract, scope, question.type, subdomain);
        var answers = entry.map(d => { return { name: question.name, type: question.type, data: d } });

        for (var answerIndex = 0; answerIndex < answers.length; answerIndex++) {
            res.answer.push(answers[answerIndex]);
        }
    }
    res.end();
}

module.exports = (state) => {
    var server = dnsd.createServer(handler)
    server.zone(zone, ns, email, 'now', '2h', '30m', '2w', '10m')
    state.server = server;
    server.listen(process.env.DNS_PORT || 5343, '0.0.0.0');
    console.log('dns Server running at 0.0.0.0:' + process.env.DNS_PORT);
};
