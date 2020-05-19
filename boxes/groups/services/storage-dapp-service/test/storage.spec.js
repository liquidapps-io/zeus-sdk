require("mocha");
const { requireBox, getBoxesDir } = require('@liquidapps/box-utils');
const fs = require("fs");
const { assert } = require("chai"); // Using Assert style
const fetch = require("node-fetch");
const ecc = require("eosjs-ecc");
const { JsonRpc } = require("eosjs");
const {
  getTestContract,
  getCreateKeys,
} = requireBox('seed-eos/tools/eos/utils');
const { createClient } = requireBox("client-lib-base/client/dist/src/dapp-client-lib");
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { getIpfsFileAsBuffer } = requireBox("storage-dapp-service/services/storage-dapp-service-node/common.js")

//dappclient requirement
global.fetch = fetch;
var endpoint = "http://localhost:13015";

const rpc = new JsonRpc(endpoint, { fetch });

const contractCode = "storageconsumer";
const authContractCode = "authenticator";

var ctrtStorage = artifacts.require(`./${contractCode}/`);
var ctrtAuth = artifacts.require(`./${authContractCode}/`);

const vAccount1 = `vaccount1`;
const vAccount2 = `vaccount2`;

describe(`LiquidStorage Test`, () => {
  var testcontract;
  const code = "test1";
  let privateKeyWif;
  let dappClient;

  const regVAccount = async name => {
    const vaccountClient = await dappClient.service("vaccounts", code);
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
        dappClient = await createClient({
          httpEndpoint: endpoint,
          fetch,
        });
        var deployedStorage = await deployer.deploy(ctrtStorage, code);
        var deployedAuth = await deployer.deploy(ctrtAuth, "authentikeos");

        await genAllocateDAPPTokens(deployedStorage, "storage");
        await genAllocateDAPPTokens(deployedStorage, "vaccounts");
        await genAllocateDAPPTokens(deployedStorage, "ipfs");
        testcontract = await getTestContract(code);

        let info = await rpc.get_info();
        let chainId = info.chain_id;

        try {
          let res = await testcontract.xvinit(
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
        const publicKeyVAccount = privateKeyWif.toPublic().toString();
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

  it('Upload File (authenticated)', done => {
    (async () => {
      try {
        const storageClient = await dappClient.service("storage", code);
        //var authClient = new AuthClient(apiID, 'authentikeos', null, endpoint);
        const keys = await getCreateKeys(code);
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
        //var authClient = new AuthClient(apiID, 'authentikeos', null, endpoint);
        const keys = await getCreateKeys(code);
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
        //var authClient = new AuthClient(apiID, 'authentikeos', null, endpoint);
        const keys = await getCreateKeys(code);
        const key = keys.active.privateKey;
        const permission = "active";
        const boxDir = getBoxesDir();
        const path = `${boxDir}test/utils/YourTarBall.tar`;
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

        const fileContent = await getIpfsFileAsBuffer(`QmYS55iqu1zwxszW5ywEmT5w6m6VKjYwa9G9Xka8Uv4j9s/my-stream-test.txt`)
        assert.equal(
          fileContent.toString(`utf8`),
          "hello world"
        );
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
        //var authClient = new AuthClient(apiID, 'authentikeos', null, endpoint);
        const keys = await getCreateKeys(code);
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