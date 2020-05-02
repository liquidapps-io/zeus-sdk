require('mocha');


const { assert } = require('chai'); // Using Assert style
const { requireBox } = require('@liquidapps/box-utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');

var contractCode = 'logconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Log Service Test Contract`, () => {
  var testcontract;
  const code = 'test2';
  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, 'log');
        // create token
        const { getTestContract } = requireBox('seed-eos/tools/eos/utils');
        testcontract = await getTestContract(code);

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it('Log event', done => {
    (async () => {
      try {
        var res = await testcontract.test({
          num: 123
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        var eventResp = JSON.parse(res.processed.action_traces[0].console);
        assert.equal(eventResp.etype, 'service_request', 'wrong etype');
        assert.equal(eventResp.provider, '', 'wrong provider');
        assert.equal(eventResp.action, 'logevent', 'wrong action');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
