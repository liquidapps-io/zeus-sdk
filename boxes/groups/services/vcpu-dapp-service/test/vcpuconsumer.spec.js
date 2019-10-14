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
const { getTestContract } = require('../extensions/tools/eos/utils');

var contractCode = 'vcpuconsumer';
var serviceName = 'vcpu'
var ctrt = artifacts.require(`./${contractCode}/`);
const delay = ms => new Promise(res => setTimeout(res, ms));
const util = require('util');

describe(`${contractCode} Contract`, () => {
    var testcontract;


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
    var account = "vcpuconsumer";
    before(done => {
        (async() => {
            try {
                var deployedContract = await deployer.deploy(ctrt, account);
                await genAllocateDAPPTokens(deployedContract, serviceName, "pprovider1", "default");
                await genAllocateDAPPTokens(deployedContract, serviceName, "pprovider2", "foobar");
                testcontract = await getTestContract(account);


                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Commom denom', done => {
        (async() => {
            try {
                var owner = getTestAccountName(10);
                var testAccountKeys = await getCreateAccount(owner);
                await testcontract.testfn({
                    a: 21,
                    b: 1120000,
                }, {
                    authorization: `${owner}@active`,
                    broadcast: true,
                    sign: true,
                    keyProvider: [testAccountKeys.active.privateKey],
                });
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Commom denom - long', done => {
        (async() => {
            try {
                var owner = getTestAccountName(10);
                var testAccountKeys = await getCreateAccount(owner);
                await testcontract.testfn({
                    a: 2120000001,
                    b: 1120000000,
                }, {
                    authorization: `${owner}@active`,
                    broadcast: true,
                    sign: true,
                    keyProvider: [testAccountKeys.active.privateKey],
                });
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

});
