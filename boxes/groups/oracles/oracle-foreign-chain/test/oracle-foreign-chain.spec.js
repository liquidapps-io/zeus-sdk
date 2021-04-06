
const { requireBox } = require('@liquidapps/box-utils');
require('mocha');
const { assert } = require('chai'); // Using Assert style
const { getTestContract } = requireBox('seed-eos/tools/eos/utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');

var contractCode = 'oracleconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`foreign_chain Oracle Service Test`, () => {
  var testcontract;
  const code = 'test1';
  before(done => {
    (async () => {
      try {

        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");

        testcontract = await getTestContract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it.skip('Chain Oracle XIBC - ethereum', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`foreign_chain://ethereum/history/0x100/result.transactionsRoot`, 'utf8'),
          expectedfield: Buffer.from("0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"),
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
  it('Chain Oracle XIBC - tron', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`foreign_chain://tron/block/8422634/block_header.raw_data.txTrieRoot`, 'utf8'),
          expectedfield: Buffer.from("2d3c52e215f1f4c969fc29ebd69bbc8ecce05a3a3d47965fb0cc08c069bf3abd"),
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
  it.skip('Chain Oracle XIBC - cardano', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`foreign_chain://cardano/history/64d0562619b3999920876a99f3f80385e1aed5c78d3a46d2affcd17db01dd361/Right.0.ctbOutputSum.getCoin`, 'utf8'),
          expectedfield: Buffer.from("5968213070"),
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
  it('Chain Oracle XIBC - ripple', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`foreign_chain://ripple/balance/rGwUWgN5BEg3QGNY3RX2HfYowjUTZdid3E/0.currency`, 'utf8'),
          expectedfield: Buffer.from("XRP"),
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
  it('Chain Oracle XIBC - bitcoin', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`foreign_chain://bitcoin/block/100/dummy`, 'utf8'),
          expectedfield: Buffer.from("test-dummy"),
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
  it('Chain Oracle XIBC - litecoin', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`foreign_chain://litecoin/block/100/dummy`, 'utf8'),
          expectedfield: Buffer.from("test-dummy"),
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
  it('Chain Oracle XIBC - bitcoin cash', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`foreign_chain://bitcoin_cash/block/100/dummy`, 'utf8'),
          expectedfield: Buffer.from("test-dummy"),
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


});
