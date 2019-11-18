import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getNetwork, getCreateKeys, getCreateAccount, getEos } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'eosio.token';
var serviceName = 'kns'
var ctrt = artifacts.require(`./${contractCode}/`);

describe(`KMS Service Contract`, () => {
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
    const code = 'testkms';
    var account = code;
    before(done => {
        (async() => {
            try {
                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract, serviceName);
                const { getTestContract } = require('../extensions/tools/eos/utils');
                testcontract = await getTestContract(code);


                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('kms set secret', done => {
        (async() => {
            try {
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });


});
