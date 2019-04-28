import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getNetwork, getCreateKeys } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'vgrab';
var ctrt = artifacts.require(`./${contractCode}/`);
const delay = ms => new Promise(res => setTimeout(res, ms));

describe(`${contractCode} Contract`, () => {
  var testcontract;

  const code = 'airairairai1';
  const code2 = 'testuser5';
  var account = code;

  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        var deployedContract2 = await deployer.deploy(ctrt, code2);
        await genAllocateDAPPTokens(deployedContract, 'ipfs');
        // create token
        var selectedNetwork = getNetwork(getDefaultArgs());
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        if (account) {
          var keys = await getCreateKeys(account);
          config.keyProvider = keys.privateKey;
        }
        var eosvram = deployedContract.eos;
        config.httpEndpoint = 'http://localhost:13015';
        eosvram = new Eos(config);

        testcontract = await eosvram.contract(code);
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  xit('failing test', done => {
    done(new Error('simulating failed test'));
  });

  it('coldissue', done => {
    (async () => {
      try {
        var symbol = 'AIR';
        var failed = false;
        // create token
        await testcontract.create({
          issuer: code2,
          maximum_supply: `1000000000.0000 ${symbol}`
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        var key = await getCreateKeys(code2);
        var testtoken = testcontract;
        await testtoken.coldissue({
          to: code2,
          quantity: `1000.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code2}@active`,
          broadcast: true,
          keyProvider: [key.privateKey],
          sign: true
        });
        await delay(3000);
        try {
          await testtoken.transfer({
            from: code2,
            to: code,
            quantity: `100.0000 ${symbol}`,
            memo: ''
          }, {
            authorization: `${code2}@active`,
            broadcast: true,
            keyProvider: [key.privateKey],
            sign: true
          });
        } catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed before withdraw');
        await delay(3000);

        await testtoken.withdraw({
          to: code2,
          quantity: `1.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code2}@active`,
          broadcast: true,
          keyProvider: [key.privateKey],
          sign: true
        });
        await testtoken.transfer({
          from: code2,
          to: code,
          quantity: `1.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code2}@active`,
          broadcast: true,
          keyProvider: [key.privateKey],
          sign: true
        });
        await delay(3000);
        failed = false;
        try {
          await testtoken.transfer({
            from: code2,
            to: code,
            quantity: `1000.0000 ${symbol}`,
            memo: ''
          }, {
            authorization: `${code2}@active`,
            broadcast: true,
            keyProvider: [key.privateKey],
            sign: true
          });
        } catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed big transfer');

        done();
      } catch (e) {
        done(e);
      }
    })();
  });
});
