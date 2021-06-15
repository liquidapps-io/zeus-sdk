require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getTestContract, getUrl, getCreateAccount, getEos } = requireBox('seed-eos/tools/eos/utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const { dappServicesContract, dappGovernorContract } = requireBox('dapp-services/tools/eos/dapp-services');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
// const { genAllocateDAPPTokens, readVRAMData } = requireBox('dapp-services/tools/eos/dapp-services');

const contractCode = 'splitter';
const ctrt = artifacts.require(`./${contractCode}/`);
const { awaitTable, getTable, delay } = requireBox('seed-tests/lib/index');

async function allocateDAPPTokens(account, quantity = '1000.0000 DAPP') {
    const eos = await getEos(dappServicesContract);
    const servicesTokenContract = await eos.contract(dappServicesContract);
    await servicesTokenContract.issue({
      to: account,
      quantity: quantity,
      memo: ''
    }, {
      authorization: `${dappServicesContract}@active`,
    });
}

async function openBalance(account, splitter) {
  let eos = await getEos(splitter);
  let servicesTokenContract = await eos.contract(splitter);
  let keys = await getCreateKeys(account);
  await servicesTokenContract.open({
      owner: account,
      ram_payer: account
  }, {
    authorization: `${account}@active`,
    keyProvider: [keys.active.privateKey]
  });
  eos = await getEos(dappServicesContract);
  servicesTokenContract = await eos.contract(dappServicesContract);
  keys = await getCreateKeys(account);
  await servicesTokenContract.open({
      owner: account,
      symbol: "DAPP",
      ram_payer: account
  }, {
    authorization: `${account}@active`,
    keyProvider: [keys.active.privateKey]
  });
}

describe(`${contractCode} Contract`, () => {
    let dappTokenMainnet, eosioToken, eosWrapper, testSender;
    before(done => {
        (async () => {
            try {
                testSender = 'testsender';
                await getCreateAccount(testSender)
                await getCreateAccount('anotheract')
                let keys = await getCreateKeys(testSender);
                eosioToken = getEosWrapper({
                  keyProvider: keys.active.privateKey,
                  httpEndpoint: 'http://localhost:8888',
                  sign:true
                });
                dappTokenMainnet = await eosioToken.contract('dappservices');
                eosWrapper = getEosWrapper({
                  httpEndpoint: `http://localhost:8888`,
                  keyProvider: keys.active.privateKey
                });
                await allocateDAPPTokens(testSender);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Test setup splitter with 2 accounts', done => {
        (async () => {
            try {
                const splitterContractName = 'socmult1';
                const splitterContractName2 = 'socmult2';
                const testAccount1 = 'account11';
                const testAccount2 = 'account12';
                const testAccount3 = 'account13';
                const testAccount4 = 'account14';
                const percentage = '0.5';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContract2 = await deployer.deploy(ctrt, splitterContractName2);
                const splitterContractInstance = splitterContract.contractInstance;
                const splitterContractInstance2 = splitterContract2.contractInstance;
                const keys = await getCreateAccount(splitterContractName);
                const keys2 = await getCreateAccount(splitterContractName2);
                await getCreateAccount(testAccount1);
                await getCreateAccount(testAccount2);
                await getCreateAccount(testAccount3);
                await getCreateAccount(testAccount4);
                let res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage 
                        },
                        {
                          account: testAccount2,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await splitterContractInstance2.setup(
                {
                    payouts: [
                        {
                          account: testAccount3,
                          percentage 
                        },
                        {
                          account: testAccount4,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                await dappTokenMainnet.transfer({
                  from: testSender,
                  to: splitterContractName,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await dappTokenMainnet.transfer({
                  from: testSender,
                  to: splitterContractName2,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await openBalance(testAccount1, splitterContractName);
                await openBalance(testAccount2, splitterContractName);
                await openBalance(testAccount3, splitterContractName2);
                await openBalance(testAccount4, splitterContractName2);
                await openBalance(splitterContractName, splitterContractName);
                await openBalance(splitterContractName2, splitterContractName2);
                
                await splitterContractInstance.claim({
                  account: splitterContractName,
                  all: true
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await splitterContractInstance2.claim({
                  account: splitterContractName2,
                  all: true
                }, {
                  authorization: `${splitterContractName2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                assert.equal(postBalance1, postBalance2);
                assert.equal(postBalance1, preBalance1 + 1);
                assert.equal(postBalance2, preBalance2 + 1);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });


    it('Test multi account splitter with resetup', done => {
        (async () => {
            try {
                const splitterContractName = 'splitter11';
                const testAccount1 = 'account11ba';
                const testAccount2 = 'account12ba';
                const percentage = '0.5';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContractInstance = splitterContract.contractInstance;
                const keys = await getCreateAccount(splitterContractName)
                await getCreateAccount(testAccount1)
                await getCreateAccount(testAccount2)
                let res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage 
                        },
                        {
                          account: testAccount2,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await openBalance(testAccount1, splitterContractName);
                await openBalance(testAccount2, splitterContractName);
                await openBalance(splitterContractName, splitterContractName);
                await splitterContractInstance.claim({
                  account: splitterContractName,
                  all: true
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                assert.equal(postBalance1, postBalance2);
                assert.equal(postBalance1, preBalance1 + 1);
                assert.equal(postBalance2, preBalance2 + 1);
                let percentage1 = '0.25';
                let percentage2 = '0.75';
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage: percentage1 
                        },
                        {
                          account: testAccount2,
                          percentage: percentage2
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "8.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await splitterContractInstance.claim({
                  account: splitterContractName,
                  all: true
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                assert.equal(postBalance1, preBalance1 + 2);
                assert.equal(postBalance2, preBalance2 + 6);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Test setup splitter with 5 accounts', done => {
        (async () => {
            try {
                const splitterContractName = 'splitter21';
                const testAccount1 = 'account21';
                const testAccount2 = 'account22';
                const testAccount3 = 'account23';
                const testAccount4 = 'account24';
                const testAccount5 = 'account25';
                const percentage = '0.2';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContractInstance = splitterContract.contractInstance;
                const keys = await getCreateAccount(splitterContractName)
                await getCreateAccount(testAccount1)
                await getCreateAccount(testAccount2)
                await getCreateAccount(testAccount3)
                await getCreateAccount(testAccount4)
                await getCreateAccount(testAccount5)
                let res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount3)
                let preBalance3 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount4)
                let preBalance4 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount5)
                let preBalance5 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage 
                        },
                        {
                          account: testAccount2,
                          percentage
                        },
                        {
                          account: testAccount3,
                          percentage
                        },
                        {
                          account: testAccount4,
                          percentage
                        },
                        {
                          account: testAccount5,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "5.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await openBalance(testAccount1, splitterContractName);
                await openBalance(testAccount2, splitterContractName);
                await openBalance(splitterContractName, splitterContractName);
                await splitterContractInstance.claim({
                  account: splitterContractName,
                  all: true
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount3)
                let postBalance3 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount4)
                let postBalance4 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount5)
                let postBalance5 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                assert.equal(postBalance1, postBalance2);
                assert.equal(postBalance2, postBalance3);
                assert.equal(postBalance3, postBalance4);
                assert.equal(postBalance4, postBalance5);
                assert.equal(postBalance1, preBalance1 + 1);
                assert.equal(postBalance2, preBalance2 + 1);
                assert.equal(postBalance3, preBalance3 + 1);
                assert.equal(postBalance4, preBalance4 + 1);
                assert.equal(postBalance5, preBalance5 + 1);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Test setup splitter with percentage does not total 100%', done => {
        (async () => {
            try {
                const splitterContractName = 'splitter31';
                const testAccount1 = 'account11c';
                const testAccount2 = 'account12c';
                let percentage = '0.6';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContractInstance = splitterContract.contractInstance;
                const keys = await getCreateAccount(splitterContractName)
                await getCreateAccount(testAccount1)
                await getCreateAccount(testAccount2)
                let failed = false, error = '';
                // test 120%
                try { 
                    await splitterContractInstance.setup(
                    {
                        payouts: [
                            {
                              account: testAccount1,
                              percentage 
                            },
                            {
                              account: testAccount2,
                              percentage
                            }
                        ]
                    }, {
                      authorization: `${splitterContractName}@active`,
                      broadcast: true,
                      sign: true,
                      keyProvider: [keys.active.privateKey],
                    });
                } catch (e) {
                  error = e.message;
                  failed = true;
                }
                assert(failed, "should have failed with 'total percentage must equal 1 (100%) between all owners'");
                assert.equal(error, `assertion failure with message: total percentage must equal 1 (100%) between all owners`);
                failed = false, error = '';
                // test 80%
                percentage = '0.4';
                try {
                    await splitterContractInstance.setup(
                    {
                        payouts: [
                            {
                              account: testAccount1,
                              percentage 
                            },
                            {
                              account: testAccount2,
                              percentage
                            }
                        ]
                    }, {
                      authorization: `${splitterContractName}@active`,
                      broadcast: true,
                      sign: true,
                      keyProvider: [keys.active.privateKey],
                    });
                } catch (e) {
                  error = e.message;
                  failed = true;
                }
                assert(failed, "should have failed with 'total percentage must equal 1 (100%) between all owners'");
                assert.equal(error, `assertion failure with message: total percentage must equal 1 (100%) between all owners`);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    // it('Test setup splitter, claim with unauthorized account', done => {
    //     (async () => {
    //         try {
    //             const splitterContractName = 'splitter311';
    //             const testAccount1 = 'account11c1';
    //             const testAccount2 = 'account12c1';
    //             const testAccountWhoRU = 'sneaky11';
    //             let percentage = '0.5';
    //             const splitterContract = await deployer.deploy(ctrt, splitterContractName);
    //             const splitterContractInstance = splitterContract.contractInstance;
    //             const keys = await getCreateAccount(splitterContractName)
    //             const sneakyKeys = await getCreateAccount(testAccountWhoRU)
    //             await getCreateAccount(testAccount1)
    //             await getCreateAccount(testAccount2)
    //             await getCreateAccount(testAccountWhoRU)
    //             await splitterContractInstance.setup(
    //             {
    //                 payouts: [
    //                     {
    //                       account: testAccount1,
    //                       percentage 
    //                     },
    //                     {
    //                       account: testAccount2,
    //                       percentage
    //                     }
    //                 ]
    //             }, {
    //               authorization: `${splitterContractName}@active`,
    //               broadcast: true,
    //               sign: true,
    //               keyProvider: [keys.active.privateKey],
    //             });
    //             await openBalance(testAccount1, splitterContractName);
    //             await openBalance(testAccount2, splitterContractName);
    //             await openBalance(testAccountWhoRU, splitterContractName);
    //             await openBalance(splitterContractName, splitterContractName);
    //             let failed = false, error = '';
    //             try { 
    //               await splitterContractInstance.claim({
    //                 account: testAccountWhoRU,
    //                 all: false
    //               }, {
    //                 authorization: `${testAccountWhoRU}@active`,
    //                 broadcast: true,
    //                 sign: true,
    //                 keyProvider: [sneakyKeys.active.privateKey],
    //               });
    //               } catch (e) {
    //                 error = e.message;
    //                 failed = true;
    //               }
    //             assert(failed, "should have failed with 'account used is not authorized to claim'");
    //             assert.equal(error, `assertion failure with message: account used is not authorized to claim`);
    //             done();
    //         }
    //         catch (e) {
    //             done(e);
    //         }
    //     })();
    // });

    // split

    it('Test setup 2 splitters with 2 accounts individual', done => {
        (async () => {
            try {
                const splitterContractName = 'socmult3';
                const splitterContractName2 = 'socmult4';
                const splitter2 = 'third4';
                const testAccount1 = 'account11a';
                const testAccount2 = 'account12a';
                const testAccount3 = 'account13a';
                const testAccount4 = 'account14a';
                const percentage = '0.5';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContract2 = await deployer.deploy(ctrt, splitterContractName2);
                const splitterContractInstance = splitterContract.contractInstance;
                const splitterContractInstance2 = splitterContract2.contractInstance;
                const keys_spliiter = await getCreateAccount(splitterContractName);
                const keys_spliiter2 = await getCreateAccount(splitterContractName2);
                const keys1 = await getCreateAccount(testAccount1);
                const keys2 = await getCreateAccount(testAccount2);
                const keys3 = await getCreateAccount(testAccount3);
                const keys4 = await getCreateAccount(testAccount4);
                await getCreateAccount(testAccount1);
                await getCreateAccount(testAccount2);
                await getCreateAccount(testAccount3);
                await getCreateAccount(testAccount4);
                let res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage 
                        },
                        {
                          account: testAccount2,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys_spliiter.active.privateKey],
                });
                await splitterContractInstance2.setup(
                {
                    payouts: [
                        {
                          account: testAccount3,
                          percentage 
                        },
                        {
                          account: testAccount4,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys_spliiter2.active.privateKey],
                });
                await dappTokenMainnet.transfer({
                  from: testSender,
                  to: splitterContractName,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await dappTokenMainnet.transfer({
                  from: testSender,
                  to: splitterContractName2,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await openBalance(testAccount1, splitterContractName);
                await openBalance(testAccount2, splitterContractName);
                await openBalance(testAccount3, splitterContractName2);
                await openBalance(testAccount4, splitterContractName2);
                await openBalance(splitterContractName, splitterContractName);
                await openBalance(splitterContractName2, splitterContractName2);
                
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                await splitterContractInstance.claim({
                  account: testAccount1,
                  all: false
                }, {
                  authorization: `${testAccount1}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys1.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                await splitterContractInstance.claim({
                  account: testAccount2,
                  all: false
                }, {
                  authorization: `${testAccount2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                await splitterContractInstance2.claim({
                  account: testAccount3,
                  all: false
                }, {
                  authorization: `${testAccount3}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys3.active.privateKey],
                });
                await splitterContractInstance2.claim({
                  account: testAccount4,
                  all: false
                }, {
                  authorization: `${testAccount4}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys4.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                assert.equal(postBalance1, postBalance2);
                assert.equal(postBalance1, preBalance1 + 1);
                assert.equal(postBalance2, preBalance2 + 1);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });


    it('Test multi account splitter with resetup individual', done => {
        (async () => {
            try {
                const splitterContractName = 'splitter11a';
                const testAccount1 = 'account11b';
                const testAccount2 = 'account12b';
                const percentage = '0.5';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContractInstance = splitterContract.contractInstance;
                const keys = await getCreateAccount(splitterContractName)
                const keys1 = await getCreateAccount(testAccount1)
                const keys2 = await getCreateAccount(testAccount2)
                await getCreateAccount(testAccount1)
                await getCreateAccount(testAccount2)
                let res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                preBalance1 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                preBalance2 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage 
                        },
                        {
                          account: testAccount2,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await openBalance(testAccount1, splitterContractName);
                await openBalance(testAccount2, splitterContractName);
                await openBalance(splitterContractName, splitterContractName);
                await splitterContractInstance.claim({
                  account: testAccount1,
                  all: false
                }, {
                  authorization: `${testAccount1}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys1.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                let postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                let postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                res = await getTable(eosWrapper,splitterContractName,'accounts',splitterContractName)
                let postSplitterBalanceItself1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.claim({
                  account: testAccount2,
                  all: false
                }, {
                  authorization: `${testAccount2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                assert.equal(postBalance1, postBalance2);
                assert.equal(postBalance1, preBalance1 + 1);
                assert.equal(postBalance2, preBalance2 + 1);
                let percentage1 = '0.25';
                let percentage2 = '0.75';
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                preBalance1 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                preBalance2 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage: percentage1 
                        },
                        {
                          account: testAccount2,
                          percentage: percentage2
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "8.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await splitterContractInstance.claim({
                  account: testAccount1,
                  all: false
                }, {
                  authorization: `${testAccount1}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys1.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                await splitterContractInstance.claim({
                  account: testAccount2,
                  all: false
                }, {
                  authorization: `${testAccount2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postBalance1 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postBalance2 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                assert.equal(postBalance1, preBalance1 + 2);
                assert.equal(postBalance2, preBalance2 + 6);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('Test setup splitter with 5 accounts individual', done => {
        (async () => {
            try {
                const splitterContractName = 'splitter21';
                const testAccount1 = 'account21a';
                const testAccount2 = 'account22a';
                const testAccount3 = 'account23a';
                const testAccount4 = 'account24a';
                const testAccount5 = 'account25a';
                const percentage = '0.2';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContractInstance = splitterContract.contractInstance;
                const keys = await getCreateAccount(splitterContractName)
                const keys1 = await getCreateAccount(testAccount1)
                const keys2 = await getCreateAccount(testAccount2)
                const keys3 = await getCreateAccount(testAccount3)
                const keys4 = await getCreateAccount(testAccount4)
                const keys5 = await getCreateAccount(testAccount5)
                await getCreateAccount(testAccount1)
                await getCreateAccount(testAccount2)
                await getCreateAccount(testAccount3)
                await getCreateAccount(testAccount4)
                await getCreateAccount(testAccount5)
                let res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount3)
                let preBalance3 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount4)
                let preBalance4 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount5)
                let preBalance5 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage 
                        },
                        {
                          account: testAccount2,
                          percentage
                        },
                        {
                          account: testAccount3,
                          percentage
                        },
                        {
                          account: testAccount4,
                          percentage
                        },
                        {
                          account: testAccount5,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await openBalance(testAccount1, splitterContractName);
                await openBalance(testAccount2, splitterContractName);
                await openBalance(testAccount3, splitterContractName);
                await openBalance(testAccount4, splitterContractName);
                await openBalance(testAccount5, splitterContractName);
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "5.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await splitterContractInstance.claim({
                  account: testAccount1,
                  all: false
                }, {
                  authorization: `${testAccount1}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys1.active.privateKey],
                });
                await splitterContractInstance.claim({
                  account: testAccount2,
                  all: false
                }, {
                  authorization: `${testAccount2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                await splitterContractInstance.claim({
                  account: testAccount3,
                  all: false
                }, {
                  authorization: `${testAccount3}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys3.active.privateKey],
                });
                await splitterContractInstance.claim({
                  account: testAccount4,
                  all: false
                }, {
                  authorization: `${testAccount4}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys4.active.privateKey],
                });
                await splitterContractInstance.claim({
                  account: testAccount5,
                  all: false
                }, {
                  authorization: `${testAccount5}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys5.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount3)
                let postBalance3 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount4)
                let postBalance4 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount5)
                let postBalance5 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                assert.equal(postBalance1, postBalance2);
                assert.equal(postBalance2, postBalance3);
                assert.equal(postBalance3, postBalance4);
                assert.equal(postBalance4, postBalance5);
                assert.equal(postBalance1, preBalance1 + 1);
                assert.equal(postBalance2, preBalance2 + 1);
                assert.equal(postBalance3, preBalance3 + 1);
                assert.equal(postBalance4, preBalance4 + 1);
                assert.equal(postBalance5, preBalance5 + 1);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });


    it('Test multi account splitter with resetup individual claim transfer claim', done => {
        (async () => {
            try {
                const splitterContractName = 'splitter11az';
                const testAccount1 = 'account11bz';
                const testAccount2 = 'account12bz';
                const percentage = '0.5';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContractInstance = splitterContract.contractInstance;
                const keys = await getCreateAccount(splitterContractName)
                const keys1 = await getCreateAccount(testAccount1)
                const keys2 = await getCreateAccount(testAccount2)
                await getCreateAccount(testAccount1)
                await getCreateAccount(testAccount2)
                let res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                preBalance1 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                preBalance2 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage 
                        },
                        {
                          account: testAccount2,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await openBalance(testAccount1, splitterContractName);
                await openBalance(testAccount2, splitterContractName);
                await openBalance(splitterContractName, splitterContractName);
                await splitterContractInstance.claim({
                  account: testAccount1,
                  all: false
                }, {
                  authorization: `${testAccount1}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys1.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                let postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                let postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await splitterContractInstance.claim({
                  account: testAccount2,
                  all: false
                }, {
                  authorization: `${testAccount2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                await splitterContractInstance.claim({
                  account: testAccount1,
                  all: false
                }, {
                  authorization: `${testAccount1}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys1.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                assert.equal(postBalance1, postBalance2);
                assert.equal(postBalance1, preBalance1 + 2);
                assert.equal(postBalance2, preBalance2 + 2);
                let percentage1 = '0.25';
                let percentage2 = '0.75';
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                preBalance1 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                preBalance2 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage: percentage1 
                        },
                        {
                          account: testAccount2,
                          percentage: percentage2
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "8.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await splitterContractInstance.claim({
                  account: testAccount1,
                  all: false
                }, {
                  authorization: `${testAccount1}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys1.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                await splitterContractInstance.claim({
                  account: testAccount2,
                  all: false
                }, {
                  authorization: `${testAccount2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                assert.equal(postBalance1, preBalance1 + 2);
                assert.equal(postBalance2, preBalance2 + 6);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });


    it('Test multi account splitter claim all resetup individual claim', done => {
        (async () => {
            try {
                const splitterContractName = 'splitter11az';
                const testAccount1 = 'account11bx';
                const testAccount2 = 'account12bx';
                const percentage = '0.5';
                const splitterContract = await deployer.deploy(ctrt, splitterContractName);
                const splitterContractInstance = splitterContract.contractInstance;
                const keys = await getCreateAccount(splitterContractName)
                const keys1 = await getCreateAccount(testAccount1)
                const keys2 = await getCreateAccount(testAccount2)
                await getCreateAccount(testAccount1)
                await getCreateAccount(testAccount2)
                let res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                preBalance1 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                preBalance2 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage 
                        },
                        {
                          account: testAccount2,
                          percentage
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "2.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await openBalance(testAccount1, splitterContractName);
                await openBalance(testAccount2, splitterContractName);
                await openBalance(splitterContractName, splitterContractName);
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                let postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                let postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                await splitterContractInstance.claim({
                  account: splitterContractName,
                  all: true
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                assert.equal(postBalance1, postBalance2);
                assert.equal(postBalance1, preBalance1 + 1);
                assert.equal(postBalance2, preBalance2 + 1);
                let percentage1 = '0.25';
                let percentage2 = '0.75';
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                preBalance1 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                preBalance2 += res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                await splitterContractInstance.setup(
                {
                    payouts: [
                        {
                          account: testAccount1,
                          percentage: percentage1 
                        },
                        {
                          account: testAccount2,
                          percentage: percentage2
                        }
                    ]
                }, {
                  authorization: `${splitterContractName}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys.active.privateKey],
                });
                await dappTokenMainnet.transfer({ 
                  from: testSender,
                  to: splitterContractName,
                  quantity: "8.0000 DAPP",
                  memo: ""
                }, {
                  authorization: `${testSender}@active`,
                  broadcast: true,
                  sign: true
                });
                await splitterContractInstance.claim({
                  account: testAccount1,
                  all: false
                }, {
                  authorization: `${testAccount1}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys1.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                await splitterContractInstance.claim({
                  account: testAccount2,
                  all: false
                }, {
                  authorization: `${testAccount2}@active`,
                  broadcast: true,
                  sign: true,
                  keyProvider: [keys2.active.privateKey],
                });
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount1)
                postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount1)
                postSplitterBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance1 += postSplitterBalance1
                res = await getTable(eosWrapper,'dappservices','accounts',testAccount2)
                postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                res = await getTable(eosWrapper,splitterContractName,'accounts',testAccount2)
                postSplitterBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
                postBalance2 += postSplitterBalance2
                assert.equal(postBalance1, preBalance1 + 2);
                assert.equal(postBalance2, preBalance2 + 6);
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });
});
