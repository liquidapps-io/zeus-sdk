require('mocha');


const { assert } = require('chai'); // Using Assert style
const { requireBox } = require('@liquidapps/box-utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { getTestContract, getLocalDSPEos } = requireBox('seed-eos/tools/eos/utils');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');

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
  
  it('Cron test - multi timer', done => {
    (async () => {
      const multiOne = `multitest1`
      const multiTwo = `multitest2`
      const deployedContract2 = await deployer.deploy(ctrt, multiOne);
      await deployer.deploy(ctrt, multiTwo);
      await genAllocateDAPPTokens(deployedContract2, 'cron');
      const testcontract2 = await getTestContract(multiOne);
      const multiTwoKeys = await getCreateKeys(multiTwo);
      try {
        let res = await testcontract2.multitimer({
          account: multiTwo,
          interval: 2
        }, {
          authorization: `${multiTwo}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [multiTwoKeys.active.privateKey]
        });
        res = await testcontract2.multitimer({
          account: multiOne,
          interval: 2
        }, {
          authorization: `${multiOne}@active`,
          broadcast: true,
          sign: true
        });
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        var second = res.rows[0].counter;
        assert.ok(second > first, 'counter did not increase');
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'counter did not increase');
        
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        first = res.rows[0].counter;
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        second = res.rows[0].counter;
        assert.ok(second > first, 'second account counter did not increase');
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'second account counter did not increase');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  
  it('Cron test - remove timer', done => {
    (async () => {
      const removeTimerTest = `removetimer1`
      const deployedContract2 = await deployer.deploy(ctrt, removeTimerTest);
      await genAllocateDAPPTokens(deployedContract2, 'cron');
      const testcontract2 = await getTestContract(removeTimerTest);
      try {
        let res = await testcontract2.multitimer({
          account: removeTimerTest,
          interval: 2
        }, {
          authorization: `${removeTimerTest}@active`,
          broadcast: true,
          sign: true
        });
        await delay(5000);
        res = await testcontract2.removetimer({
          account: removeTimerTest
        }, {
          authorization: `${removeTimerTest}@active`,
          broadcast: true,
          sign: true
        });
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': removeTimerTest,
          'code': removeTimerTest,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': removeTimerTest,
          'code': removeTimerTest,
          'table': 'stat',
          'limit': 100
        });
        let second = res.rows[0].counter;
        assert.ok(second == first, 'timer not removed, counter increased');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  
  it('Cron test - payload', done => {
    (async () => {
      const payloadTest = `payloadtest`
      const deployedContract2 = await deployer.deploy(ctrt, payloadTest);
      await genAllocateDAPPTokens(deployedContract2, 'cron');
      const testcontract2 = await getTestContract(payloadTest);
      try {
        let res = await testcontract2.testpayload({
          account: payloadTest,
          payload: Buffer.from("Payload Test"),
          seconds: 2
        }, {
          authorization: `${payloadTest}@active`,
          broadcast: true,
          sign: true
        });
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': payloadTest,
          'code': payloadTest,
          'table': 'payloadtbl',
          'limit': 100
        });
        let string = res.rows[0].payload;
        assert.ok(string == "Payload Test", 'payload string missing from singleton');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  
  it('Cron test - multi timer same account', done => {
    (async () => {
      const multiOne = `multiacct1`
      const multiTwo = `timer1`
      const deployedContract2 = await deployer.deploy(ctrt, multiOne);
      await genAllocateDAPPTokens(deployedContract2, 'cron');
      const testcontract2 = await getTestContract(multiOne);
      try {
        let res = await testcontract2.multitimer({
          account: multiTwo,
          interval: 2
        }, {
          authorization: `${multiOne}@active`,
          broadcast: true,
          sign: true
        });
        res = await testcontract2.multitimer({
          account: multiOne,
          interval: 2
        }, {
          authorization: `${multiOne}@active`,
          broadcast: true,
          sign: true
        });
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        var second = res.rows[0].counter;
        assert.ok(second > first, 'counter did not increase');
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'counter did not increase');
        
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        first = res.rows[0].counter;
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        second = res.rows[0].counter;
        assert.ok(second > first, 'second account counter did not increase');
        await delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'second account counter did not increase');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});