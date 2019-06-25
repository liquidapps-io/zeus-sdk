import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getNetwork, getCreateKeys } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'ipfsconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`IPFS Service Test Contract`, () => {
  var testcontract;
  const code = 'test1';
  var eosvram;
  before(done => {
    (async() => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, 'ipfs');
        // create token
        var selectedNetwork = getNetwork(getDefaultArgs());
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        if (account) {
          var keys = await getCreateKeys(account);
          config.keyProvider = keys.privateKey;
        }
        eosvram = deployedContract.eos;
        config.httpEndpoint = 'http://localhost:13015';
        eosvram = new Eos(config);

        testcontract = await eosvram.contract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it('IPFS Write', done => {
    (async() => {
      try {
        var res = await testcontract.testset({
          data: {
            field1: 123,
            field2: 'hello-world',
            field3: 312
          }
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        // var eventResp = JSON.parse(res.processed.action_traces[0].console);
        // assert.equal(eventResp.etype, "service_request", "wrong etype");
        // assert.equal(eventResp.provider,"", "wrong provider");
        // assert.equal(eventResp.action, "commit", "wrong action");

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('IPFS Get Available Key', done => {
    (async() => {
      try {
        await testcontract.increment({}, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        await testcontract.increment({}, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        await testcontract.increment({}, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        let table = await eosvram.getTableRows({
          code: code,
          scope: 'test',
          table: '.vconfig',
          json: true,
        });
        let next_key = table.rows[0].next_available_key;
        let shards = table.rows[0].shards;
        let buckets = table.rows[0].buckets_per_shard;

        assert.equal(next_key, 3, 'wrong key');
        assert.equal(shards, 1024, 'wrong shards');
        assert.equal(buckets, 64, 'wrong buckets');

        await testcontract.testindex({
          id: 555
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        await testcontract.testindex({
          id: 20
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        table = await eosvram.getTableRows({
          code: code,
          scope: 'test',
          table: '.vconfig',
          json: true,
        });
        next_key = table.rows[0].next_available_key;

        assert.equal(next_key, 556, 'wrong key');


        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('IPFS Resize Should Fail', done => {
    (async() => {
      try {

        let failed = false;

        try {
          await testcontract.testresize({}, {
            authorization: `${code}@active`,
            broadcast: true,
            sign: true
          });
        }
        catch (e) {
          failed = true
        }

        assert(failed, 'should have failed');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });


  it('IPFS Read', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: 'ipfs://zb2rhnaYrUde9d7h13vHTXeWcBJcBpEFdMgAcbXbFfM5aQxgK',
          expectedfield: 123
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        // var eventResp = JSON.parse(res.processed.action_traces[0].console);
        // assert.equal(eventResp.etype, "service_request", "wrong etype");
        // assert.equal(eventResp.provider,"", "wrong provider");
        // assert.equal(eventResp.action, "cleanup", "wrong action");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('IPFS uint64_t Primary Key', done => {
    (async() => {
      try {

        await testcontract.testindex({
          id: 12345
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        var tableRes = await readVRAMData({
          contract: code,
          key: 12345,
          table: "test",
          scope: code
        });
        assert(tableRes.row.id == 12345, "wrong uint64_t");

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
