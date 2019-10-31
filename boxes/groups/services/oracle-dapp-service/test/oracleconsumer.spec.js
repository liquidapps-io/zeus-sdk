require("babel-core/register");
require("babel-polyfill");
import 'mocha';
const { assert } = require('chai'); // Using Assert style
const { getTestContract } = require('../extensions/tools/eos/utils');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'oracleconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Oracle Service Test Contract`, () => {
  var testcontract;
  const code = 'test1';
  before(done => {
    (async() => {
      try {

        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, "oracle","pprovider1","default");
        await genAllocateDAPPTokens(deployedContract, "oracle","pprovider2","foobar");
        
        testcontract = await getTestContract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it.skip('Oracle HTTPS Get', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from("https://ipfs.io/ipfs/Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a", 'utf8'),
          expectedfield: Buffer.from("Hello from IPFS Gateway Checker\n"),
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


  it.skip('Oracle HTTPS+JSON Get', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from("https+json://name/api.github.com/users/tmuskal", 'utf8'),
          expectedfield: Buffer.from("Tal Muskal"),
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

  it('Oracle HTTPS+POST+JSON', done => {
    (async() => {
      try {
        const body = Buffer.from('{"block_num_or_id":"36568000"}').toString('base64')
        const res = await testcontract.testget({
          uri: Buffer.from(`https+post+json://timestamp/${body}/nodes.get-scatter.com:443/v1/chain/get_block`, 'utf8'),
          expectedfield: Buffer.from('2019-01-09T18:20:23.000', 'utf8'),
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

  it('Oracle History Get', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`self_history://${code}/0/0/0/action_trace.act.data.account`, 'utf8'),
          expectedfield: Buffer.from(code, 'utf8'),
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

  it('Oracle IBC Block Fetch', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`sister_chain_block://mainnet/20000000/transaction_mroot`, 'utf8'),
          expectedfield: Buffer.from("2f997bac6ccce20a95d9927ae416ccfc8e183f82d7aa56ef4134610439ea4164"),
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
  it.skip('Oracle IBC Block Fetch - telos', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`sister_chain_block://telos/20000000/transaction_mroot`, 'utf8'),
          expectedfield: Buffer.from("0000000000000000000000000000000000000000000000000000000000000000"),
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
  it.skip('Oracle IBC Block Fetch - worbli', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`sister_chain_block://worbli/10000000/transaction_mroot`, 'utf8'),
          expectedfield: Buffer.from("0000000000000000000000000000000000000000000000000000000000000000"),
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
  it.skip('Oracle IBC Block Fetch - meetone', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`sister_chain_block://meetone/3521778/transaction_mroot`, 'utf8'),
          expectedfield: Buffer.from("0000000000000000000000000000000000000000000000000000000000000000"),
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
  it.skip('Oracle IBC Block Fetch - bos', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`sister_chain_block://bos/10000000/transaction_mroot`, 'utf8'),
          expectedfield: Buffer.from("0000000000000000000000000000000000000000000000000000000000000000"),
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
  it('Oracle IBC Block Fetch - kylin', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`sister_chain_block://kylin/43521778/transaction_mroot`, 'utf8'),
          expectedfield: Buffer.from("cf5c1e57792a85c421903173e8c08f6b1b8be426e33b08b8fbb5722410f2172f"),
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
  it('Chain Oracle XIBC - ethereum', done => {
    (async() => {
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
  it.skip('Chain Oracle XIBC - tron', done => {
    (async() => {
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
  it('Chain Oracle XIBC - cardano', done => {
    (async() => {
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
    (async() => {
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
    (async() => {
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
    (async() => {
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
    (async() => {
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
  it('Facts - What is the average air speed velocity of a laden swallow?', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from(`wolfram_alpha://What is the average air speed velocity of a laden swallow?`, 'utf8'),
          expectedfield: Buffer.from("What do you mean, an African or European Swallow?"),
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



  it('Random Number', done => {
    (async() => {
      try {
        var id = 100;
        var res = await testcontract.testrnd({
          uri: Buffer.from(`random://1024/${id}`, 'utf8'),
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
