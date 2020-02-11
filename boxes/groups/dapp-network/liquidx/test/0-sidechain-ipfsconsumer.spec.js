require('mocha');


const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork, getCreateAccount } = require('../extensions/tools/eos/utils');
const { getEosWrapper } = require('../extensions/tools/eos/eos-wrapper');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const { loadModels } = require('../extensions/tools/models');
var sha256 = require('js-sha256').sha256;

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData, createLiquidXMapping } = require('../extensions/tools/eos/dapp-services');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);

var contractCode = 'ipfsxtest';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`LiquidX Sidechain IPFS Service Test Contract`, () => {
  var testcontract, testcontract2;
  const mainnet_code = 'testc5';
  const sister_code = 'testc5x';
  const mainnet_code2 = 'testc51';
  const sister_code2 = 'testc5x1';
  var eosvram, eos;
  var sidechainName = 'test1';
  var sidechain;
  before(done => {
    (async () => {
      try {
        var sidechains = await loadModels('eosio-chains');
        sidechain = sidechains.find(a => a.name === sidechainName);

        //create first
        await getCreateAccount(sister_code, null, false, sidechain);
        await getCreateAccount(mainnet_code, null, false);
        var deployedContract = await deployer.deploy(ctrt, sister_code, null, sidechain);
        await genAllocateDAPPTokens({ address: mainnet_code }, 'ipfs', '', 'default');
        await createLiquidXMapping(sidechain.name, mainnet_code, sister_code);

        //create second
        await getCreateAccount(sister_code2, null, false, sidechain);
        await getCreateAccount(mainnet_code2, null, false);
        var deployedContract2 = await deployer.deploy(ctrt, sister_code2, null, sidechain);
        await genAllocateDAPPTokens({ address: mainnet_code2 }, 'ipfs', '', 'default');
        await createLiquidXMapping(sidechain.name, mainnet_code2, sister_code2);
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
        eosvram = deployedContract.eos;
        config.httpEndpoint = `http://localhost:${sidechain.dsp_port}`;
        eosvram = getEosWrapper(config);
        testcontract = await eosvram.contract(account);
        let dappservicexInstance = await eosvram.contract(dappservicex);
        try {
          await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider1' }, {
            authorization: `${sister_code}@active`,
          });
          await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider2' }, {
            authorization: `${sister_code}@active`,
          });
        }
        catch (e) {}

        if (account2) {
          keys = await getCreateKeys(account2, getDefaultArgs(), false, sidechain);
          config.keyProvider = keys.active.privateKey;
        }
        eosvram = getEosWrapper(config);
        testcontract2 = await eosvram.contract(account2);

        dappservicexInstance = await eosvram.contract(dappservicex);
        try {
          await dappservicexInstance.adddsp({ owner: sister_code2, dsp: 'xprovider1' }, {
            authorization: `${sister_code2}@active`,
          });
          await dappservicexInstance.adddsp({ owner: sister_code2, dsp: 'xprovider2' }, {
            authorization: `${sister_code2}@active`,
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
  const multihash = require('multihashes');

  const converToUri = (hash) => {
    const bytes = Buffer.from(hash, 'hex');
    const address = multihash.toB58String(bytes);
    return 'ipfs://z' + address;
  };
  const hashData256 = (data) => {
    var hash = sha256.create();
    hash.update(data);
    return hash.hex();
  };
  var account = sister_code;
  var account2 = sister_code2;
  let uri = "ipfs://zb2rhnyodRMHNeY4iaSVXzVhtFmYdWxsvddrhzhWZFUMiZdrd";
  it('sidechain - IPFS Write', done => {
    (async () => {
      try {
        var res = await testcontract.testset({
          data: {
            field1: 123,
            field2: new Buffer('hello-world').toString('hex'),
            field3: 312
          }
        }, {
          authorization: `${sister_code}@active`,
        });
        // var bufData = Buffer.from(JSON.parse(res.processed.action_traces[0].console).data, 'base64');
        // const hash = hashData256(bufData);
        // uri = converToUri("01551220" + hash);

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('sidechain - cleanup1', done => {
    (async () => {
      try {
        await delaySec(10);
        await testcontract.verfempty({
        }, {
          authorization: `${sister_code}@active`,
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('sidechain - IPFS Read', done => {
    (async () => {
      try {
        await delaySec(10);

        await testcontract.testget({
          uri,
          expectedfield: 123
        }, {
          authorization: `${sister_code}@active`,
        });

        // var eventResp = JSON.parse(res.processed.action_traces[0].console);
        // assert.equal(eventResp.etype, "service_request", "wrong etype");
        // assert.equal(eventResp.provider,"", "wrong provider");
        // assert.equal(eventResp.action, "cleanup", "wrong action");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('sidechain - cleanup2', done => {
    (async () => {
      try {
        await delaySec(10);
        await testcontract.verfempty({
        }, {
          authorization: `${sister_code}@active`,
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('sidechain - third party read', done => {
    (async() => {
      try {
        await delaySec(10);

        await testcontract.testindexa({
          id: 67890
        }, {
          authorization: `${sister_code}@active`,
        });

        await testcontract2.testindexa({
          id: 77777
        }, {
          authorization: `${sister_code2}@active`,
        });

        await delaySec(10);

        await testcontract2.testremote({
          remote: sister_code,
          id: 67890
        }, {
          authorization: `${sister_code2}@active`,
        });

        await testcontract.testremote({
          remote: sister_code2,
          id: 77777
        }, {
          authorization: `${sister_code}@active`,
        });

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
