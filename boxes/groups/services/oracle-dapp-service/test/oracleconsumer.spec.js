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

var contractCode = 'oracleconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Oracle Service Test Contract`, () => {
    var testcontract;
    const code = 'test1';
    before(done => {
        (async() => {
            try {

                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract, "oracle");
                // create token
                var selectedNetwork = getNetwork(getDefaultArgs());
                var config = {
                    expireInSeconds: 120,
                    sign: true,
                    chainId: selectedNetwork.chainId,
                };
                if (account) {
                    var keys = await getCreateKeys(account);
                    config.keyProvider = keys.privateKey;
                }
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

    var account = code;
    it('Oracle HTTPS Get', done => {
        (async() => {
            try {
                var res = await testcontract.testget({
                    uri: Buffer.from("https://ipfs.io/ipfs/Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a", 'utf8'),
                    expectedfield: "Hello from IPFS Gateway Checker\n",
                }, {
                    authorization: `${code}@active`,
                    broadcast: true,
                    sign: true
                });
                // var eventResp = JSON.parse(res.processed.action_traces[0].console);
                // assert.equal(eventResp.etype, "service_request", "wrong etype");
                // assert.equal(eventResp.provider,"", "wrong provider");
                // assert.equal(eventResp.action, "cleanup", "wrong action");
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

});
