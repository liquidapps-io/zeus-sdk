require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getCreateAccount } = requireBox('seed-eos/tools/eos/utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

const contractCode = '<%- contractname %>';
const ctrt = artifacts.require(`./${contractCode}/`);
const { eosio } = requireBox('test-extensions/lib/index');
let deployedContract;

describe(`${contractCode} Contract`, () => {
    const code = '<%- contractname %>';
    let tableHelper;
    before(done => {
        (async () => {
            try {
                tableHelper = await deployer.deploy(ctrt, code);
                const keys = await getCreateAccount(code);
                const eosTestAcc = getEosWrapper({
                  keyProvider: keys.active.privateKey,
                  httpEndpoint: 'http://localhost:8888'
                });
                deployedContract = await eosTestAcc.contract(code);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('test assert', done => {
        (async () => {
            try {
                await deployedContract.testassert({
                    message: "hello"
                }, {
                  authorization: `${code}@active`,
                  broadcast: true,
                  sign: true
                });
                
                let failed = false;
                try {
                    await deployedContract.testassert({
                        message: "nothello"
                    }, {
                      authorization: `${code}@active`,
                      broadcast: true,
                      sign: true
                    });
                } catch(e) {
                    failed = true;
                }
                assert(failed,"should have failed");
                
                const newAccountKeys = await getCreateAccount("newaccount");
                
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('test console print', done => {
        (async () => {
            try {
                const message = "testing";
                const res = await deployedContract.testprint({
                    message
                }, {
                  authorization: `${code}@active`,
                  broadcast: true,
                  sign: true
                });
                const console_print = res.processed.action_traces[0].console;
                assert(console_print,message);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('test get table', done => {
        (async () => {
            try {
                const res = await tableHelper.eos.getTableRows({
                    code: "eosio.token",
                    scope: code,
                    table: "accounts",
                    json: true
                });
                // console.log(res.rows[0]);
                const balance = res.rows[0].balance.replace(' SYS', '');
                assert.equal(balance, '1000.0000');
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
});