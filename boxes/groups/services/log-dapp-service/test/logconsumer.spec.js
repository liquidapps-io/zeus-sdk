import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork } = require('../extensions/tools/eos/utils');
const { getEosWrapper } = require('../extensions/tools/eos/eos-wrapper');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'logconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Log Service Test Contract`, () => {
  var testcontract;
  const code = 'test2';
  before(done => {
    (async() => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, 'log');
        // create token
        const { getTestContract } = require('../extensions/tools/eos/utils');
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
    (async() => {
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
