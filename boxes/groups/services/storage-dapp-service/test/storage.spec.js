import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getTestContract, getCreateKeys } = require('../extensions/tools/eos/utils');
const fetch = require('node-fetch');
const { createClient } = require("@liquidapps/dapp-client");
//dappclient requirement
global.fetch = fetch;

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');
var fs = require('fs')

const contractCode = 'eosio.token';
const authContractCode = 'authenticator';

var ctrt = artifacts.require(`./${contractCode}/`);
var ctrta = artifacts.require(`./${authContractCode}/`);
describe(`LiquidStorage Test`, () => {
  var testcontract;
  const code = 'test1';
  var endpoint = "http://localhost:13015";
  before(done => {
    (async() => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        var deployedContractAuth = await deployer.deploy(ctrta, 'authentikeos');

        await genAllocateDAPPTokens(deployedContract, 'storage');
        testcontract = await getTestContract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  const serviceName = 'storage';
  var account = code;
  it.skip('Upload File (authenticated)', done => {
    (async() => {
      try {
        const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
        const storageClient = await dappClient.service(
          "storage",
          code
        );
        //var authClient = new AuthClient(apiID, 'authentikeos', null, endpoint);
        const keys = await getCreateKeys(code);
        const key = keys.active.privateKey;
        const data = Buffer.from("test1234");
        const permission = "active";
        const result = await storageClient.upload_public_file(data, key, permission);
        assert.equal(result.uri, "ipfs://zb2rhga33kcyDrMLZDacqR7wLwcBRVgo6sSvLbzE7XSw1fswH");
        done();
      }
      catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });
  it.skip('Upload Archive', done => {
    (async() => {
      try {

        const dappClient = await createClient({ httpEndpoint: endpoint, fetch });
        const storageClient = await dappClient.service(
          "storage",
          code
        );
        //var authClient = new AuthClient(apiID, 'authentikeos', null, endpoint);
        const keys = await getCreateKeys(code);
        const key = keys.active.privateKey;
        const permission = "active";
        const tar = require('tar-stream')
        const pack = tar.pack() // pack is a streams2 stream
        pack.entry({ name: 'test.html' }, 'Hello World!')
        pack.entry({ name: 'index.html' }, 'index file');

        const entry = pack.entry({ name: 'my-stream-test.txt', size: 11 }, function(err) {
          pack.finalize();
        })

        entry.write('hello')
        entry.write(' ')
        entry.write('world')
        entry.end()
        const path = 'YourTarBall.tar'
        const tarfile = fs.createWriteStream(path)


        // pipe the pack stream somewhere
        pack.pipe(tarfile);
        tarfile.on('close', async function() {
          const content = fs.readFileSync(path);

          const result = await storageClient.upload_public_file(content, key, permission);
          assert.equal(result.uri, "ipfs://QmYS55iqu1zwxszW5ywEmT5w6m6VKjYwa9G9Xka8Uv4j9s");
          done();
        })

      }
      catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });
});
