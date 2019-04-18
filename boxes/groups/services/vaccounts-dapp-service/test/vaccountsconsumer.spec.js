require("babel-core/register");
require("babel-polyfill");
import 'mocha';
const { assert } = require('chai'); // Using Assert style
const { getNetwork, getCreateKeys } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'vaccountsconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`vAccounts Service Test Contract`, () => {
    const code = 'test1v';
    var account = code;
    var selectedNetwork = getNetwork(getDefaultArgs());
    var config = {
        expireInSeconds: 120,
        sign: true,
        chainId: selectedNetwork.chainId,
    };
    var testcontract;
    before(done => {
        (async() => {
            try {
                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract, "vaccounts");
                // create token
                var keys = await getCreateKeys(account);
                config.keyProvider = keys.privateKey;
                var eosvram = deployedContract.eos;
                config.httpEndpoint = "http://localhost:13015";
                eosvram = new Eos(config);
                testcontract = await eosvram.contract(code);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Hello World', done => {
        (async() => {
            try {
                // call action reg
                // call action hello
                console.log(testcontract);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });


});
