
const { requireBox } = require('@liquidapps/box-utils');
require('mocha');
const { assert } = require('chai'); // Using Assert style
const { getTestContract } = requireBox('seed-eos/tools/eos/utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');

const contractCode = 'oracleconsumer';
const ctrt = artifacts.require(`./${contractCode}/`);
describe(`Echo Oracle Service Test`, () => {
  let testcontract;
  const code = 'test1';
  before(done => {
    (async () => {
      try {
        const deployedContract = await deployer.deploy(ctrt, code);
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
  it('Oracle ECHO Get', done => {
    (async () => {
      try {
        const content = Buffer.from('This is echo content').toString('base64');
        var res = await testcontract.testget({
          uri: Buffer.from(`echo://${content}`, 'utf8'),
          expectedfield: Buffer.from("This is echo content"),
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Oracle ECHO+JSON Get', done => {
    (async () => {
      try {
        const content = Buffer.from('{"name":"Tal Muskal"}').toString('base64');
        var res = await testcontract.testget({
          uri: Buffer.from(`echo+json://name/${content}`, 'utf8'),
          expectedfield: Buffer.from("Tal Muskal"),
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Oracle ECHO+POST', done => {
    (async () => {
      try {
        const body = Buffer.from('{"block_num_or_id":"36568000"}').toString('base64');
        const content = Buffer.from('This is echo content').toString('base64');
        const res = await testcontract.testget({
          uri: Buffer.from(`echo+post://${body}/${content}`, 'utf8'),
          expectedfield: Buffer.from('This is echo content', 'utf8'),
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Oracle ECHO+POST+JSON', done => {
    (async () => {
      try {
        const body = Buffer.from('{"block_num_or_id":"36568000"}').toString('base64');
        const content = Buffer.from('{"timestamp":"2019-01-09T18:20:23.000"}').toString('base64');
        const res = await testcontract.testget({
          uri: Buffer.from(`echo+post+json://timestamp/${body}/${content}`, 'utf8'),
          expectedfield: Buffer.from('2019-01-09T18:20:23.000', 'utf8'),
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
