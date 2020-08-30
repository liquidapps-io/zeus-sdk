require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const fetch = require('node-fetch');
const ecc = require('eosjs-ecc')
const { assert } = require('chai'); // Using Assert style
let { PrivateKey } = require('eosjs-ecc');

const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { loadModels } = requireBox('seed-models/tools/models');
const { getNetwork, getCreateAccount } = requireBox('seed-eos/tools/eos/utils');
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');
const { createClient } = requireBox("client-lib-base/client/dist/src/dapp-client-lib");

global.fetch = fetch; //assign global fetch for client

var contractCode = 'vaccountsx';
var contractCodeSub = 'vaccntxremx';
var contractCodeHost = 'vaccntxrem';
var contractCodeMain = 'vaccountsconsumer';

var ctrt = artifacts.require(`./${contractCode}/`);
var ctrtSub = artifacts.require(`./${contractCodeSub}/`);
var ctrtHost = artifacts.require(`./${contractCodeHost}/`);
var ctrtMain = artifacts.require(`./${contractCodeMain}/`);

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
    var endpointMain;
    var chainId;
    var chainIdMain;
    var testcontract;
    const mainnet_code = 'sidetest1v';
    const sister_code = 'sidetest1vx';
    const mainnet_code2 = 'sidetest2v';
    const sister_code2 = 'sidetest2vx';
    const mainnet_host_code = 'xchain1v';
    const sister_host_code = 'xchain1vx';  
    const mainnet_sub_code = 'xchain2v';
    const sister_sub_code = 'xchain2vx';
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
                await getCreateAccount(sister_host_code, null, false, sidechain);
                await getCreateAccount(mainnet_host_code, null, false);
                await getCreateAccount(sister_sub_code, null, false, sidechain);
                await getCreateAccount(mainnet_sub_code, null, false);

                var deployedContract = await deployer.deploy(ctrt, sister_code, null, sidechain);
                var deployedContract2 = await deployer.deploy(ctrt, sister_code2, null, sidechain);
                var deployedHost = await deployer.deploy(ctrtHost, sister_host_code, null, sidechain);
                var deployedSub = await deployer.deploy(ctrtSub, sister_sub_code, null, sidechain);
                var deployedMain = await deployer.deploy(ctrtMain, mainnet_code);

                await genAllocateDAPPTokens({ address: mainnet_code }, 'vaccounts', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_code2 }, 'vaccounts', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_host_code }, 'vaccounts', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_sub_code }, 'vaccounts', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_code }, 'ipfs', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_code2 }, 'ipfs', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_host_code }, 'ipfs', '', 'default');
                await genAllocateDAPPTokens({ address: mainnet_sub_code }, 'ipfs', '', 'default');

                await createLiquidXMapping(sidechain.name, mainnet_code, sister_code);
                await createLiquidXMapping(sidechain.name, mainnet_code2, sister_code2);
                await createLiquidXMapping(sidechain.name, mainnet_host_code, sister_host_code);
                await createLiquidXMapping(sidechain.name, mainnet_sub_code, sister_sub_code);

                var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);

                endpoint = `http://localhost:${sidechain.dsp_port}`;
                endpointMain = `http://localhost:13015`;

                var config = {
                    expireInSeconds: 120,
                    sign: true,
                    chainId: selectedNetwork.chainId,
                    httpEndpoint: endpoint
                };
                var configMain = {
                    expireInSeconds: 120,
                    sign: true,
                    chainId: selectedNetwork.chainId,
                    httpEndpoint: endpointMain
                };
                var keys = await getCreateKeys(sister_code, getDefaultArgs(), false, sidechain);
                var keys2 = await getCreateKeys(sister_code2, getDefaultArgs(), false, sidechain);
                var keys3 = await getCreateKeys(sister_host_code, getDefaultArgs(), false, sidechain);
                var keys4 = await getCreateKeys(sister_sub_code, getDefaultArgs(), false, sidechain);

                config.keyProvider = keys.active.privateKey;
                eosconsumer = getEosWrapper(config);
                config.keyProvider = keys2.active.privateKey;
                eosconsumer2 = getEosWrapper(config);
                config.keyProvider = keys3.active.privateKey;
                eosconsumer3 = getEosWrapper(config);
                config.keyProvider = keys4.active.privateKey;
                eosconsumer4 = getEosWrapper(config);
                configMain.keyProvider = keys4.active.privateKey;
                const eosMainConsumer = getEosWrapper(configMain);
                let info = await eosconsumer.get_info();
                chainId = info.chain_id;
                let info2 = await eosMainConsumer.get_info();
                chainIdMain = info2.chain_id;
                const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
                if (!mapEntry)
                    throw new Error('mapping not found')
                const dappservicex = mapEntry.chain_account;

                //testcontract = await eosconsumer.contract(account);
                const dappservicexInstance = await eosconsumer.contract(dappservicex);
                const dappservicexInstance2 = await eosconsumer2.contract(dappservicex);
                const dappservicexInstance3 = await eosconsumer3.contract(dappservicex);
                const dappservicexInstance4 = await eosconsumer4.contract(dappservicex);
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
                    await dappservicexInstance3.adddsp({ owner: sister_host_code, dsp: 'xprovider1' }, {
                        authorization: `${sister_host_code}@active`,
                    });
                    await dappservicexInstance4.adddsp({ owner: sister_sub_code, dsp: 'xprovider1' }, {
                        authorization: `${sister_sub_code}@active`,
                    });
                }
                catch (e) { }
                await deployedContract.contractInstance.xvinit({
                    chainid: chainId
                }, {
                    authorization: `${sister_code}@active`,
                });
                await deployedContract2.contractInstance.xvinit({
                    chainid: chainId
                }, {
                    authorization: `${sister_code2}@active`,
                });
                await deployedHost.contractInstance.xvinit({
                    chainid: chainId, // chainIdMain?
                    hostchain: 'mainnet',
                    hostcode: mainnet_code
                }, {
                    authorization: `${sister_host_code}@active`,
                });
                await deployedSub.contractInstance.xvinit({
                    host: sister_host_code
                }, {
                    authorization: `${sister_sub_code}@active`,
                });
                await deployedMain.contractInstance.xvinit({
                    chainid: chainIdMain
                }, {
                    authorization: `${mainnet_code}@active`,
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

    it('Hello world', done => {
        (async () => {
            try {
                let code = sister_code;
                let privateWif = (await PrivateKey.randomKey()).toWif();
                const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
                const vaccClient = await dappClient.service(
                    "vaccounts",
                    code
                );
                await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "regaccount",
                    {
                        vaccount: "vaccount1"
                    }
                );
                await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount1",
                        b: 1,
                        c: 2
                    }
                );
                const res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount1",
                        b: 1,
                        c: 2
                    }
                );
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
                let code = sister_code;
                let privateWif = (await PrivateKey.randomKey()).toWif();
                const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
                const vaccClient = await dappClient.service(
                    "vaccounts",
                    code
                );
                await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "regaccount",
                    {
                        vaccount: "vaccount2"
                    }
                );
                const res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount2",
                        b: 1,
                        c: 2
                    }
                );
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
    it('Hello world - Cross chain', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
                const vaccClientHost = await dappClient.service(
                    "vaccounts",
                    sister_host_code
                );
                const vaccClientSub = await dappClient.service(
                    "vaccounts",
                    sister_sub_code
                );
                const dappClientMain = await createClient({ httpEndpoint: endpointMain, fetch });
                const vaccClientMain = await dappClientMain.service(
                    "vaccounts",
                    mainnet_code
                );
                await vaccClientMain.push_liquid_account_transaction(
                    mainnet_code,
                    privateWif,
                    "regaccount",
                    {
                        vaccount: "vaccount1"
                    }
                );
                await vaccClientMain.push_liquid_account_transaction(
                    mainnet_code,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount1",
                        b: 1,
                        c: 2
                    }
                );
                await vaccClientHost.push_liquid_account_transaction(
                    sister_host_code,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount1",
                        b: 1,
                        c: 2
                    }
                );
                await vaccClientSub.push_liquid_account_transaction(
                    sister_sub_code,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount1",
                        b: 1,
                        c: 2
                    }
                );
                const res = await vaccClientSub.push_liquid_account_transaction(
                    sister_sub_code,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount1",
                        b: 1,
                        c: 2
                    }
                );
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
    it('Wrong sig', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                var res = await postVirtualTx({
                    contract_code: sister_code,
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
                let code = sister_code2;
                let privateWif = (await PrivateKey.randomKey()).toWif();
                const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
                const vaccClient = await dappClient.service(
                    "vaccounts",
                    code
                );
                await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "regaccount",
                    {
                        vaccount: "vaccount1"
                    }
                );
                privateWif = (await PrivateKey.randomKey()).toWif();
                try {
                    await vaccClient.push_liquid_account_transaction(
                        code,
                        privateWif,
                        "hello",
                        {
                            vaccount: "vaccount1",
                            b: 1,
                            c: 2
                        }
                    );
                } catch (e) {
                    assert.equal(JSON.parse(e.json.error.details[0].message).error.details[0].message, "assertion failure with message: wrong public key", "should have failed with 'wrong public key'");
                }
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
