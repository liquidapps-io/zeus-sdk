require('mocha');


const { assert } = require('chai'); // Using Assert style
const { requireBox } = require('@liquidapps/box-utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const delay = ms => new Promise(res => setTimeout(res, ms));

var contractCode = 'cronconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Cron Service Test Contract`, () => {
  var testcontract;
  const code = 'test12312a';
  var dspeos;
  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, 'cron');
        const { getTestContract, getLocalDSPEos } = requireBox('seed-eos/tools/eos/utils');
        testcontract = await getTestContract(code);
        dspeos = await getLocalDSPEos(code);

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it('Cron test - every 2 seconds', done => {
    (async () => {
      try {
        var res = await testcontract.testschedule({
          interval: 2
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        var second = res.rows[0].counter;
        assert.ok(second > first, 'counter did not increase');
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'counter did not increase');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
