import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getTestContract, getCreateKeys } = require('../extensions/tools/eos/utils');
const fetch = require('node-fetch');
const { createClient } = require("../client/dist/src/dapp-client-lib");
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
  it('Upload File (authenticated)', done => {
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

  it('Upload Archive', done => {
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
        const path = "test/utils/YourTarBall.tar";
        const content = fs.readFileSync(path);
        const result = await storageClient.upload_public_file(content, key, permission);
        assert.equal(result.uri, "ipfs://zb2rhZ1hCjtUCo69LncPZ4HzXVUVR5ULQkGTMJGcT8raD33Fu");
        done();

      }
      catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });
});
