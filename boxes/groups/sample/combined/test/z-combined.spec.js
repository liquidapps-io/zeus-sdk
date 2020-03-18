

require('mocha');
const { assert } = require('chai'); // Using Assert style
const { getTestContract } = require('../extensions/tools/eos/utils');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const fetch = require('node-fetch');
const ecc = require('eosjs-ecc')
const { PrivateKey } = require('eosjs-ecc')
const eosjs2 = require('eosjs');
const { JsonRpc } = eosjs2;

const { getUrl } = require('../extensions/tools/eos/utils');

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = require('../extensions/tools/eos/dapp-services');
const { createClient } = require("../client/dist/src/dapp-client-lib");
global.fetch = fetch;

var contractCode = 'combined';
var ctrt = artifacts.require(`./${contractCode}/`);

const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);


describe(`Combined Services Test Contract`, () => {
    const code = 'combined1';
    var chainId;
    var endpoint;

    before(done => {
        (async () => {
            try {
                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract, "vaccounts");
                await genAllocateDAPPTokens(deployedContract, "ipfs");
                await genAllocateDAPPTokens(deployedContract, "oracle");

                endpoint = "http://localhost:13015";                

                let info = await rpc.get_info();
                chainId = info.chain_id;

                var testcontract = await getTestContract(code);
                await testcontract.xvinit({
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

    it('GetLucky', done => {
        (async () => {
            try {
                let privateWif = (await PrivateKey.randomKey()).toWif();
                const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
                const vaccClient = await dappClient.service(
                    "vaccounts", code
                );
                
                let res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "regaccount",
                    {
                        vaccount: "vaccount5"
                    }
                );

                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "getlucky",
                    {
                        vaccount: "vaccount5",
                        seed:"12345"
                    }
                );

                let tableRes = await readVRAMData({
                    contract: code,
                    key: "vaccount5",
                    table: "luckynum",
                    scope: code
                });
                assert(tableRes.row.seed == "12345", "table was not created or updated");
                           
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "testlucky",
                    {
                        vaccount: "vaccount5",
                        seed:"12345"
                    }
                );             
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "checklucky",
                    {
                        vaccount: "vaccount5",
                        seed:"12345"
                    }
                );
            
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "getlucky",
                    {
                        vaccount: "vaccount5",
                        seed:"34567"
                    }
                );
                tableRes = await readVRAMData({
                    contract: code,
                    key: "vaccount5",
                    table: "luckynum",
                    scope: code
                });
                assert(tableRes.row.seed == "34567", "table was not created or updated");
                          
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "getlucky",
                    {
                        vaccount: "vaccount5",
                        seed:"56789"
                    }
                );
                tableRes = await readVRAMData({
                    contract: code,
                    key: "vaccount5",
                    table: "luckynum",
                    scope: code
                });
                assert(tableRes.row.seed == "56789", "table was not created or updated");
            
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif,
                    "getlucky2",
                    {
                        vaccount: "vaccount5",
                        seed:"78901"
                    }
                );
                tableRes = await readVRAMData({
                    contract: code,
                    key: "vaccount5",
                    table: "luckynum",
                    scope: code
                });
                assert(tableRes.row.seed == "78901", "table was not created or updated");



                if (res.error)
                    console.error("reserror", res.error.details[0]);

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Token Transfer', done => {
        (async () => {
            try {
                let privateWif1 = (await PrivateKey.randomKey()).toWif();
                let privateWif2 = (await PrivateKey.randomKey()).toWif();
                const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
                const vaccClient = await dappClient.service(
                    "vaccounts", code
                );
                
                console.log("Reg1");
                let res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif1,
                    "regaccount",
                    {
                        vaccount: "vaccount1"
                    }
                );
                console.log("Reg2");
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif2,
                    "regaccount",
                    {
                        vaccount: "vaccount2"
                    }
                );
                console.log("Add1");
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif1,
                    "regboth",
                    {
                        vaccount: "vaccount1"
                    }
                );
                console.log("Add2");
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif2,
                    "regboth",
                    {
                        vaccount: "vaccount2"
                    }
                );

                console.log("Issue");
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif1,
                    "issue",
                    {
                        vaccount: "vaccount1",
                        to: "vaccount1",
                        quantity: "100.0000 EOS"
                    }
                );
                console.log("Transfer1");      
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif1,
                    "transfer",
                    {
                        vaccount: "vaccount1",
                        to: "vaccount2",
                        quantity: "75.0000 EOS"
                    }
                );
                console.log("Transfer2");
                res = await vaccClient.push_liquid_account_transaction(
                    code,
                    privateWif2,
                    "transfer",
                    {
                        vaccount: "vaccount2",
                        to: "vaccount1",
                        quantity: "50.0000 EOS"
                    }
                );

                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
});
