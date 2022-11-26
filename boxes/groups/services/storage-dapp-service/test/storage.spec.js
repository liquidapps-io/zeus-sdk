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

describe(`LiquidStorage Test`, async () => {
  var testcontract;
  const code = "test1";
  let privateKeyWif;
  let dappClient;
  let storageClient
  const boxDir = getBoxesDir();
  const permission = "active";
  const keys = await getCreateKeys(code);
  const key = keys.active.privateKey;

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
        storageClient = await dappClient.service("storage", code);
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
        const data = Buffer.from("test1234", "utf8");
        const options = {
          rawLeaves: true
        };
        const result = await storageClient.upload_public_file(
          data,
          key,
          permission,
          options
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
        const data = Buffer.from("test1234read", "utf8");
        const options = {
          rawLeaves: true
        };
        const result = await storageClient.upload_public_file(
          data,
          key,
          permission,
          options
        );
        const res = await fetch('http://localhost:13015/v1/dsp/liquidstorag/get_uri', {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ uri: result.uri })
        });
        const resJson = await res.json();
        assert.equal(
          Buffer.from(resJson.data, 'base64').toString(),
          data
        );
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  })

  it('Upload File and read small photo', done => {
    (async () => {
      try {
        const path = `test/utils/smash.jpeg`;
        const data = fs.readFileSync(path, { encoding: 'utf8' });
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
          resJson.uri,
          "ipfs://zb2rhgvn5m2modL2ECgv1jgt7CSng52xkwwz6N9WtGkVr3wzz"
        );
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  })

  it('Upload File and read large photo', done => {
    (async () => {
      try {
        const path = `test/utils/shockley.jpg`;
        const data = fs.readFileSync(path,{ encoding: 'utf8' });
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
          resJson.uri,
          "ipfs://zb2rhcfhwVN5Q9KnmXvWpMnqziSE4ZBFQP4HzfgrciV5Gi7YU"
        );
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  })

  it('Upload File and read short mp4 movie', done => {
    (async () => {
      try {
        const path = `test/utils/end-of-z-world.mp4`;
        const data = fs.readFileSync(path,{ encoding: 'utf8' });
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
          resJson.uri,
          "ipfs://zb2rhhsTKUBetitsSFDVTMYqavfa8mSibDeJdKoBTzwzFxaku"
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
        const path = `test/utils/YourTarBall.tar`;
        const content = fs.readFileSync(path);
        const options = {
          rawLeaves: true
        };
        const result = await storageClient.upload_public_archive(
          content,
          key,
          permission,
          'tar',
          options
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
        const options = {
          rawLeaves: true
        };
        result = await storageClient.upload_public_file_from_vaccount(
          data, 
          {
            name: vAccount1,
            key: privateKeyWif
          },
          options
        );
        assert.equal(
          result.uri,
          "ipfs://zb2rhga33kcyDrMLZDacqR7wLwcBRVgo6sSvLbzE7XSw1fswH"
        );

        const hugeData = Buffer.concat([data, data]);
        try {
          await storageClient.upload_public_file_from_vaccount(
            hugeData, 
            {
              name: vAccount1,
              key: privateKeyWif
            },
            options
          );
          return done(new Error(`should fail because file size > max file size`))
        } catch (error) {
          assert.match(error.json.error, /max file size/);
        }

        try {
          await storageClient.upload_public_file_from_vaccount(data, 
            {
            name: vAccount1,
            key: privateKeyWif
            },
            options
          );
          return done(new Error(`should fail because vaccount reached daily limit`))
        } catch (error) {
          assert.match(error.json.error, /max vaccount/);
        }

        try {
          const data2 = Buffer.concat([data, new Uint8Array([0])])
          await storageClient.upload_public_file_from_vaccount(data2, {
              name: vAccount2,
              key: privateKeyWif
            },
            options
          );
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
        const data = Buffer.from("test1234", `utf8`);
        // a key that doesn't mach vaccount1's key
        const wrongKey = (await ecc.PrivateKey.fromSeed(`wrongkey`)).toWif();

        const options = {
          rawLeaves: true
        };
        try {
          await storageClient.upload_public_file_from_vaccount(data, {
              name: vAccount1,
              key: wrongKey
            },
            options
          );
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
        const data = Buffer.from("test1234", "utf8");
        const options = {
          rawLeaves: true
        };
        let result = await storageClient.upload_public_file(
          data,
          key,
          permission,
          options
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
  
  it('Upload html file and perform GET Request', done => {
    (async () => {
      try {
        const data = Buffer.from("<html><head></head><body><h1>Hello, HTML!</h1></body></html>", "utf8");
        const options = {
          rawLeaves: true
        };
        const result = await storageClient.upload_public_file(
          data,
          key,
          permission,
          options
        );
        
        // fetch data back from liquidstorage using a GET request and set response headers for 'Content-Type'
        // and 'cross origin isolation' (check out: https://web.dev/coop-coep/ for more information!)
        let url_params = '?uri=' + result.uri;
        url_params += '&__content_type=text%2Fhtml%3B%20charset%3Dutf-8';
        url_params += '&__cross_origin_opener_policy=same-origin';
        url_params += '&__cross_origin_embedder_policy=require-corp';
        res = await fetch(endpoint + '/v1/dsp/liquidstorag/get_uri' + url_params, {
            method: 'GET',
            mode: 'cors'
        });

        // check response headers
        assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
        // cannot check the other response headers because of CORS mode!
        // check https://stackoverflow.com/a/44816592/2340535 for more information

        res = await res.arrayBuffer();
        res = Buffer.from(new Uint8Array(res)).toString();
        assert.equal(res, data);

        // console.log('Open the following link in a browser and check the console if "self.crossOriginIsolated" is set to "true":')
        // console.log(endpoint + '/v1/dsp/liquidstorag/get_uri' + url_params);
        // console.log('30 seconds timeout...');
        // await new Promise(resolve => setTimeout(resolve, 30000));

        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });
  
});