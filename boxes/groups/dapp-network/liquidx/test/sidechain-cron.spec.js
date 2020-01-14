import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork, getCreateAccount } = require('../extensions/tools/eos/utils');
const { getEosWrapper } = require('../extensions/tools/eos/eos-wrapper');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const { loadModels } = require('../extensions/tools/models');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, createLiquidXMapping } = require('../extensions/tools/eos/dapp-services');
const delay = ms => new Promise(res => setTimeout(res, ms));

var contractCode = 'cronxtest';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`LiquidX Sidechain Cron Service Test Contract`, () => {
  var testcontract;
  const mainnet_code = 'testcron1';
  const sister_code = 'testcron1x';
  var eosconsumer;
  var sidechainName = 'test1';
  var sidechain;
  before(done => {
    (async () => {
      try {        
        var sidechains = await loadModels('local-sidechains');
        sidechain = sidechains.find(a => a.name === sidechainName);
        await getCreateAccount(sister_code, null, false, sidechain);
        await getCreateAccount(mainnet_code, null, false);
        var deployedContract = await deployer.deploy(ctrt, sister_code, null, sidechain);
        await genAllocateDAPPTokens({ address: mainnet_code }, 'cron', '', 'default');
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

        testcontract = await eosconsumer.contract(sister_code);
        const dappservicexInstance = await eosconsumer.contract(dappservicex);
        try {
          await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider1' }, {
            authorization: `${sister_code}@active`,
          });
          await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider2' }, {
            authorization: `${sister_code}@active`,
          });
        }
        catch (e) {

        }

        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  var code = sister_code;
  it('Cron test - every 2 seconds', done => {
    (async() => {
      try {
        var res = await testcontract.testschedule({}, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        console.log(JSON.stringify(res));
        await delay(15000);
        res = await eosconsumer.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        var first = res.rows[0].counter;
        await delay(4500);
        res = await eosconsumer.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        var second = res.rows[0].counter;
        assert.ok(second > first, 'counter did not increase');
        await delay(4500);
        res = await eosconsumer.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'stat',
          'limit': 100
        });
        assert.ok(res.rows[0].counter > second, 'counter did not increase');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
