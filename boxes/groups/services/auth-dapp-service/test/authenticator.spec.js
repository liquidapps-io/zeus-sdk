import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getNetwork, getCreateKeys, getCreateAccount } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const fetch = require('node-fetch');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');
var sha256 = require('js-sha256').sha256;
const hashData256 = (data) => {
  var hash = sha256.create();
  hash.update(data);
  return hash.hex();
};

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
    .then(async response => {
      var text = await response.text();
      var json = JSON.parse(text);
      if (json.error)
        throw new Error(json.error);
      return json;
    }); // parses response to JSON
}
var contractCode = 'authenticator';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`Auth DAPP Service Test Contract`, () => {
  var testcontract;
  var testcontracta;
  const code = 'authenticato';
  var endpoint;
  var eosvram;
  before(done => {
    (async() => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);

        await genAllocateDAPPTokens(deployedContract, 'auth');
        // create token
        var selectedNetwork = getNetwork(getDefaultArgs());
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        if (account) {
          var keys = await getCreateKeys(code);
          config.keyProvider = keys.privateKey;
        }
        eosvram = deployedContract.eos;
        config.httpEndpoint = 'http://localhost:13015';
        eosvram = new Eos(config);
        endpoint = config.httpEndpoint;

        testcontract = await eosvram.contract(code);

        var config2 = {
          expireInSeconds: 120,
          sign: true,
          chainId: "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906",
          httpEndpoint: 'http://localhost:13015'
        };
        var tempEos = new Eos(config2);
        testcontracta = await tempEos.contract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  const getClientCode = async({ publickey }) => {
    return (await postData(`${endpoint}/v1/dsp/authfndspsvc/code`, { publickey })).code;
  };

  const createAPICallTransaction = async(contract, method, account, permission, actionData, ttl, keys) => {
    var opts = {
      authorization: `${account}@${permission}`,
      broadcast: false,
      sign: true,
      keyProvider: [keys.privateKey]
    };
    var theContract;
    if (account == "............") {
      theContract = testcontracta;
    }
    else {
      theContract = testcontract;
    }

    var trx = await theContract[method](actionData, opts);
    return trx;

  };
  const sign = async(hash, account, keys, ttl, clientCode) => {
    return "";
  };


  const invokeClientAuthedCall = async({
    payload,
    permission = "api",
    keys,
    testAction
  }) => {
    // generate public key: publickey
    return invokeAuthedCall({
      payload,
      account: "............",
      permission,
      keys,
      testAction
    })
  };
  var method = "xauthusage";
  const invokeAuthedCall = async({
    payload,
    account,
    permission = "api",
    keys,
    testAction
  }) => {
    var payloadStr = JSON.stringify(payload);
    var payload_hash = hashData256(payloadStr);
    var ttl = 120;
    var opts = {};
    if (account === "............")
      opts.publickey = keys.publicKey;

    var clientCode = await getClientCode(opts);
    var contract = code;

    var signature = await sign(payload_hash, account, keys, ttl, clientCode);
    var actionData = {
      account,
      permission,
      payload_hash,
      client_code: clientCode,
      signature,
      current_provider: "",
      "package": ""
    }
    var trx = await createAPICallTransaction(contract, method, account, permission, actionData, ttl, keys);

    // to a test api
    return postData(`${endpoint}/v1/dsp/authfndspsvc/${testAction}`, {
      trx,
      payload: payloadStr
    });
  };
  var account = code;
  it('Authed call - permission - non-existing', done => {
    (async() => {
      try {
        var testUser = "testuse11"

        var keys = await getCreateAccount(testUser);
        var permission = "none";
        var testnum = 123;
        try {
          await invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys, testAction: "test" });
        }
        catch (e) {
          assert.equal(e.message, "Error: action's authorizations include a non-existent permission: {permission}");
          done();
          return;
        }
        throw new Error('should have failed auth');
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Authed call - active permission', done => {
    (async() => {
      try {
        var testUser = "testuser1"
        var keys = await getCreateAccount(testUser);
        var permission = "active";
        var testnum = 123;
        var res = await invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys, testAction: "test" });
        var result = `hello-${testnum}-${testUser}@${permission}`;
        assert.equal(res.result, result);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Authed call - api permission', done => {
    (async() => {
      try {
        var testUser = "testuser2"
        var keys = await getCreateAccount(testUser);
        var apikeys = await getCreateKeys("randomkey1");
        var permission = "api";
        await eosvram.updateauth({
          account: testUser,
          permission,
          parent: 'active',
          auth: {
            threshold: 1,
            keys: [{ key: apikeys.publicKey, weight: 1 }],
            accounts: []
          }
        }, {
          authorization: `${testUser}@active`,
          keyProvider: [keys.privateKey],
          broadcast: true,
          sign: true
        });
        await eosvram.linkauth({
          account: testUser,
          code: code,
          type: method,
          requirement: permission
        }, {
          authorization: `${testUser}@active`,
          keyProvider: [keys.privateKey],
          broadcast: true,
          sign: true
        });

        var testnum = 123;
        var res = await invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys: apikeys, testAction: "test" });
        var result = `hello-${testnum}-${testUser}@${permission}`;
        assert.equal(res.result, result);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Authed call - api permission - wrong key', done => {
    (async() => {
      try {
        var testUser = "testuser3"
        var keys = await getCreateAccount(testUser);
        var apikeys = await getCreateKeys("randomkey2");
        var permission = "api";
        await eosvram.updateauth({
          account: testUser,
          permission,
          parent: 'active',
          auth: {
            threshold: 1,
            keys: [{ key: apikeys.publicKey, weight: 1 }],
            accounts: []
          }
        }, {
          authorization: `${testUser}@active`,
          keyProvider: [keys.privateKey],
          broadcast: true,
          sign: true
        });
        await eosvram.linkauth({
          account: testUser,
          code: code,
          type: method,
          requirement: permission
        }, {
          authorization: `${testUser}@active`,
          keyProvider: [keys.privateKey],
          broadcast: true,
          sign: true
        });
        var testnum = 123;
        try {
          await invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys, testAction: "test" });
        }
        catch (e) {
          assert.include(e.message, `transaction declares authority \'{"actor":"testuser3","permission":"api"}\', but does not have signatures for it under`);
          done();
          return;
        }
        throw new Error('should have failed auth');
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Anonymous call', done => {
    (async() => {
      try {
        var testUser = "............"
        var permission = "api";
        var testnum = 123;
        var keys = await getCreateAccount("randomkey5");

        var res = await invokeClientAuthedCall({ payload: { testnum }, permission, testAction: "test_anon", keys });
        var result = `hello-${testnum}-${testUser}@${permission}`;
        assert.equal(res.result, result);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Anonymous call to authed API', done => {
    (async() => {
      try {
        var permission = "api";
        var testnum = 123;
        var keys = await getCreateAccount("randomkey8");
        try {
          await invokeClientAuthedCall({ payload: { testnum }, permission, testAction: "test", keys });
        }
        catch (e) {
          assert.equal(e.message, "Error: anonymous actions not allowed");
          done();
          return;
        }
        throw new Error('should have failed auth');
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
