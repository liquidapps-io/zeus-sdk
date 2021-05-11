require("mocha");
const { assert } = require("chai"); // Using Assert style
const fetch = require("node-fetch");
const fs = require("fs");
const { requireBox } = require('@liquidapps/box-utils');
const {
  getCreateKeys,
  getNetwork,
  getCreateAccount,
  // getTestContract
} = requireBox('seed-eos/tools/eos/utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { createClient } = requireBox("client-lib-base/client/dist/src/dapp-client-lib");
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { loadModels } = requireBox('seed-models/tools/models');
const {
  genAllocateDAPPTokens,
  createLiquidXMapping
} = requireBox('dapp-services/tools/eos/dapp-services');
const ecc = require("eosjs-ecc");
const { JsonRpc } = require("eosjs");
const { getIpfsFileAsBuffer } = requireBox("storage-dapp-service/services/storage-dapp-service-node/common.js")

//dappclient requirement
global.fetch = fetch;
var endpoint;
// setup contracts to be used
const contractCode = "storagextest";
// authenticator contract only deployed once as a service contract to `authentikeos` account name
// must be account name `authentikeos`
const authContractCode = "authenticator";

// include contract code
var ctrtStorage = artifacts.require(`./${contractCode}/`);
var ctrtAuth = artifacts.require(`./${authContractCode}/`);

const vAccount1 = `vaccount1`;
const vAccount2 = `vaccount2`;

describe(`LiquidX Sidechain storagextest Service Test Contract`, () => {
  let privateKeyWif;
  let dappClient;
  let testcontract;
  // mainnet account is used to stake to package
  const mainnet_code = 'teststor1';
  // sister account uses services
  const sister_code = 'teststor1x';
  var eosconsumer;
  // name of sidechain
  var sidechainName = 'test1';
  var sidechain;
  const regVAccount = async name => {
    const vaccountClient = await dappClient.service("vaccounts", sister_code);
    return vaccountClient.push_liquid_account_transaction(
      code,
      privateKeyWif,
      "regaccount",
      {
        vaccount: name
      }
    );
  }
  before(done => {
    (async () => {
      try {
        // seach eosio-chains directory for sidechain objects
        var sidechains = await loadModels('eosio-chains');
        // find sidechain that matches sidechainName
        sidechain = sidechains.find(a => a.name === sidechainName);
        // create mainet and sister accounts
        await getCreateAccount(sister_code, null, false, sidechain);
        await getCreateAccount(mainnet_code, null, false);
        // deploy storagextest consumer contract
        var deployedContract = await deployer.deploy(ctrtStorage, sister_code, null, sidechain);
        // deploy authentikeos contract, must be deployed for auth services
        await deployer.deploy(ctrtAuth, "authentikeos", null, sidechain);
        // issue DAPP tokens to mainnet account for storage contract
        await genAllocateDAPPTokens({ address: mainnet_code }, 'storage', '', 'default');
        await genAllocateDAPPTokens({ address: mainnet_code }, 'vaccounts', '', 'default');
        await genAllocateDAPPTokens({ address: mainnet_code }, 'ipfs', '', 'default');
        // testcontract = await getTestContract(sister_code);
        // create LiquidX mapping from main chan to LiquidX chain
        await createLiquidXMapping(sidechain.name, mainnet_code, sister_code);
        const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
        if (!mapEntry)
          throw new Error('mapping not found')
        // set account name that dappservicex is deployed on
        const dappservicex = mapEntry.chain_account;
        // get sidechain network
        var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        // create keypair for sisiter chain consumer contract
        if (sister_code) {
          var keys = await getCreateKeys(sister_code, getDefaultArgs(), false, sidechain);
          config.keyProvider = keys.active.privateKey;
        }
        eosconsumer = deployedContract.eos;
        config.httpEndpoint = `http://localhost:${sidechain.dsp_port}`;
        endpoint = config.httpEndpoint;
        const rpc = new JsonRpc(endpoint, { fetch });
        eosconsumer = getEosWrapper(config);
        const dappservicexInstance = await eosconsumer.contract(dappservicex);
        // enable consumer contract to use services from xprovider1 / xprovider2 on sister chain
        await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider1' }, {
          authorization: `${sister_code}@active`,
        });
        await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider2' }, {
          authorization: `${sister_code}@active`,
        });
        dappClient = await createClient({
          httpEndpoint: endpoint,
          fetch,
        });
        const info = await rpc.get_info();
        const chainId = info.chain_id;
        testcontract = await eosconsumer.contract(sister_code);
        try {
          await testcontract.xvinit(
            {
              chainid: chainId
            },
            {
              authorization: `${code}@active`
            }
          );
        } catch (_err) {
          // ignore chain id has already been set
          console.warn(_err.message);
        }
        privateKeyWif = await ecc.PrivateKey.fromSeed(vAccount1);
        privateKeyWif = privateKeyWif.toWif();
        try {
          await regVAccount(vAccount1);
          await regVAccount(vAccount2);
        } catch (_err) {
          // ignore vaccount already exists error
          if (!/already exists/ig.test(_err.message)) {
            throw _err;
          }
        }
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  var code = sister_code;

  it('Upload File and read', done => {
    (async () => {
      try {
        const storageClient = await dappClient.service("storage", code);
        const keys = await getCreateKeys(code, getDefaultArgs(), false, sidechain);
        const key = keys.active.privateKey;
        const data = Buffer.from("test1234read", "utf8");
        const permission = "active";
        const result = await storageClient.upload_public_file(
          data,
          key,
          permission
        );
        let res;
        try {
          res = await fetch(`${endpoint}/v1/dsp/liquidstorag/get_uri`, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ uri: result.uri })
          });
        } catch (e) {
          throw (e.json.error);
        }
        const resJson = await res.json();
        assert.equal(
          Buffer.from(resJson.data, 'base64').toString(),
          'test1234read'
        );
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  })

  it('Upload File (authenticated)', done => {
    (async () => {
      try {
        const storageClient = await dappClient.service("storage", code);
        const keys = await getCreateKeys(code, getDefaultArgs(), false, sidechain);
        const key = keys.active.privateKey;
        const data = Buffer.from("test1234", "utf8");
        const permission = "active";
        const result = await storageClient.upload_public_file(
          data,
          key,
          permission
        );
        assert.equal(
          result.uri,
          "ipfs://zb2rhga33kcyDrMLZDacqR7wLwcBRVgo6sSvLbzE7XSw1fswH"
        );
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });

  it('Upload File and read', done => {
    (async () => {
      try {
        const dappClient = await createClient({
          httpEndpoint: endpoint,
          fetch
        });
        const storageClient = await dappClient.service("storage", code);
        const keys = await getCreateKeys(code, getDefaultArgs(), false, sidechain);
        const key = keys.active.privateKey;
        const data = Buffer.from("test1234read", "utf8");
        const permission = "active";
        const result = await storageClient.upload_public_file(
          data,
          key,
          permission
        );
        const res = await fetch('http://localhost:13015/v1/dsp/liquidstorag/get_uri', {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ uri: result.uri })
        });
        const resJson = await res.json();
        assert.equal(
          Buffer.from(resJson.data, 'base64').toString(),
          'test1234read'
        );
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  })

  it('Upload Archive', done => {
    (async () => {
      try {
        const dappClient = await createClient({
          httpEndpoint: endpoint,
          fetch
        });
        const storageClient = await dappClient.service("storage", code);
        const keys = await getCreateKeys(code, getDefaultArgs(), false, sidechain);
        const key = keys.active.privateKey;
        const permission = "active";
        const path = "test/utils/YourTarBall.tar";
        const content = fs.readFileSync(path);
        const result = await storageClient.upload_public_archive(
          content,
          key,
          permission
        );
        assert.equal(
          result.uri,
          "ipfs://QmYS55iqu1zwxszW5ywEmT5w6m6VKjYwa9G9Xka8Uv4j9s"
        );

        // const fileContent = await getIpfsFileAsBuffer(`QmYS55iqu1zwxszW5ywEmT5w6m6VKjYwa9G9Xka8Uv4j9s/my-stream-test.txt`)
        // assert.equal(
        //   fileContent.toString(`utf8`),
        //   "hello world"
        // );
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });

  it("Upload Files as vaccount user", done => {
    (async () => {
      try {
        const dappClient = await createClient({
          httpEndpoint: endpoint,
          fetch
        });
        const storageClient = await dappClient.service("storage", code);
        const data = Buffer.from("test1234", `utf8`);

        let result = await testcontract.setstoragecfg(
          {
            max_file_size_in_bytes: data.byteLength + 1,
            global_upload_limit_per_day: data.byteLength * 2,
            vaccount_upload_limit_per_day: data.byteLength,
          },
          {
            authorization: `${code}@active`
          }
        );

        result = await storageClient.upload_public_file_from_vaccount(data, {
          name: vAccount1,
          key: privateKeyWif
        });
        assert.equal(
          result.uri,
          "ipfs://zb2rhga33kcyDrMLZDacqR7wLwcBRVgo6sSvLbzE7XSw1fswH"
        );

        const hugeData = Buffer.concat([data, data]);
        try {
          await storageClient.upload_public_file_from_vaccount(hugeData, {
            name: vAccount1,
            key: privateKeyWif
          });
          return done(new Error(`should fail because file size > max file size`))
        } catch (error) {
          assert.match(error.json.error, /max file size/);
        }

        try {
          await storageClient.upload_public_file_from_vaccount(data, {
            name: vAccount1,
            key: privateKeyWif
          });
          return done(new Error(`should fail because vaccount reached daily limit`))
        } catch (error) {
          assert.match(error.json.error, /max vaccount/);
        }

        try {
          const data2 = Buffer.concat([data, new Uint8Array([0])])
          await storageClient.upload_public_file_from_vaccount(data2, {
            name: vAccount2,
            key: privateKeyWif
          });
          return done(new Error(`should fail because reached global daily limit`))
        } catch (error) {
          assert.match(error.json.error, /max global/);
        }

        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });

  it("Upload File with wrong signature should fail", done => {
    (async () => {
      try {
        const dappClient = await createClient({
          httpEndpoint: endpoint,
          fetch
        });
        const storageClient = await dappClient.service("storage", code);

        const data = Buffer.from("test1234", `utf8`);
        // a key that doesn't mach vaccount1's key
        const wrongKey = (await ecc.PrivateKey.fromSeed(`wrongkey`)).toWif();

        try {
          await storageClient.upload_public_file_from_vaccount(data, {
            name: vAccount1,
            key: wrongKey
          });
        } catch (error) {
          assert.match(error.json.error, /signature not valid/);
          done();
          return;
        }
        done(
          new Error(`should not be able to upload as vaccount1 with wrong key`)
        );
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });

  it("Unpin file", done => {
    (async () => {
      try {
        const storageClient = await dappClient.service("storage", code);
        const keys = await getCreateKeys(code, getDefaultArgs(), false, sidechain);
        const key = keys.active.privateKey;
        const data = Buffer.from("test1234", "utf8");
        const permission = "active";
        let result = await storageClient.upload_public_file(
          data,
          key,
          permission
        );
        assert.equal(
          result.uri,
          "ipfs://zb2rhga33kcyDrMLZDacqR7wLwcBRVgo6sSvLbzE7XSw1fswH"
        );
        result = await storageClient.unpin(
          result.uri,
          key,
          permission,
        );
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });
});
