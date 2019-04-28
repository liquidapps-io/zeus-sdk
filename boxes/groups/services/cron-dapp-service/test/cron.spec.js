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
const delay = ms => new Promise(res => setTimeout(res, ms));

var contractCode = 'cronconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Cron Service Test Contract`, () => {
  var testcontract;
  const code = 'test1';
  var eosvram;
  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, 'cron');
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
        eosvram = deployedContract.eos;
        config.httpEndpoint = 'http://localhost:13015';
        eosvram = new Eos(config);

        testcontract = await eosvram.contract(code);
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it('Cron test - every 2 seconds', done => {
    (async () => {
      try {
        var res = await testcontract.testschedule({}, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await delay(15000);
        res = await eosvram.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        assert.equal(res.rows[0].counter, '4', 'counter did not increase');

        done();
      } catch (e) {
        done(e);
      }
    })();
  });
});
