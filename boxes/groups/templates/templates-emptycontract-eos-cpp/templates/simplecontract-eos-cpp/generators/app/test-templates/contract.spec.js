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
    before(done => {
        (async () => {
            try {
                await deployer.deploy(ctrt, code);
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

    it('test', done => {
        (async () => {
            try {
                await deployedContract.print({
                    message: "hello"
                }, {
                  authorization: `${code}@active`,
                  broadcast: true,
                  sign: true
                });
                
                let failed = false;
                try {
                    await deployedContract.print({
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
});