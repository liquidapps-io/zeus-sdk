import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork, getCreateAccount } = require('../extensions/tools/eos/utils');
const { getEosWrapper } = require('../extensions/tools/eos/eos-wrapper');
const { loadModels } = require('../extensions/tools/models');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const fetch = require('node-fetch');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, createLiquidXMapping } = require('../extensions/tools/eos/dapp-services');

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
var contractCode = 'readfnxtest';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`LiquidX Sidechain READFN Service Test Contract`, () => {
  var endpoint = "http://localhost:13015";
  const mainnet_code = 'testfn1';
  const sister_code = 'testfn1x';
  var eosconsumer;
  var sidechainName = 'test1';
  var sidechain;

  before(done => {
    (async() => {
      try {
        var sidechains = await loadModels('local-sidechains');
        sidechain = sidechains.find(a => a.name === sidechainName);
        await getCreateAccount(sister_code, null, false, sidechain);
        await getCreateAccount(mainnet_code, null, false);
        var deployedContract = await deployer.deploy(ctrt, sister_code, null, sidechain);
        await genAllocateDAPPTokens({ address: mainnet_code }, 'readfn', '', 'default');
        await createLiquidXMapping(sidechain.name, mainnet_code, sister_code);
        // allowdsps
        const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
        if (!mapEntry)
          throw new Error('mapping not found')
        const dappservicex = mapEntry.chain_account;

        // create token
        var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        if (sister_code) {
          var keys = await getCreateKeys(sister_code, getDefaultArgs(), false, sidechain);
          config.keyProvider = keys.active.privateKey;
        }
        eosconsumer = deployedContract.eos;
        config.httpEndpoint = `http://localhost:${sidechain.dsp_port}`;
        eosconsumer = getEosWrapper(config);
        const dappservicexInstance = await eosconsumer.contract(dappservicex);
        try {
          await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider1' }, {
            authorization: `${sister_code}@active`,
          });
          await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider2' }, {
            authorization: `${sister_code}@active`,
          });
        }
        catch (e) {}
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
      contract_code: sister_code,
      method,
      payload,
      sidechain: sidechainName
    });
  };
  it('Sidechain - Test Read', done => {
    (async() => {
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
