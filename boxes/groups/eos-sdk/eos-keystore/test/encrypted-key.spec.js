import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { execPromise } = require('../extensions/helpers/_exec');
const os = require('os');
const fs = require('fs');

const home = os.homedir();
const privateKey = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';
const accountPath = `${home}/.zeus/networks/zeus-test/encrypted-accounts/eosio.json`;

const expectedKeys = '{"owner":{"privateKey":"5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3","publicKey":"EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV"},"active":{"privateKey":"5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3","publicKey":"EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV"}}';
const rmAccount = () => execPromise(`rm ${accountPath}`);

describe('encrypted-key utility test', () => {
  beforeEach(done => {
    (async () => {
      if (fs.existsSync(accountPath))
        await rmAccount();
      done();
    })();
  });

  it('should be able to encrypt and decrypt a keypair', done => {
    (async () => {
      try {
        await execPromise(`zeus key import eosio --owner-private-key ${privateKey} --active-private-key ${privateKey} --encrypted=true --network=zeus-test --password=lalala`);
        const keys = await execPromise(`zeus key export eosio --encrypted=true --network=zeus-test --password=lalala`);
        assert.equal(keys.trim(), expectedKeys.trim(), 'unexpected result from exported keys');
        done();
      } catch(e) {
        done(e);
      }
    })();
  });

  it("shouldn't be able to decrypt a keypair with the wrong password", done => {
    (async () => {
      let pass = false;
      try {
        await execPromise(`zeus key import eosio --owner-private-key ${privateKey} --encrypted=true --network=zeus-test --password=lalala`);
        await execPromise(`zeus key export eosio --encrypted=true --network=zeus-test --password=wrongpassword`);
      } catch(e) {
        pass = true;
      }
      assert.equal(pass, true, 'should have failed with wrong password');
      done();
    })();
  });

  it("shouldn't be able to overwrite an already encrypted account key", done => {
    (async () => {
      let pass = false;
      await execPromise(`zeus key import eosio --owner-private-key ${privateKey} --encrypted=true --network=zeus-test --password=lalala`);
      try {
        await execPromise(`zeus key import eosio --owner-private-key ${privateKey} --encrypted=true --network=zeus-test --password=lalala`);
      } catch(e) {
        pass = true;
      }
      assert.equal(pass, true, 'should have thrown an error when trying to overwrite encrypted keys');
      done();
    })();
  });

  it("should default the active key to the owner key if none is provided", done => {
    (async () => {
      try {
        await execPromise(`zeus key import eosio --owner-private-key ${privateKey} --encrypted=true --network=zeus-test --password=lalala`);
        const keys = await execPromise(`zeus key export eosio --encrypted=true --network=zeus-test --password=lalala`);
        assert.equal(keys.trim(), expectedKeys.trim(), 'unexpected result from exported keys');
        done();
      } catch(e) {
        done(e);
      }
    })();
  });
});
