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
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
    it('Oracle History Get', done => {
        (async() => {
            try {
                var res = await testcontract.testget({
                    uri: Buffer.from(`self_history://${code}/-1/-1/-1/action_trace.act.hex_data`, 'utf8'),
                    expectedfield: "4368747470733a2f2f697066732e696f2f697066732f516d6169737a364e4d68444235316343764e576131474d53374c55317041786446344c64364674396b5a4550326100",
                }, {
                    authorization: `${code}@active`,
                    broadcast: true,
                    sign: true
                });
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Oracle IBC Block Fetch', done => {
        (async() => {
            try {
                var res = await testcontract.testget({
                    uri: Buffer.from(`sister_chain_block://mainnet/10000000/transaction_mroot`, 'utf8'),
                    expectedfield: "82af715868dc7cd32fea5bdc2ba993382271f66aea5407981e640a976536b5d8",
                }, {
                    authorization: `${code}@active`,
                    broadcast: true,
                    sign: true
                });
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Facts - What is the average air speed velocity of a laden swallow?', done => {
        (async() => {
            try {
                var res = await testcontract.testget({
                    uri: Buffer.from(`wolfram_alpha://What is the average air speed velocity of a laden swallow?`, 'utf8'),
                    expectedfield: "What do you mean, an African or European Swallow?",
                }, {
                    authorization: `${code}@active`,
                    broadcast: true,
                    sign: true
                });
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });



    it('Random Number', done => {
        (async() => {
            try {
                var res = await testcontract.testrnd({
                    uri: Buffer.from(`random://1024`, 'utf8'),
                }, {
                    authorization: `${code}@active`,
                    broadcast: true,
                    sign: true
                });
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });



});
