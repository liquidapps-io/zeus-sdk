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
describe(`Sister Chain Oracle Service Test`, () => {
  var testcontract;
  const code = 'test1';
  before(done => {
    (async() => {
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
  it.skip('Oracle IBC Block Fetch - kylin', done => {
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



});
