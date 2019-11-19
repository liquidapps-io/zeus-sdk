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
describe(`Web Oracle Service Test`, () => {
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



});
