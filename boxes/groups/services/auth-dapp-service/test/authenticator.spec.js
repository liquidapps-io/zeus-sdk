import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork, getCreateAccount } = require('../extensions/tools/eos/utils');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');


var contractCode = 'authenticator';
var ctrt = artifacts.require(`./${contractCode}/`);
var AuthClient = require('../extensions/tools/auth-client');
const code = 'authenticato';
var apiID = 'ssAuthAPI';

var authClient = new AuthClient(apiID,
  code,
  "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906",
  'http://localhost:13015' // use DSP service to authenticate
);
describe.skip(`Auth DAPP Service Test Contract`, () => {
  var dspeos;
  before(done => {
    (async() => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);

        await genAllocateDAPPTokens(deployedContract, 'auth');
        // create token
        const { getLocalDSPEos } = require('../extensions/tools/eos/utils');
        dspeos = await getLocalDSPEos(code);

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it('Authed call - permission - non-existing', done => {
    (async() => {
      try {
        var testUser = "testuse11"

        var keys = await getCreateAccount(testUser);
        var permission = "none";
        var testnum = 123;
        try {
          await authClient.invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys });
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
        var res = await authClient.invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys });
        assert.equal(res.permission, permission);
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
        await dspeos.updateauth({
          account: testUser,
          permission,
          parent: 'active',
          auth: {
            threshold: 1,
            keys: [{ key: apikeys.publicKey, weight: 1 }],
            accounts: [],
            waits: []
          }
        }, {
          authorization: `${testUser}@active`,
          keyProvider: [keys.active.privateKey]
        });
        await dspeos.linkauth({
          account: testUser,
          code: code,
          type: authClient.method,
          requirement: permission
        }, {
          authorization: `${testUser}@active`,
          keyProvider: [keys.active.privateKey]
        });

        var testnum = 123;
        var res = await authClient.invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys: apikeys });
        assert.equal(res.permission, permission);

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
        await dspeos.updateauth({
          account: testUser,
          permission,
          parent: 'active',
          auth: {
            threshold: 1,
            keys: [{ key: apikeys.publicKey, weight: 1 }],
            accounts: [],
            waits: []

          }
        }, {
          authorization: `${testUser}@active`,
          keyProvider: [keys.active.privateKey]
        });
        await dspeos.linkauth({
          account: testUser,
          code: code,
          type: authClient.method,
          requirement: permission
        }, {
          authorization: `${testUser}@active`,
          keyProvider: [keys.active.privateKey]
        });
        var testnum = 123;
        try {
          await authClient.invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys });
        }
        catch (e) {
          assert.include(e.message, `transaction declares authority \'{"actor":"${testUser}","permission":"${permission}"}\', but does not have signatures for it under`);
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

        var res = await authClient.invokeClientAuthedCall({ payload: { testnum }, permission, keys });
        assert.equal(res.permission, permission);
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
        var keys = await getCreateAccount("randomke22");
        try {
          await authClient.invokeClientAuthedCall({ payload: { testnum }, permission, keys });
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
