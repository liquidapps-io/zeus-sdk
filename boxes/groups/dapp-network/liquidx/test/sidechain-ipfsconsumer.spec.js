require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getCreateAccount, getEos } = requireBox('seed-eos/tools/eos/utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { loadModels } = requireBox('seed-models/tools/models');
const { getTableRowsSec } = requireBox('dapp-services/services/dapp-services-node/common');
const { dappServicesContract, genAllocateDAPPTokens, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');
var sha256 = require('js-sha256').sha256;

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { eosio } = requireBox('test-extensions/lib/index');
const delaySec = sec => eosio.delay(sec * 1000);

var contractCode = 'ipfsxtest';
var ctrt = artifacts.require(`./${contractCode}/`);
var contractCodeMain = 'ipfsconsumer';
var ctrtMain = artifacts.require(`./${contractCodeMain}/`);
describe(`LiquidX Sidechain IPFS Service Test Contract`, () => {
  var testcontract, testcontract2, testcontractMain;
  const mainnet_code = 'testc5';
  const sister_code = 'testc5x';
  const mainnet_code2 = 'testc51';
  const sister_code2 = 'testc5x1';
  var eosvram, eos;
  var sidechainName = 'test1';
  var sidechain;

  const invokeService = async (code, testcontract) => {
    try {
      var res = await testcontract.testempty({
        uri: 'ipfs://zb2rhmy65F3REf8SZp7De11gxtECBGgUKaLdiDj7MCGCHxbDW',
      }, {
        authorization: `${code}@active`
      });
    } catch (e) {
      console.log(JSON.stringify(e));
    }

  };

  before(done => {
    (async () => {
      try {
        eos = await getEos();
        var sidechains = await loadModels('eosio-chains');
        sidechain = sidechains.find(a => a.name === sidechainName);

        //create first
        await getCreateAccount(sister_code, null, false, sidechain);
        await getCreateAccount(mainnet_code, null, false);
        await deployer.deploy(ctrt, sister_code, null, sidechain);
        await deployer.deploy(ctrtMain, mainnet_code);
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

        var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId,
          httpEndpoint: `http://localhost:${sidechain.dsp_port}`
        };

        let provkey = await getCreateKeys("xprovider1", getDefaultArgs(), false, sidechain);
        let proveos = getEosWrapper({ ...config, keyProvider: provkey.active.privateKey });
        let dappx = await proveos.contract(dappservicex);
        await dappx.pricepkg({ provider: 'xprovider1', package_id: "default", action: "warmup", cost: 5 }, {
          authorization: `xprovider1@active`
        });
        await dappx.pricepkg({ provider: 'xprovider1', package_id: "default", action: "commit", cost: 5 }, {
          authorization: `xprovider1@active`
        });

        if (account) {
          var keys = await getCreateKeys(account, getDefaultArgs(), false, sidechain);
          config.keyProvider = keys.active.privateKey;
        }
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
        catch (e) { }

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
        catch (e) { }

        var mainnetNetwork = getNetwork(getDefaultArgs());
        var mainnetConfig = {
          expireInSeconds: 120,
          sign: true,
          chainId: mainnetNetwork.chainId,
          httpEndpoint: 'http://localhost:13015'
        };
        var mainnetKeys = await getCreateKeys(mainnet_code, getDefaultArgs());
        mainnetConfig.keyProvider = mainnetKeys.active.privateKey;
        var eosMainnet = getEosWrapper(mainnetConfig);
        testcontractMain = await eosMainnet.contract(mainnet_code);

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
  it('Custom action quota pricing', done => {
    (async () => {
      try {
        // await setcost("ipfs","pprovider1",selectedPackage,"warmup",5);
        // await setcost("ipfs","pprovider1",selectedPackage,"commit",5);

        //FIRST
        await invokeService(sister_code, testcontract);
        let table = await getTableRowsSec(eos.rpc, dappServicesContract, "accountext", "DAPP", [null, mainnet_code, "ipfsservice1", "pprovider1"], 1, 'sha256', 2);
        let first = Number(table[0].quota.replace(" QUOTA", ""));

        //SECOND
        await invokeService(sister_code, testcontract);
        table = await getTableRowsSec(eos.rpc, dappServicesContract, "accountext", "DAPP", [null, mainnet_code, "ipfsservice1", "pprovider1"], 1, 'sha256', 2);
        let second = Number(table[0].quota.replace(" QUOTA", ""));
        assert(second <= (first - 0.0005), "quota must decrease by 5");

        //THIRD
        await invokeService(sister_code, testcontract);
        table = await getTableRowsSec(eos.rpc, dappServicesContract, "accountext", "DAPP", [null, mainnet_code, "ipfsservice1", "pprovider1"], 1, 'sha256', 2);
        let third = Number(table[0].quota.replace(" QUOTA", ""));
        assert(third <= (second - 0.0005), "quota must decrease by 5");

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

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

  it('sidechain - read from other chain', done => {
    (async () => {
      try {
        await testcontract.testindexa({
          id: 99999
        }, {
          authorization: `${sister_code}@active`,
        });
        await testcontractMain.testindexa({
          id: 33333
        }, {
          authorization: `${mainnet_code}@active`,
        });
        await testcontractMain.testchain({
          remote: sister_code,
          id: 99999,
          chain: "test1"
        }, {
          authorization: `${mainnet_code}@active`,
        });
        await testcontract.testchain({
          remote: mainnet_code,
          id: 33333,
          chain: "mainnet"
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
    (async () => {
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
