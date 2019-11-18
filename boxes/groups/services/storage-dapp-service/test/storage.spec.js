import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getTestContract, getCreateKeys } = require('../extensions/tools/eos/utils');
const fetch = require('node-fetch');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');
var fs = require('fs')

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
var contractCode = 'eosio.token';
var authContractCode = 'authenticator';
var AuthClient = require('../extensions/tools/auth-client');

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
        var deployedContractAuth = await deployer.deploy(ctrta, 'authenticato');

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
  it('Upload File (authenticated)', done => {
    (async() => {
      try {

        var apiID = `pprovider1-${serviceName}`;
        var authClient = new AuthClient(apiID, 'authenticato', null, endpoint);
        var keys = await getCreateKeys(code);
        const permission = "active";
        const result = await authClient.invokeAuthedCall({ payload: { data: Buffer.from("test1234").toString('hex'), contract: account }, service: "liquidstorag", account, permission, keys, action: "upload_public", skipClientCode: true });
        assert.equal(result.uri, "ipfs://zb2rhga33kcyDrMLZDacqR7wLwcBRVgo6sSvLbzE7XSw1fswH");
        done();
      }
      catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });
  it('Upload Archive', done => {
    (async() => {
      try {

        var apiID = `pprovider1-${serviceName}`;
        var authClient = new AuthClient(apiID, 'authenticato', null, endpoint);
        var keys = await getCreateKeys(code);
        const permission = "active";
        var tar = require('tar-stream')
        var pack = tar.pack() // pack is a streams2 stream
        pack.entry({ name: 'test.html' }, 'Hello World!')
        pack.entry({ name: 'index.html' }, 'index file');

        var entry = pack.entry({ name: 'my-stream-test.txt', size: 11 }, function(err) {
          pack.finalize();
        })

        entry.write('hello')
        entry.write(' ')
        entry.write('world')
        entry.end()
        var path = 'YourTarBall.tar'
        var tarfile = fs.createWriteStream(path)


        // pipe the pack stream somewhere
        pack.pipe(tarfile);
        tarfile.on('close', async function() {
          var content = fs.readFileSync(path);

          const result = await authClient.invokeAuthedCall({ payload: { archive: { data: content.toString('hex') }, contract: account }, service: "liquidstorag", account, permission, keys, action: "upload_public", skipClientCode: true });
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
