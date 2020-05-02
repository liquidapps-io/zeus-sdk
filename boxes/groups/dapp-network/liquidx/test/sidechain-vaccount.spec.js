require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const fetch = require('node-fetch');
const ecc = require('eosjs-ecc')
let { PrivateKey, PublicKey, Signature, Aes, key_utils, config } = require('eosjs-ecc')
const eosjs2 = require('eosjs');
const { JsonRpc, Api, Serialize } = eosjs2;
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig'); // development only
const { loadModels } = requireBox('seed-models/tools/models');

const { getNetwork, getCreateAccount } = requireBox('seed-eos/tools/eos/utils');
const { TextDecoder, TextEncoder } = require('text-encoding');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');
const { encodeName } = requireBox('dapp-services/services/dapp-services-node/common');

var contractCode = 'vaccountsx';
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


describe(`LiquidX Sidechain vAccounts Service Test Contract`, () => {
    var endpoint;
    var chainId;
    var testcontract;
    const mainnet_code = 'test1v';
    const sister_code = 'test1vx';
    const mainnet_code2 = 'test2v';
    const sister_code2 = 'test2vx';
    var eosconsumer;
    var eosconsumer2;
    var sidechainName = 'test1';
    var sidechain;
    before(done => {
        (async () => {
            try {
                var sidechains = await loadModels('eosio-chains');
                sidechain = sidechains.find(a => a.name === sidechainName);

                await getCreateAccount(sister_code, null, false, sidechain);
                await getCreateAccount(mainnet_code, null, false);
                await getCreateAccount(sister_code2, null, false, sidechain);
                await getCreateAccount(mainnet_code2, null, false);

                var deployedContract = await deployer.deploy(ctrt, sister_code, null, sidechain);
                var deployedContract2 = await deployer.deploy(ctrt, sister_code2, null, sidechain)

                await genAllocateDAPPTokens({ address: mainnet_code }, 'vaccounts', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_code2 }, 'vaccounts', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_code }, 'ipfs', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_code2 }, 'ipfs', '', 'default');

                await createLiquidXMapping(sidechain.name, mainnet_code, sister_code);
                await createLiquidXMapping(sidechain.name, mainnet_code2, sister_code2);

                var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);

                endpoint = `http://localhost:${sidechain.dsp_port}`;

                var config = {
                    expireInSeconds: 120,
                    sign: true,
                    chainId: selectedNetwork.chainId,
                    httpEndpoint: endpoint
                };

                var keys = await getCreateKeys(sister_code, getDefaultArgs(), false, sidechain);
                var keys2 = await getCreateKeys(sister_code2, getDefaultArgs(), false, sidechain);

                config.keyProvider = keys.active.privateKey;
                eosconsumer = getEosWrapper(config);
                config.keyProvider = keys2.active.privateKey;
                eosconsumer2 = getEosWrapper(config);

                let info = await eosconsumer.get_info();
                chainId = info.chain_id;

                const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
                if (!mapEntry)
                    throw new Error('mapping not found')
                const dappservicex = mapEntry.chain_account;

                //testcontract = await eosconsumer.contract(account);
                const dappservicexInstance = await eosconsumer.contract(dappservicex);
                const dappservicexInstance2 = await eosconsumer2.contract(dappservicex);
                try {
                    await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider1' }, {
                        authorization: `${sister_code}@active`,
                    });
                    await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider2' }, {
                        authorization: `${sister_code}@active`,
                    });
                    await dappservicexInstance2.adddsp({ owner: sister_code2, dsp: 'xprovider1' }, {
                        authorization: `${sister_code2}@active`,
                    });
                    await dappservicexInstance2.adddsp({ owner: sister_code2, dsp: 'xprovider2' }, {
                        authorization: `${sister_code2}@active`,
                    });
                }
                catch (e) { }
                let res = await deployedContract.contractInstance.xvinit({
                    chainid: chainId
                }, {
                    authorization: `${sister_code}@active`,
                });
                res = await deployedContract2.contractInstance.xvinit({
                    chainid: chainId
                }, {
                    authorization: `${sister_code2}@active`,
                });
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
        `${(new Array(bytes * 2 + 1).join('0') + numStr).substring(numStr.length).toUpperCase()}`;


    const runTrx = async ({
        nonce = 0,
        contract_code,
        payload,
        wif
    }) => {
        const signatureProvider = new JsSignatureProvider([]);
        const rpc = new JsonRpc(endpoint, { fetch });
        const api = new Api({
            rpc,
            signatureProvider,
            // chainId:"",
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });

        let buffer = new Serialize.SerialBuffer({
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder()
        });


        // let vchain = await rpc.get_table_rows({
        //     json: true,
        //     code: code,
        //     scope: code,
        //     table: 'vkey'
        // });
        // console.log(vchain);

        const expiry = Math.floor(Date.now() / 1000) + 120; //two minute expiry
        buffer.pushNumberAsUint64(expiry);
        try {
            var tableRes = await readVRAMData({
                contract: contract_code,
                key: payload.data.payload.vaccount,
                table: "vkey",
                scope: contract_code,
                sidechain
            });
            nonce = tableRes.row.nonce;
            //console.log('got nonce', nonce);
        }
        catch (e) {
            //console.log('no nonce');
            nonce = 0;
        }

        buffer.pushNumberAsUint64(nonce);

        let buf1 = buffer.getUint8Array(8);
        let buf2 = buffer.getUint8Array(8);
        let header = Serialize.arrayToHex(buf1) + Serialize.arrayToHex(buf2) + chainId;

        const response = await api.serializeActions([{
            account: contract_code,
            name: payload.name,
            authorization: [],
            data: payload.data
        }]);
        const toName = (name) => {
            var res = new BigNumber(encodeName(name, true));
            res = (toBound(res.toString(16), 8));
            return res;
        }
        buffer.pushVaruint32(response[0].data.length / 2);
        const varuintBytes = [];
        while (buffer.haveReadData()) varuintBytes.push(buffer.get());
        const serializedDataWithLength = Serialize.arrayToHex(Uint8Array.from(varuintBytes)) + response[0].data;

        // payloadSerialized corresponds to the actual vAccount action (like regaccount) https://github.com/liquidapps-io/zeus-sdk/blob/a3041e9177ffe4375fd8b944f4a10f74a447e406/boxes/groups/services/vaccounts-dapp-service/contracts/eos/dappservices/_vaccounts_impl.hpp#L50-L60
        // and is used as xvexec's payload vector<char>: https://github.com/liquidapps-io/zeus-sdk/blob/4e79122e42eeab50cf633097342b9c1fa00960c6/boxes/groups/services/vaccounts-dapp-service/services/vaccounts-dapp-service-node/index.js#L30
        // eosio::action fields to serialize https://github.com/EOSIO/eosio.cdt/blob/master/libraries/eosiolib/action.hpp#L194-L221
        const actionSerialized =
            "0000000000000000" + // account_name
            toName(payload.name) + // action_name
            // std::vector<permission_level> authorization https://github.com/EOSIO/eosio.cdt/blob/master/libraries/eosiolib/action.hpp#L107-L155
            "00" +
            // std::vector<char> data;
            serializedDataWithLength;

        const payloadSerialized = header + actionSerialized;
        return await postVirtualTx({
            contract_code,
            wif,
            payload: payloadSerialized
        });
    }
    it('Hello world', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await runTrx({
                    contract_code: "test1vx",
                    wif: privateWif,
                    payload: {
                        name: "regaccount",
                        data: {
                            payload: {

                                vaccount: "vaccount1"
                            }
                        }
                    }
                });
                res = await runTrx({
                    nonce: 0,
                    contract_code: "test1vx",
                    wif: privateWif,
                    payload: {
                        name: "hello",
                        data: {
                            payload: {
                                vaccount: "vaccount1",
                                b: 1,
                                c: 2
                            }
                        }
                    }
                });
                res = await runTrx({
                    nonce: 0,
                    contract_code: "test1vx",
                    wif: privateWif,
                    payload: {
                        name: "hello",
                        data: {
                            payload: {
                                vaccount: "vaccount1",
                                b: 1,
                                c: 2
                            }
                        }
                    }
                });
                if (res.error)
                    console.error("reserror", res.error.details[0]);
                // console.log(res.result.processed.action_traces);
                var outputLines = res.result.processed.action_traces[0].console.split('\n');
                assert.equal(outputLines[outputLines.length - 2], "hello from vaccount1 3", "wrong content");

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
    it('Hello world 2', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await runTrx({
                    contract_code: "test1vx",
                    wif: privateWif,
                    payload: {
                        name: "regaccount",
                        data: {
                            payload: {

                                vaccount: "vaccount2"
                            }
                        }
                    }
                });
                res = await runTrx({
                    nonce: 0,
                    contract_code: "test1vx",
                    wif: privateWif,
                    payload: {
                        name: "hello",
                        data: {
                            payload: {
                                vaccount: "vaccount2",
                                b: 1,
                                c: 2
                            }
                        }
                    }
                });
                if (res.error)
                    console.error("reserror", res.error.details[0]);
                // console.log(res.result.processed.action_traces);
                var outputLines = res.result.processed.action_traces[0].console.split('\n');
                assert.equal(outputLines[outputLines.length - 2], "hello from vaccount2 3", "wrong content");

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
    it('Wrong sig', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await postVirtualTx({
                    contract_code: "test1vx",
                    wif: privateWif,
                    // 00409E9 A226498BA 00409E9 A226498BA 000008796 A8A90D9
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
    it('Wrong account key', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await runTrx({
                    contract_code: "test2vx",
                    wif: privateWif,
                    payload: {
                        name: "regaccount",
                        data: {
                            payload: {
                                vaccount: "vaccount1"
                            }
                        }
                    }
                });
                privateWif = (await PrivateKey.randomKey()).toWif();
                res = await runTrx({
                    nonce: 1,
                    contract_code: "test2vx",
                    wif: privateWif,
                    payload: {
                        name: "hello",
                        data: {
                            payload: {
                                vaccount: "vaccount1",
                                b: 1,
                                c: 2
                            }
                        }
                    }
                });
                assert.equal(JSON.parse(res.error.details[0].message).error.details[0].message, "assertion failure with message: wrong public key", "should have failed with 'wrong public key'");
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
    it.skip('Action Fallback', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await postVirtualTx({
                    contract_code: "test1vx",
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
