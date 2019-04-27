import { assert } from 'chai';
import 'mocha';
require('babel-core/register');
require('babel-polyfill');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const { getEos, getCreateAccount, getCreateKeys } = require('../extensions/tools/eos/utils');
const delay = ms => new Promise(res => setTimeout(res, ms));

var args = getDefaultArgs();
var systemToken = (args.creator !== 'eosio') ? 'EOS' : 'SYS';

async function genAllocateEOSTokens (account) {
  const keys = await getCreateAccount(account, args);
  const { creator } = args;
  var eos = await getEos(creator, args);
  let servicesTokenContract = await eos.contract('eosio.token');

  await servicesTokenContract.issue({
    to: account,
    quantity: `10000.0000 ${systemToken}`,
    memo: 'seed transfer'
  }, {
    authorization: `eosio@active`,
    broadcast: true,
    sign: true
  });
}

const contractCode = 'microauctions';
var contractArtifact = artifacts.require(`./${contractCode}/`);
var tokenContract = artifacts.require(`./Token/`);
describe(`${contractCode} Contract`, () => {
  var testcontract;
  var disttokenContract;
  const perCycle = '100.0000';
  const totalTokens = '2400.0000';
  const code = 'auction1';
  const cycleTime = 4;
  const cycles = 24;
  const distokenSymbol = 'NEW';
  const disttoken = 'distoken';
  const testuser1 = 'testuser1';
  const testuser2 = 'testuser2';
  const testuser3 = 'testuser3';
  const testuserAlt = 'altcoinomysa';
  const savings_account = 'savinga';
  var startTime;
  var eos;
  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(contractArtifact, code);
        var deployedToken = await deployer.deploy(tokenContract, disttoken);
        disttokenContract = await deployedToken.eos.contract(disttoken);

        await getCreateAccount(savings_account, args);

        eos = deployedContract.eos;
        await genAllocateEOSTokens(testuser1);
        await genAllocateEOSTokens(testuser2);
        await genAllocateEOSTokens(testuser3);
        await genAllocateEOSTokens(testuserAlt);

        testcontract = await eos.contract(code);

        try {
          await disttokenContract.create(disttoken, `10000000000.0000 ${distokenSymbol}`, {
            authorization: `${disttoken}@active`,
            broadcast: true,
            sign: true
          });
        } catch (e) {

        }

        console.error('init auction');

        var delayedStartCycles = 1;
        startTime = new Date().getTime() + (delayedStartCycles * cycleTime * 1000);
        const setting = {
          whitelist: code,
          cycles,
          seconds_per_cycle: cycleTime,
          savings_account,
          tokens_account: code,
          start_ts: (startTime) * 1000,
          quota_per_cycle: {
            contract: disttoken,
            amount: perCycle,
            precision: 4,
            symbol: distokenSymbol
          },
          accepted_token: {
            contract: 'eosio.token',
            amount: `0.1000`,
            precision: 4,
            symbol: systemToken
          },
          payout_cycles_per_user: 10,
          payouts_per_payin: 0, // disabled pending modified tests
          payouts_delay_sec: 10
        };
        await testcontract.init({
          setting
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await testcontract.setlimit({
          max_per_cycle: `1500.0000 ${systemToken}`
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await disttokenContract.issue({
          to: code,
          quantity: `${totalTokens} ${distokenSymbol}`,
          memo: 'seed transfer'
        }, {
          authorization: `${disttoken}@active`,
          broadcast: true,
          sign: true
        });

        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  const _selfopts = {
    authorization: [`${code}@active`]
  };

  const claim = async (testuser, foraccount) => {
    console.error(`claiming ${testuser}`);
    // var eos = await getEos(testuser, args);

    var keys = await getCreateKeys(testuser);
    // testcontract = await eos.contract(code);
    foraccount = foraccount || testuser;
    var res = await testcontract.claim({
      payer: foraccount
    }, {
      authorization: `${testuser}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [keys.privateKey]
    });
    if (res.processed.action_traces[0].inline_traces[0]) { return res.processed.action_traces[0].inline_traces[0].act.data.quantity; } else { return null; }
  };

  const buy = async (testuser, quantity, foraccount) => {
    console.error(`buying for ${quantity} - ${testuser}`);
    // var eos = await getEos(testuser, args);
    var keys = await getCreateKeys(testuser);

    // var systemtokenContract = await eos.contract('eosio.token');
    // var testcontract1 = await eos.contract(code);
    var options = {
      authorization: `${testuser}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [keys.privateKey]

    };
    var transaction = await eos.transaction(
      ['eosio.token'],
      (c) => {
        c['eosio_token'].transfer({
          from: testuser,
          to: code,
          quantity: `${quantity} ${systemToken}`,
          memo: foraccount || ''
        }, options);
      },
      options
    );
  };
  const sleepCycle = () => {
    var nextSlot = new Date().getTime() - startTime;
    var sleepTime = (cycleTime * 1000) - (nextSlot % (cycleTime * 1000));

    return delay(sleepTime);
  };
  it('auction didnt start yet', done => {
    (async () => {
      try {
        var failed = false;
        try {
          await buy(testuser1, '1.0000');
        } catch (e) {
          if (e.toString().indexOf('auction did not start yet') != -1) { failed = true; } else { throw e; }
        }
        await sleepCycle();
        assert.equal(failed, true, 'should have failed');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('empty claim', done => {
    (async () => {
      try {
        var failed = false;
        try {
          await claim(testuser3);
        } catch (e) {
          if (e.toString().indexOf('There is nothing to claim for this account') != -1) { failed = true; } else { throw e; }
        }
        assert.equal(failed, true, 'should have failed');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('one cycle auction', done => {
    (async () => {
      try {
        await buy(testuser1, '10.0000');
        await sleepCycle();
        var claim1 = await claim(testuser1);
        assert.equal(claim1, '100.0000 NEW', 'wrong claim amount');
        // user1 should have 100.0000
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('two cycle auction', done => {
    (async () => {
      try {
        await buy(testuser1, '10.0000');
        await sleepCycle();
        await buy(testuser1, '10.0000');
        await sleepCycle();
        var claim1 = await claim(testuser1);
        assert.equal(claim1, '200.0000 NEW', 'wrong claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('one cycle auction - multiple users', done => {
    (async () => {
      try {
        await Promise.all([buy(testuser1, '10.0000'), buy(testuser2, '30.0000')]);

        await sleepCycle();
        var claim1 = await claim(testuser1);
        var claim2 = await claim(testuser2);
        assert.equal(claim1, '25.0000 NEW', 'wrong 1st claim amount');
        assert.equal(claim2, '75.0000 NEW', 'wrong 2nd claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('one cycle auction - multiple users - multiple buys', done => {
    (async () => {
      try {
        await Promise.all([buy(testuser1, '10.0000'), buy(testuser2, '14.0000'), buy(testuser2, '16.0000')]);

        await sleepCycle();
        var claim1 = await claim(testuser1);
        var claim2 = await claim(testuser2);
        assert.equal(claim1, '25.0000 NEW', 'wrong 1st claim amount');
        assert.equal(claim2, '75.0000 NEW', 'wrong 2nd claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('two cycle auction - multiple users', done => {
    (async () => {
      try {
        await Promise.all([buy(testuser1, '10.0000'), buy(testuser2, '30.0000')]);
        await sleepCycle();
        await Promise.all([buy(testuser1, '1.0000'), buy(testuser2, '3.0000')]);
        await sleepCycle();
        var claim1 = await claim(testuser1);
        var claim2 = await claim(testuser2);
        assert.equal(claim1, '50.0000 NEW', 'wrong 1st claim amount');
        assert.equal(claim2, '150.0000 NEW', 'wrong 2nd claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('two cycle auction - multiple users - multiple buys', done => {
    (async () => {
      try {
        await Promise.all([buy(testuser1, '10.0000'), buy(testuser2, '30.0000')]);
        await sleepCycle();
        await Promise.all([buy(testuser1, '1.0000'), buy(testuser2, '1.0000'), buy(testuser2, '2.0000')]);
        await sleepCycle();
        var claim1 = await claim(testuser1);
        var claim2 = await claim(testuser2);
        assert.equal(claim1, '50.0000 NEW', 'wrong 1st claim amount');
        assert.equal(claim2, '150.0000 NEW', 'wrong 2nd claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('below minimum', done => {
    (async () => {
      try {
        var failed = false;
        try {
          await buy(testuser1, '0.0001');
        } catch (e) {
          if (e.toString().indexOf('below minimum amount') != -1) { failed = true; } else { throw e; }
        }
        assert.equal(failed, true, 'should have failed');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('claim for today', done => {
    (async () => {
      try {
        await buy(testuser1, '1.0000');
        var failed = false;
        try {
          await claim(testuser1);
        } catch (e) {
          if (e.toString().indexOf('There is nothing to claim for this account') != -1) { failed = true; } else { throw e; }
        }
        assert.equal(failed, true, 'should have failed');
        await sleepCycle();
        var claim2 = await claim(testuser1);
        assert.equal(claim2, '100.0000 NEW', 'wrong claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('claim for today - with same day buy', done => {
    (async () => {
      try {
        await buy(testuser1, '1.0000');
        await sleepCycle();
        await buy(testuser1, '3.0000');
        var claim1 = await claim(testuser1);
        await sleepCycle();
        var claim2 = await claim(testuser1);
        assert.equal(claim1, '100.0000 NEW', 'wrong 1st claim amount');
        assert.equal(claim2, '100.0000 NEW', 'wrong 2nd claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('3rd party buy - with support', done => {
    (async () => {
      try {
        await buy(testuserAlt, '1.0000', testuser2);
        await sleepCycle();
        var claim1 = await claim(testuser2);
        assert.equal(claim1, '100.0000 NEW', 'wrong claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('3rd party buy - without support', done => {
    (async () => {
      try {
        await buy(testuser1, '1.0000', testuser2);
        await sleepCycle();
        var claim1 = await claim(testuser1);
        assert.equal(claim1, '100.0000 NEW', 'wrong claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('3rd party claim', done => {
    (async () => {
      try {
        await buy(testuser1, '1.0000');
        await sleepCycle();
        var claim1 = await claim(testuser2, testuser1);
        assert.equal(claim1, '100.0000 NEW', 'wrong claim amount');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('Over the limit', done => {
    (async () => {
      try {
        var failed = false;
        await buy(testuser1, '1499.1000');
        try {
          await buy(testuser1, '1.0000');
        } catch (e) {
          if (e.toString().indexOf('account passed the cycle limit') != -1) { failed = true; } else { throw e; }
        }
        assert.equal(failed, true, 'should have failed');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('whitelist', done => {
    (async () => {
      try {
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  it('whitelist 3rd party', done => {
    (async () => {
      try {
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('auction ended', done => {
    (async () => {
      try {
        var endTime = startTime + ((cycles + 1) * cycleTime) * 1000;
        var waitTime = endTime - new Date().getTime();
        if (waitTime > 0) {
          await delay(waitTime);
        }
        var failed = false;
        try {
          await buy(testuser1, '1.0000');
        } catch (e) {
          if (e.toString().indexOf('auction ended') != -1) { failed = true; } else { throw e; }
        }
        assert.equal(failed, true, 'should have failed');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
});
