require("babel-core/register");
require("babel-polyfill");
import 'mocha';
const { assert } = require('chai');  // Using Assert style
const { getNetwork, getCreateKeys } = require('../extensions/tools/eos/utils');
var Eos  = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const {genAllocateDAPPTokens} = require('../extensions/tools/eos/dapp-services');

var contractCode = 'svcsconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Services Test Contract`, () => {
    var testcontract;
    const code = 'testsvcs';
    before( done => {
        (async() => {
            try {
                
                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract,"log");
                await genAllocateDAPPTokens(deployedContract,"ipfs");
                            // create token
                var selectedNetwork = getNetwork(getDefaultArgs());
                var config = {
                    expireInSeconds: 120,
                    sign: true,
                    chainId: selectedNetwork.chainId,
                };
                if(account){
                    var keys = await getCreateKeys(account);
                    config.keyProvider = keys.privateKey;
                }
                var eosvram  = deployedContract.eos;
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
    it('Using multiple services', done => {
        (async() => {
            try {
                var res = await testcontract.test({
                    data:{
                        field1:123,
                        field2: "hello-world-" + new Date().getTime().toString(),
                        field3:312
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                var eventResp = JSON.parse(res.processed.action_traces[0].console.split('\n')[1]);
                assert.equal(eventResp.etype, "service_request", "wrong etype");
                assert.equal(eventResp.provider,"", "wrong provider");
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    
    it('Using plists', done => {
        (async() => {
            try {
                var res = await testcontract.testpl1({
                    data:{
                        field1:123,
                        field2: "hello-world-" + new Date().getTime().toString(),
                        field3:312
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    it('Using plists with ipfs', done => {
        (async() => {
            try {
                var res = await testcontract.testpl2({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    it('Using plists with vector', done => {
        (async() => {
            try {
                var res = await testcontract.testpl3({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    it('Using plists with vector and ipfs', done => {
        (async() => {
            try {
                var res = await testcontract.testpl4({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    it('Using plists with vector and ipfs - chunks', done => {
        (async() => {
            try {
                var res = await testcontract.testpl4b({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    
    it('Using plists with vector and ipfs - serde', done => {
        (async() => {
            try {
                var res = await testcontract.testpl5({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    
    it('Using plists with trees', done => {
        (async() => {
            try {
                var res = await testcontract.testpltree1({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    
    
    it('Using plists with trees - simple', done => {
        (async() => {
            try {
                var res = await testcontract.testpltree2({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    it('Using plists with trees - complex', done => {
        (async() => {
            try {
                var res = await testcontract.testpltree3({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    it('Using plists with trees - complex - partial embed', done => {
        (async() => {
            try {
                var res = await testcontract.testpltree4({
                    data:{
                        field1:888,
                        field2: "foo-bar-" + new Date().getTime().toString(),
                        field3:6233
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    it('Using multi_index - emplace and find', done => {
        (async() => {
            try {
                var res = await testcontract.testmidx1({
                    data:{
                        field1:111,
                        field2: "bar-bar-" + new Date().getTime().toString(),
                        field3:222
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
    it('Using multi_index - emplace and find - no cache', done => {
        (async() => {
            try {
                var res = await testcontract.testmidx2({
                    data:{
                        field1:1111,
                        field2: "foo-foo-" + new Date().getTime().toString(),
                        field3:2222
                    }
                }, {authorization: `${code}@active`,
                    broadcast: true,
                    sign: true});
                done();
            }
            catch (e) {
                done(e);
            }                    
        })();
    });
});
