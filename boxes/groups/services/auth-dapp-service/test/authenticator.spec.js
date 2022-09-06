require('mocha');


const { assert } = require('chai'); // Using Assert style
const { requireBox } = require('@liquidapps/box-utils');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { getNetwork, getCreateAccount, getEos,getLocalDSPEos } = requireBox('seed-eos/tools/eos/utils');

const contractCode = 'authenticator';
const ctrt = artifacts.require(`./${contractCode}/`);
const AuthClient = requireBox('auth-dapp-service/tools/auth-client');
const code = 'authentikeos';
const apiID = 'ssAuthAPI';

const authClient = new AuthClient(
  code,
  "0065e5c9f6008f54fb79853a3c8c9b031d05ff1678fa44c00197618ebc612d24",
  'http://localhost:13015' // use DSP service to authenticate
);
describe(`Auth DAPP Service Test Contract`, () => {
  let dspeos;
  before(done => {
    (async () => {
      try {
        let deployedContract = await deployer.deploy(ctrt, code);

        await genAllocateDAPPTokens(deployedContract, 'auth');
        // create token
        const eos = await getEos('eosio');
        dspeos = await eos.contract('eosio');

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  let account = code;
  it('Authed call - permission - non-existing', done => {
    (async () => {
      try {
        let testUser = "testuse11"

        let keys = await getCreateAccount(testUser);
        let permission = "none";
        let testnum = 123;
        try {
          await authClient.invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys });
        }
        catch (e) {
          assert.equal(e.error.name, `unsatisfied_authorization`);
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
    (async () => {
      try {
        let testUser = "testuser1"
        let keys = await getCreateAccount(testUser);
        let permission = "active";
        let testnum = 123;
        let res = await authClient.invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys });
        assert.equal(res.permission, permission);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Authed call - api permission', done => {
    (async () => {
      try {
        let testUser = "testuser2"
        let keys = await getCreateAccount(testUser);
        let apikeys = await getCreateKeys("randomkey1");
        let permission = "api";
        await dspeos.updateauth({
          account: testUser,
          permission,
          parent: 'active',
          auth: {
            threshold: 1,
            keys: [{ key: apikeys.active.publicKey, weight: 1 }],
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

        let testnum = 123;
        let res = await authClient.invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys: apikeys });
        assert.equal(res.permission, permission);

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Authed call - api permission - wrong key', done => {
    (async () => {
      try {
        let testUser = "testuser3"
        let keys = await getCreateAccount(testUser);
        let apikeys = await getCreateKeys("randomkey2");
        let permission = "api";
        await dspeos.updateauth({
          account: testUser,
          permission,
          parent: 'active',
          auth: {
            threshold: 1,
            keys: [{ key: apikeys.active.publicKey, weight: 1 }],
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
        let testnum = 123;
        try {
          await authClient.invokeAuthedCall({ payload: { testnum }, account: testUser, permission, keys });
        }
        catch (e) {
          assert.equal(e.error.name, "unsatisfied_authorization");
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
