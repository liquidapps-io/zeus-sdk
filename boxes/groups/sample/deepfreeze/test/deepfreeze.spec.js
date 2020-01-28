require('mocha');


const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getCreateAccount, getNetwork } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'deepfreeze';
var ctrt = artifacts.require(`./${contractCode}/`);
var token_ctrt = artifacts.require(`./Token/`);
const delay = ms => new Promise(res => setTimeout(res, ms));

describe(`${contractCode} Contract`, () => {
  var testcontract;
  var freezecontract;

  const code = 'deepfreeze';
  const code2 = 'atoken';
  const testuser = 'user1';
  const testuser2 = 'user2';
  var account = code;
  var symbol = 'TEST';

  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);

        var deployedContract2 = await deployer.deploy(token_ctrt, code2);
        await deployedContract2.contractInstance.create({
          issuer: code2,
          maximum_supply: `1000000000.0000 ${symbol}`
        }, {
          authorization: `${code2}@active`,
          broadcast: true,
          sign: true
        });

        await getCreateAccount(testuser);
        await getCreateAccount(testuser2);

        await deployedContract2.contractInstance.issue({
          to: testuser,
          quantity: `2000.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code2}@active`,
          broadcast: true,
          sign: true
        });
        await genAllocateDAPPTokens(deployedContract, 'ipfs');
        const { getTestContract, getLocalDSPEos } = require('../extensions/tools/eos/utils');
        testcontract = await getTestContract(code);
        var dspeos = await getLocalDSPEos(code);

        testcontract = await dspeos.contract(code2);
        freezecontract = await dspeos.contract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('deepfreeze', done => {
    (async () => {
      try {
        var failed = false;
        // create token
        var key = await getCreateKeys(testuser);
        var testtoken = testcontract;
        await testtoken.transfer({
          from: testuser,
          to: code,
          quantity: `100.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${testuser}@active`,
          broadcast: true,
          keyProvider: [key.active.privateKey],
          sign: true
        });

        await freezecontract.withdraw({
          to: testuser,
          token_contract: code2
        }, {
          authorization: `${testuser}@active`,
          broadcast: true,
          keyProvider: [key.active.privateKey],
          sign: true
        });

        failed = false;
        try {
          await freezecontract.withdraw({
            to: testuser,
            token_contract: code2
          }, {
            authorization: `${testuser}@active`,
            broadcast: true,
            keyProvider: [key.active.privateKey],
            sign: true
          });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed');
        await testtoken.transfer({
          from: testuser,
          to: code,
          quantity: `100.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${testuser}@active`,
          broadcast: true,
          keyProvider: [key.active.privateKey],
          sign: true
        });

        await freezecontract.withdraw({
          to: testuser,
          token_contract: code2
        }, {
          authorization: `${testuser}@active`,
          broadcast: true,
          keyProvider: [key.active.privateKey],
          sign: true
        });

        await testtoken.transfer({
          from: testuser,
          to: code,
          quantity: `100.0000 ${symbol}`,
          memo: testuser2
        }, {
          authorization: `${testuser}@active`,
          broadcast: true,
          keyProvider: [key.active.privateKey],
          sign: true
        });
        failed = false;
        try {
          await freezecontract.withdraw({
            to: testuser,
            token_contract: code2
          }, {
            authorization: `${testuser}@active`,
            broadcast: true,
            keyProvider: [key.active.privateKey],
            sign: true
          });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed');
        var key2 = await getCreateKeys(testuser2);
        await freezecontract.withdraw({
          to: testuser2,
          token_contract: code2
        }, {
          authorization: `${testuser2}@active`,
          broadcast: true,
          keyProvider: [key2.active.privateKey],
          sign: true
        });

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it.skip('airdrop', done => {
    (async () => {
      try {
        // create token
        var key = await getCreateKeys(testuser);
        var testtoken = testcontract;
        var chars = 'abcdefghijklmnopqrstuvwxyz12345';
        chars = 'abcdefghijklmnop';
        var promises = [];
        var count = 100;
        for (var i = 0; i < chars.length; i++) {
          for (var i2 = 0; i2 < chars.length; i2++) {
            var user = `test${chars[i]}${chars[i2]}`;
            promises.push(getCreateAccount(user));
            if (promises.length >= count) {
              console.log(`create account batch ${user} ${count}`);
              await Promise.all(promises);
              promises = [];
            }
          }
        }
        await Promise.all(promises);
        promises = [];
        count = 10;
        for (var i = 0; i < chars.length; i++) {
          for (var i2 = 0; i2 < chars.length; i2++) {
            async function txu(user) {
              try {
                var res = testtoken.transfer({
                  from: testuser,
                  to: code,
                  quantity: `0.0001 ${symbol}`,
                  memo: user
                }, {
                  authorization: `${testuser}@active`,
                  broadcast: true,
                  keyProvider: [key.active.privateKey],
                  sign: true
                });
                console.log('done', user);
                return res;
              }
              catch (e) {
                console.log('failed for', user);
              }
            }
            var user2 = `test${chars[i]}${chars[i2]}`;
            promises.push(txu(user2));
            if (promises.length >= count) {
              console.log(`airdrop account batch ${user2} ${count}`);
              await Promise.all(promises);
              promises = [];
            }
          }
        }
        await Promise.all(promises);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
