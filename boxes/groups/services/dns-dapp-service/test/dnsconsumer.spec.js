import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getNetwork, getCreateKeys, getCreateAccount, getEos } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'dnsconsumer';
var serviceName = 'dns'
var ctrt = artifacts.require(`./${contractCode}/`);
const delay = ms => new Promise(res => setTimeout(res, ms));
const util = require('util');

describe(`${contractCode} Contract`, () => {
    var testcontract;

    var testUser = "tt11";

    const getTestAccountName = (num) => {
        var fivenum = num.toString(5).split('');
        for (var i = 0; i < fivenum.length; i++) {
            fivenum[i] = String.fromCharCode(fivenum[i].charCodeAt(0) + 1);
        }
        fivenum = fivenum.join('');
        var s = '111111111111' + fivenum;
        var prefix = 'test';
        s = prefix + s.substr(s.length - (12 - prefix.length));
        console.log(s);
        return s;
    };
    const code = 'dnstable1';
    var account = code;
    var resolver;
    var resolve;
    before(done => {
        (async() => {
            try {
                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract, serviceName);
                const { getTestContract } = require('../extensions/tools/eos/utils');
                testcontract = await getTestContract(code);

                const { Resolver } = require('dns');
                const resolver = new Resolver();
                resolver.setServers(['127.0.0.1:5343']);
                resolve = util.promisify(resolver.resolve).bind(resolver);

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('A Record', done => {
        (async() => {
            try {
                var owner = getTestAccountName(10);
                var testAccountKeys = await getCreateAccount(owner);
                var subdomain = 'testsubdomain5';
                var res = await testcontract.updaterecord({
                    owner,
                    subdomain,
                    type: 'A',
                    payload: '["127.0.0.1"]'
                }, {
                    authorization: `${owner}@active`,
                    broadcast: true,
                    sign: true,
                    keyProvider: [testAccountKeys.active.privateKey],
                });
                var resdns = await resolve(`${subdomain}.${owner}.${code}.example.com`, 'A');
                console.log('res', resdns);

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });


});
