require("babel-core/register");
require("babel-polyfill");
import 'mocha';
const { assert } = require('chai'); // Using Assert style
const { getNetwork, getCreateKeys } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const fetch = require('node-fetch');
const ecc = require('eosjs-ecc')
let { PrivateKey, PublicKey, Signature, Aes, key_utils, config } = require('eosjs-ecc')
const eosjs2 = require('../services/demux/eosjs2');
const { JsonRpc, JsSignatureProvider, Api } = eosjs2;
const { getUrl } = require('../extensions/tools/eos/utils');
import { TextDecoder, TextEncoder } from 'text-encoding';

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'vaccountsconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
const { BigNumber } = require('bignumber.js');

function postData(url = ``, data = {}) {
    // Default options are marked with *
    return fetch(url, {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, cors, *same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                // "Content-Type": "application/json",
                // "Content-Type": "application/x-www-form-urlencoded",
            },
            redirect: "follow", // manual, *follow, error
            referrer: "no-referrer", // no-referrer, *client
            body: JSON.stringify(data), // body data type must match "Content-Type" header
        })
        .then(response => response.json()); // parses response to JSON
}


describe(`vAccounts Service Test Contract`, () => {
    const code = 'test1v';
    var account = code;
    var selectedNetwork = getNetwork(getDefaultArgs());
    var config = {
        expireInSeconds: 120,
        sign: true,
        chainId: selectedNetwork.chainId,
    };
    var endpoint;
    var eosvram;
    var testcontract;
    before(done => {
        (async() => {
            try {
                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract, "vaccounts");
                // create token
                var keys = await getCreateKeys(account);
                config.keyProvider = keys.privateKey;
                eosvram = deployedContract.eos;
                config.httpEndpoint = "http://localhost:13015";
                endpoint = config.httpEndpoint;
                eosvram = new Eos(config);
                testcontract = await eosvram.contract(code);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
    const postVirtualTx = ({
        contract_code,
        payload,
        wif
    }, signature) => {
        if (!signature)
            signature = ecc.sign(Buffer.from(payload, 'hex'), wif);
        const public_key = PrivateKey.fromString(wif).toPublic().toString()
        return postData(`${endpoint}/v1/dsp/accountless1/push_action`, {
            contract_code,
            public_key,
            payload,
            signature
        });
    }
    const toBound = (numStr, bytes) =>
        `${(new Array(bytes*2+1).join('0') + numStr).substring(numStr.length).toUpperCase()}`;


    const runTrx = async({
        contract_code,
        payload,
        wif
    }) => {
        const signatureProvider = new JsSignatureProvider([]);
        const api = new Api({
            rpc,
            signatureProvider,
            // chainId:"",
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });




        const options = {
            authorization: `${contract_code}@active`, //@active for activeKey, @owner for Owner key
            //default authorizations will be calculated.
            broadcast: false,
            sign: true,
            forceActionDataHex: true
        };

        // const transaction = await eosvram.transaction({
        //     actions: [{
        //         account: contract_code,
        //         name: payload.name,
        //         authorization: [{
        //             actor: contract_code,
        //             permission: 'active'
        //         }],
        //         data: payload.data
        //     }]
        // }, options);
        // const data = transaction.transaction.transaction;
        const response = await api.serializeActions([{
            account: contract_code,
            name: payload.name,
            authorization: [{
                actor: contract_code,
                permission: 'active'
            }],
            data: payload.data
        }]);
        const toName = (name) => {
            var res = new BigNumber(Eos.modules.format.encodeName(name, true));
            res = (toBound(res.toString(16), 8));
            return res;

        }
        var payloadSerialized = toName(payload.name) + toName(payload.name) + response[0].data;
        return await postVirtualTx({
            contract_code: "test1v",
            wif,
            payload: payloadSerialized
        });
    }
    it('Hello world', done => {
        (async() => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await runTrx({
                    contract_code: "test1v",
                    wif: privateWif,
                    payload: {
                        name: "regaccount",
                        data: {
                            vaccount: "vaccount1"
                        }
                    }
                });
                res = await runTrx({
                    contract_code: "test1v",
                    wif: privateWif,
                    payload: {
                        name: "hello",
                        data: {
                            vaccount: "vaccount1",
                            b: 1,
                            c: 2
                        }
                    }
                });

                assert.equal(res.result.processed.action_traces[0].console, "hello from 1 3\n", "wrong content");

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
    it('Wrong key', done => {
        (async() => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await postVirtualTx({
                    contract_code: "test1v",
                    wif: privateWif,
                    payload: "8468635b7f379feeb95500000000010000000000ea305500409e9a2264b89a010000000000ea305500000000a8ed3232660000000000ea305500a6823403ea30550100000001000240cc0bf90a5656c8bb81f0eb86f49f89613c5cd988c018715d4646c6bd0ad3d8010000000100000001000240cc0bf90a5656c8bb81f0eb86f49f89613c5cd988c018715d4646c6bd0ad3d80100000000"
                }, "SIG_K1_K8Up3NhbzVY7dcwMY6cRS84KzvNJC8aKkdCiX16Z9d7WE8DPRsCrgBL4YZg3sfQYGZ66D7kKT8ee9vFVmrq6SxAfYx3LRB");
                assert.equal(JSON.parse(res.error.details[0].message).error.details[0].method, "assert_recover_key", "should have failed with assert_recover_key");
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
    it('fallback', done => {
        (async() => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await postVirtualTx({
                    contract_code: "test1v",
                    wif: privateWif,
                    payload: "8468635b7f379feeb95500000000010000000000ea305500409e9a2264b89a010000000000ea305500000000a8ed3232660000000000ea305500a6823403ea30550100000001000240cc0bf90a5656c8bb81f0eb86f49f89613c5cd988c018715d4646c6bd0ad3d8010000000100000001000240cc0bf90a5656c8bb81f0eb86f49f89613c5cd988c018715d4646c6bd0ad3d80100000000"
                });
                assert.equal(res.result.processed.action_traces[0].console, "hello2(default action) from nobody 3\n", "wrong content");

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });


});
