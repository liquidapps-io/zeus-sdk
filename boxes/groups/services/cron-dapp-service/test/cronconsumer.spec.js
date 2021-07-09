require('mocha');


const { assert } = require('chai'); // Using Assert style
const { requireBox } = require('@liquidapps/box-utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { getTestContract, getLocalDSPEos } = requireBox('seed-eos/tools/eos/utils');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');

const { eosio } = requireBox('test-extensions/lib/index');

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
        testcontract = await getTestContract(code);
        var res = await testcontract.testschedule({
          interval: 2
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        var second = res.rows[0].counter;
        assert.ok(second > first, 'counter did not increase');
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'counter did not increase');
        await testcontract.removetimer({
          account: code
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
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
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        var second = res.rows[0].counter;
        assert.ok(second > first, 'counter did not increase');
        await eosio.delay(5000);
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
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        second = res.rows[0].counter;
        assert.ok(second > first, 'second account counter did not increase');
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'second account counter did not increase');
        await testcontract2.removetimer({
          account: multiOne
        }, {
          authorization: `${multiOne}@active`,
          broadcast: true,
          sign: true
        });
        await testcontract2.removetimer({
          account: multiTwo
        }, {
          authorization: `${multiTwo}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [multiTwoKeys.active.privateKey]
        });
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
        await eosio.delay(5000);
        res = await testcontract2.removetimer({
          account: removeTimerTest
        }, {
          authorization: `${removeTimerTest}@active`,
          broadcast: true,
          sign: true
        });
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': removeTimerTest,
          'code': removeTimerTest,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await eosio.delay(5000);
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
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': payloadTest,
          'code': payloadTest,
          'table': 'payloadtbl',
          'limit': 100
        });
        let string = res.rows[0].payload;
        assert.ok(string == "Payload Test", 'payload string missing from singleton');
        await testcontract2.removetimer({
          account: payloadTest
        }, {
          authorization: `${payloadTest}@active`,
          broadcast: true,
          sign: true
        });
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
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiOne,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        var second = res.rows[0].counter;
        assert.ok(second > first, 'counter did not increase');
        await eosio.delay(5000);
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
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        second = res.rows[0].counter;
        assert.ok(second > first, 'second account counter did not increase');
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': multiTwo,
          'code': multiOne,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'second account counter did not increase');
        await testcontract2.removetimer({
          account: multiOne
        }, {
          authorization: `${multiOne}@active`,
          broadcast: true,
          sign: true
        });
        await testcontract2.removetimer({
          account: multiTwo
        }, {
          authorization: `${multiOne}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  
  it('Cron test - "{abort_service_request}"', done => {
    (async () => {
      const aborttest = `aborttest`
      const deployedContractAbort = await deployer.deploy(ctrt, aborttest);
      await genAllocateDAPPTokens(deployedContractAbort, 'cron');
      const testcontractAboort = await getTestContract(aborttest);
      try {
        let res = await dspeos.getTableRows({
          'json': true,
          'scope': aborttest,
          'code': aborttest,
          'table': 'stat',
          'limit': 100
        });
        let first, second
        if(!res.rows.length) {
          first = ''
        } else {
          first = res.rows[0].counter;
        }
        res = await testcontractAboort.testabort({
          account: aborttest
        }, {
          authorization: `${aborttest}@active`,
          broadcast: true,
          sign: true
        });
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': aborttest,
          'code': aborttest,
          'table': 'stat',
          'limit': 100
        });
        if(!res.rows.length) {
          second = ''
        } else {
          second = res.rows[0].payload;
        }
        assert.equal(second, first, 'counter should never fire, always aborted');
        await testcontractAboort.removetimer({
          account: aborttest
        }, {
          authorization: `${aborttest}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  
  it('Cron test - test interval', done => {
    (async () => {
      const payloadTest = `intervltst`
      const contract = await deployer.deploy(ctrt, payloadTest);
      await genAllocateDAPPTokens(contract, 'cron');
      const contractInstance = await getTestContract(payloadTest);
      try {
        let res = await dspeos.getTableRows({
          'json': true,
          'scope': payloadTest,
          'code': payloadTest,
          'table': 'stat',
          'limit': 100
        });
        let first = 0;
        if(res.rows && res.rows.length) {
          first = res.rows[0].counter
        }
        res = await contractInstance.testinterval({
          interval: 2
        }, {
          authorization: `${payloadTest}@active`,
          broadcast: true,
          sign: true
        });
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': payloadTest,
          'code': payloadTest,
          'table': 'stat',
          'limit': 100
        });
        let second = 0;
        if(res.rows && res.rows.length) {
          second = res.rows[0].counter
        }
        assert.ok(second > first, 'counter did not increase');
        await contractInstance.rminterval({}, {
          authorization: `${payloadTest}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  
  it('Cron test - remove interval', done => {
    (async () => {
      const payloadTest = `rmintervltst`
      const contract = await deployer.deploy(ctrt, payloadTest);
      await genAllocateDAPPTokens(contract, 'cron');
      const contractInstance = await getTestContract(payloadTest);
      try {
        let res = await dspeos.getTableRows({
          'json': true,
          'scope': payloadTest,
          'code': payloadTest,
          'table': 'stat',
          'limit': 100
        });
        let first = 0;
        if(res.rows && res.rows.length) {
          first = res.rows[0].counter
        }
        res = await contractInstance.testinterval({
          interval: 2
        }, {
          authorization: `${payloadTest}@active`,
          broadcast: true,
          sign: true
        });
        await eosio.delay(5000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': payloadTest,
          'code': payloadTest,
          'table': 'stat',
          'limit': 100
        });
        let second = 0;
        if(res.rows && res.rows.length) {
          second = res.rows[0].counter
        }
        assert.ok(second > first, 'counter did not increase');
        res = await contractInstance.rminterval({}, {
          authorization: `${payloadTest}@active`,
          broadcast: true,
          sign: true
        });
        await eosio.delay(3000);
        let third = 0;
        res = await dspeos.getTableRows({
          'json': true,
          'scope': payloadTest,
          'code': payloadTest,
          'table': 'stat',
          'limit': 100
        });
        if(res.rows && res.rows.length) {
          third = res.rows[0].counter
        }
        await eosio.delay(5000);
        let fourth = 0;
        res = await dspeos.getTableRows({
          'json': true,
          'scope': payloadTest,
          'code': payloadTest,
          'table': 'stat',
          'limit': 100
        });
        if(res.rows && res.rows.length) {
          fourth = res.rows[0].counter
        }
        assert.ok(third === fourth, 'counter should not have increased after being removed');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});