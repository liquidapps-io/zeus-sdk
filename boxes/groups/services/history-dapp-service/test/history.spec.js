require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const fetch = require('node-fetch');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');

function postData(url = ``, data = {}) {
  // Default options are marked with *
  return fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, cors, *same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      // "Content-Type": "application/json",
      // "Content-Type": "application/x-www-form-urlencoded",
    },
    redirect: 'follow', // manual, *follow, error
    referrer: 'no-referrer', // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  })
    .then(response => response.json()); // parses response to JSON
}
var contractCode = 'readfnconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`History Service Test Contract`, () => {
  var testcontract;
  const code = 'test1';
  var endpoint = "http://localhost:13015";

  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, 'readfn');

        const { getTestContract } = requireBox('seed-eos/tools/eos/utils');
        testcontract = await getTestContract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  const invokeReadFn = ({
    method,
    payload
  }) => {
    return postData(`${endpoint}/v1/dsp/readfndspsvc/read`, {
      contract_code: code,
      method,
      payload
    });
  };
  var account = code;
  it('Test Read', done => {
    (async () => {
      try {
        var res = await invokeReadFn({ method: "readtest", payload: { testnum: 123 } });
        assert.equal(res.result, "hello-123");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
