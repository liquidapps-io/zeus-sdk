

require('mocha');
const { assert } = require('chai'); // Using Assert style
const { getTestContract } = require('../extensions/tools/eos/utils');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'oracleconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`History Oracle Service Test`, () => {
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
  it('Oracle History Get', done => {
    (async () => {
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


});
