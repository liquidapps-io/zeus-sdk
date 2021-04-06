require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getCreateAccount } = requireBox('seed-eos/tools/eos/utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { loadModels } = requireBox('seed-models/tools/models');
var sha256 = require('js-sha256').sha256;

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');
const { awaitTable, getTable, delay } = requireBox('seed-tests/lib/index');
const delaySec = sec => delay(sec * 1000);

var contractCode = 'orcxtest';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`LiquidX Sidechain Oracle Service Test Contract`, () => {
  var testcontract;
  const mainnet_code = 'testorc1';
  const sister_code = 'testorc1x';
  var eosconsumer;
  var sidechainName = 'test1';
  var sidechain;
  before(done => {
    (async () => {
      try {
        var sidechains = await loadModels('eosio-chains');
        sidechain = sidechains.find(a => a.name === sidechainName);
        await getCreateAccount(sister_code, null, false, sidechain);
        await getCreateAccount(mainnet_code, null, false);
        var deployedContract = await deployer.deploy(ctrt, sister_code, null, sidechain);
        await genAllocateDAPPTokens({ address: mainnet_code }, 'oracle', '', 'default');
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
        if (account) {
          var keys = await getCreateKeys(account, getDefaultArgs(), false, sidechain);
          config.keyProvider = keys.active.privateKey;
        }
        eosconsumer = deployedContract.eos;
        config.httpEndpoint = `http://localhost:${sidechain.dsp_port}`;
        eosconsumer = getEosWrapper(config);

        testcontract = await eosconsumer.contract(account);
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
      }
      catch (e) {
        done(e);
      }
    })();
  });
  var account = sister_code;
  it('sidechain - Random Number', done => {
    (async () => {
      try {
        var id = 100;
        var res = await testcontract.testrnd({
          uri: Buffer.from(`random://1024/${id}`, 'utf8'),
        }, {
          authorization: `${sister_code}@active`,
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
