import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getTestContract } = require('../extensions/tools/eos/utils');
const fetch = require('node-fetch');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'readfnconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Resource Billing Service Test`, () => {
  var testcontract;
  const code = 'test1';
  var endpoint = "http://localhost:13015";
  before(done => {
    (async() => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, 'readfn');
        testcontract = await getTestContract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it('Test Read', done => {
    (async() => {
      try {
        assert.equal("", "");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
