

require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getTestContract, getUrl } = requireBox('seed-eos/tools/eos/utils');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const fetch = require('node-fetch');
const ecc = require('eosjs-ecc')
const { PrivateKey } = require('eosjs-ecc')
const eosjs2 = require('eosjs');
const { JsonRpc } = eosjs2;

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { createClient } = requireBox("client-lib-base/client/dist/src/dapp-client-lib");
global.fetch = fetch;

var contractCode = 'vaccountsconsumer';
var contractCode2 = 'vaccountsremote';
var ctrt = artifacts.require(`./${contractCode}/`);
var ctrt2 = artifacts.require(`./${contractCode2}/`);

const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);

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
    const remote = 'test3v';
    var chainId;

    var endpoint;
    before(done => {
        (async () => {
            try {

                var deployedContract = await deployer.deploy(ctrt, code);
                var deployedContract2 = await deployer.deploy(ctrt, "test2v");
                var deployedContract3 = await deployer.deploy(ctrt2, remote);
                await genAllocateDAPPTokens(deployedContract, "vaccounts", "pprovider1");
                await genAllocateDAPPTokens(deployedContract2, "vaccounts", "pprovider1");
                await genAllocateDAPPTokens(deployedContract3, "vaccounts", "pprovider2");
                await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider1");
                await genAllocateDAPPTokens(deployedContract2, "ipfs", "pprovider1");
                await genAllocateDAPPTokens(deployedContract3, "ipfs", "pprovider2");

                // create token
                // var keys = await getCreateKeys(account);
                endpoint = "http://localhost:13015";
                var testcontract = await getTestContract(code);

                let info = await rpc.get_info();
                chainId = info.chain_id;

                let res = await testcontract.xvinit({
                    chainid: chainId
                }, {
                    authorization: `${code}@active`,
                });
                testcontract = deployedContract2.contractInstance;
                res = await testcontract.xvinit({
                    chainid: chainId
                }, {
                    authorization: `test2v@active`,
                });
                testcontract = deployedContract3.contractInstance;
                res = await testcontract.xvinit({
                    host: code
                }, {
                    authorization: `${remote}@active`,
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
                const outputLines = res.result.processed.action_traces[0].console.split('\n');
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
                const outputLines = res.result.processed.action_traces[0].console.split('\n');
                assert.equal(outputLines[outputLines.length - 2], "hello from vaccount2 3", "wrong content");

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
    it('Hello world - Remote', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
                const vaccClient = await dappClient.service(
                    "vaccounts",
                    code
                );
                const remClient = await dappClient.service(
                    "vaccounts",
                    remote
                );
                await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "regaccount",
                    {
                        vaccount: "vaccount3"
                    }
                );
                //await delaySec(60); //ensuring it still works if entries are committed
                await remClient.push_liquid_account_transaction(
                    remote,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount3",
                        b: 1,
                        c: 2
                    }
                );
                const res = await remClient.push_liquid_account_transaction(
                    remote,
                    privateWif,
                    "hello",
                    {
                        vaccount: "vaccount3",
                        b: 1,
                        c: 2
                    }
                );
                if (res.error)
                    console.error("reserror", res.error.details[0]);
                // console.log(res.result.processed.action_traces);
                const outputLines = res.result.processed.action_traces[0].console.split('\n');
                assert.equal(outputLines[outputLines.length - 2], "hello from vaccount3 3", "wrong content");

                let failed = false;
                try {
                    await remClient.push_liquid_account_transaction(
                        remote,
                        privateWif,
                        "hello",
                        {
                            vaccount: "vaccount1",
                            b: 1,
                            c: 2
                        }
                    );
                } catch (e) {
                    failed = true;
                }
                assert(failed, 'should have failed');

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
                    contract_code: "test1v",
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
                const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
                const vaccClient = await dappClient.service(
                    "vaccounts",
                    "test2v"
                );
                await vaccClient.push_liquid_account_transaction(
                    "test2v",
                    privateWif,
                    "regaccount",
                    {
                        vaccount: "vaccount1"
                    }
                );
                privateWif = (await PrivateKey.randomKey()).toWif();
                try {
                    await vaccClient.push_liquid_account_transaction(
                        "test2v",
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
                const res = await postVirtualTx({
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
