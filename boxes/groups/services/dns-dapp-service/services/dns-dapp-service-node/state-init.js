const { deserialize, eosPrivate } = require('../dapp-services-node/common');
var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { getUrl } = require('../../extensions/tools/eos/utils');
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }); // equivalent


const eosjs2 = require('eosjs');
const { JsonRpc } = eosjs2;
const fetch = require('node-fetch');

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });


var dnsd = require('dnsd');
var zone = process.env.DNS_ZONE || 'example.com';
var ns = process.env.DNS_ZONE_NS || 'ns1.example.com';
var email = process.env.DNS_SOA_EMAIL || 'us@example.com';
var dns = require('native-dns');

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
        var i = 0;
        let subdomain;
        if (parts.length == 3)
            subdomain = "@"
        else
            subdomain = parts[i++];

        if (subdomain[0] == '_' && parts.length > 4) {
            subdomain = `${subdomain}.${parts[i++]}`;
        }
        subdomain = subdomain.toLowerCase();
        var scope = parts[i++].replace(/\-/g, '.').toLowerCase();
        var contract = parts[i++].replace(/\-/g, '.').toLowerCase();
        var cnameEntry = [];
        if (question.type === 'AAAA' || question.type === 'CNAME' || question.type === 'A')
            cnameEntry = await getContractEntry(contract, scope, 'CNAME', subdomain);
        if (cnameEntry.length) {
            console.log("cnameEntry", cnameEntry);
            res.answer.push({
                name: question.name,
                type: 'CNAME',
                data: cnameEntry[0],
            });
            var relay = dns.Request({
                question: dns.Question({
                    name: cnameEntry[0],
                    type: 'A',
                }),
                server: {
                    address: '8.8.8.8',
                    port: 53,
                    type: 'udp'
                },
            });

            relay.on('message', function(err, answer) {
                console.log("err", err);
                answer.answer.forEach(function(a) {
                    //console.dir(a);
                    if (!a.address) {
                        return;
                    }
                    console.log('-> ' + a.address);
                    res.answer.push({
                        name: a.name,
                        type: 'A',
                        data: a.address,
                        ttl: a.ttl
                    });
                });
            });

            relay.on('timeout', function() {
                res.end();
            });

            relay.on('end', function() {
                res.end();
            });

            relay.send();
        }
        else {
            var entry = await getContractEntry(contract, scope, question.type, subdomain);
            var answers = entry.map(d => { return { name: question.name, type: question.type, data: d } });


            for (var answerIndex = 0; answerIndex < answers.length; answerIndex++) {
                res.answer.push(answers[answerIndex]);
            }

            return res.end();
        }

    }
    res.end();
}

module.exports = (state) => {
    var server = dnsd.createServer(handler)
    server.zone(zone, ns, email, 'now', '2h', '30m', '2w', '10m')
    state.server = server;
    server.listen(process.env.DNS_PORT || 5343, '0.0.0.0');
    console.log('dns Server running at 0.0.0.0:' + (process.env.DNS_PORT || 5343));
};
