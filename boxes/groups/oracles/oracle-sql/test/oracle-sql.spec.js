

require('mocha');
const { assert } = require('chai'); // Using Assert style
const { getTestContract } = require('../extensions/tools/eos/utils');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'oracleconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`SQL Oracle Service Test`, () => {
  var testcontract;
  const code = 'test1';
  before(done => {
    (async () => {
      try {

        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");

        testcontract = await getTestContract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  const run = async (sql, expected) => {
    return await testcontract.testrnd({
      uri: Buffer.from(`sql://${Buffer.from(sql).toString('base64')}`, 'utf8')
    }, {
      authorization: `${code}@active`,
      broadcast: true,
      sign: true
    });

  }

  var account = code;
  it('SQL Oracle Const Query', done => {
    (async () => {
      try {
        var res = await run("select 'hello'", "hello");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('SQL Oracle CRUD', done => {
    (async () => {
      try {
        await run(`DROP TABLE if exists contacts`);
        await run(`CREATE TABLE contacts (
    contact_id INTEGER PRIMARY KEY,
    contact_name TEXT NOT NULL
)`);

        await run(`INSERT INTO contacts (contact_name)
VALUES ('satoshi nakamoto'),('rickiest rick'),('mortyest morty')`);

        await run(`select count(*) from contacts`, '3');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });


});
