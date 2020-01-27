require('mocha');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getLocalDSPEos, getTestContract } = require('../extensions/tools/eos/utils');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const fetch = require('node-fetch');
const ecc = require('eosjs-ecc')
let { PrivateKey, PublicKey, Signature, Aes, key_utils, config } = require('eosjs-ecc')
const eosjs2 = require('eosjs');
const { JsonRpc, Api, Serialize } = eosjs2;
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig'); // development only

const { getUrl } = require('../extensions/tools/eos/utils');
const { TextDecoder, TextEncoder } = require('text-encoding');

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = require('../extensions/tools/eos/dapp-services');
const { encodeName } = require('../services/dapp-services-node/common');

var contractCode = 'chess';
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


describe(`Chess Contract`, () => {
    const code = 'chess';
    var account = code;
    var chainId;

    var endpoint;
    before(done => {
        (async () => {
            try {

                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract, "vaccounts");
                await genAllocateDAPPTokens(deployedContract, "ipfs");
                await genAllocateDAPPTokens(deployedContract, "readfn");
                await genAllocateDAPPTokens(deployedContract, "oracle");
                await genAllocateDAPPTokens(deployedContract, "cron");
                await genAllocateDAPPTokens(deployedContract, "readfn");
                await genAllocateDAPPTokens(deployedContract, "vcpu");

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
                scope: contract_code
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
        var datasize = toBound(new BigNumber(response[0].data.length / 2).toString(16), 1).match(/.{2}/g).reverse().join('');
        var payloadSerialized = header + "0000000000000000" + toName(payload.name) + "01" + "00000000000000000000000000000000" + datasize + response[0].data;
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
                let privateWif2 = (await PrivateKey.randomKey()).toWif();
                var res = await runTrx({
                    contract_code: code,
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
                    contract_code: code,
                    wif: privateWif2,
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
                    contract_code: code,
                    wif: privateWif,
                    payload: {
                        name: "joingame",
                        data: {
                            payload: {
                                vaccount: "vaccount1",
                                opponent: "vaccount2",
                            }
                        }
                    }
                });
                res = await runTrx({
                    nonce: 0,
                    contract_code: code,
                    wif: privateWif2,
                    payload: {
                        name: "joingame",
                        data: {
                            payload: {
                                vaccount: "vaccount2",
                                opponent: "vaccount1",
                            }
                        }
                    }
                });
                res = await runTrx({
                    nonce: 0,
                    contract_code: code,
                    wif: privateWif,
                    payload: {
                        name: "movepiece",
                        data: {
                            payload: {
                                vaccount: "vaccount1",
                                gamehost: "vaccount1",
                                opponent: "vaccount2",
                                move: "e4"
                            }
                        }
                    }
                });
                if (res.error) {
                    console.log(res.error.details[0].message)
                    throw new Error(res.error.details[0].message);
                }
                // console.log(res.result.processed.action_traces);

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
});
