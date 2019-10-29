import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork } = require('../extensions/tools/eos/utils');
const { getEosWrapper } = require('../extensions/tools/eos/eos-wrapper');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = require('../extensions/tools/eos/dapp-services');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);

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
          config.keyProvider = keys.active.privateKey;
        }
        eosvram = deployedContract.eos;
        config.httpEndpoint = 'http://localhost:13015';
        eosvram = getEosWrapper(config);

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
            field2: new Buffer('hello-world').toString('hex'),
            field3: 312
          }
        }, {
          authorization: `${code}@active`,
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

  it('IPFS Read', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: 'ipfs://zb2rhnyodRMHNeY4iaSVXzVhtFmYdWxsvddrhzhWZFUMiZdrd',
          expectedfield: 123
        }, {
          authorization: `${code}@active`,
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

  it('dapp::multi_index Get Available Key', done => {
    (async() => {
      try {
        await testcontract.increment({ somenumber: 1 }, {
          authorization: `${code}@active`,
        });

        await testcontract.increment({ somenumber: 5 }, {
          authorization: `${code}@active`,
        });

        await testcontract.increment({ somenumber: 6 }, {
          authorization: `${code}@active`,
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

        await testcontract.testindexa({
          id: 555
        }, {
          authorization: `${code}@active`,
        });

        await testcontract.testindexa({
          id: 20
        }, {
          authorization: `${code}@active`,
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

  it('dapp::multi_index Resize Should Fail', done => {
    (async() => {
      try {

        let failed = false;

        try {
          await testcontract.testresize({}, {
            authorization: `${code}@active`,
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


  it('dapp::multi_index uint64_t Primary Key', done => {
    (async() => {
      try {

        await testcontract.testindexa({
          id: 12345
        }, {
          authorization: `${code}@active`,
        });

        var tableRes = await readVRAMData({
          contract: code,
          key: 12345,
          table: "test",
          scope: code,
          keytype: 'number'
        });
        assert(tableRes.row.id == 12345, "wrong uint64_t");

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('doesnt overwrite data when buckets collide', done => {
    (async() => {
      try {

        await testcontract.testcollide({
          id: 12345,
          value: 12345
        }, {
          authorization: `${code}@active`,
        });
        let shardTable;

        shardTable = await eosvram.getTableRows({
          code: code,
          scope: code,
          table: 'test1',
          json: true,
        });
        let shardUri1 = shardTable.rows[0].shard_uri;
        await testcontract.testcollide({
          id: 123456,
          value: 123456
        }, {
          authorization: `${code}@active`,
        });
        shardTable = await eosvram.getTableRows({
          code: code,
          scope: code,
          table: 'test1',
          json: true,
        });
        let shardUri2 = shardTable.rows[0].shard_uri;
        assert(shardUri1 !== shardUri2, "data didn't get written to same shard");
        await testcontract.testcollide({
          id: 12345,
          value: 12345
        }, {
          authorization: `${code}@active`,
        });
        shardTable = await eosvram.getTableRows({
          code: code,
          scope: code,
          table: 'test1',
          json: true,
        });
        let shardUri3 = shardTable.rows[0].shard_uri;
        assert(shardUri1 !== shardUri3, "data was overwritten");
        done();
      }
      catch (e) {
        done(e);
      }
  it('dapp::multi_index uint64_t Large Primary Key', done => {
    (async() => {
      try {

        await testcontract.testindexa({
          id: 15700377924853090
        }, {
          authorization: `${code}@active`,
        });

        await testcontract.increment({ somenumber: 2 }, {
          authorization: `${code}@active`,
        });

        await testcontract.increment({ somenumber: 10 }, {
          authorization: `${code}@active`,
        });

        var tableRes = await readVRAMData({
          contract: code,
          key: "15700377924853090",
          table: "test",
          scope: code,
          keytype: "number"
        });
        assert(tableRes.row.id == "15700377924853090", "wrong uint64_t");
        tableRes = await readVRAMData({
          contract: code,
          key: "15700377924853091",
          table: "test",
          scope: code,
          keytype: "number"
        });
        assert(tableRes.row.id == "15700377924853091", "wrong uint64_t");
        tableRes = await readVRAMData({
          contract: code,
          key: "15700377924853092",
          table: "test",
          scope: code,
          keytype: "number"
        });
        assert(tableRes.row.id == "15700377924853092", "wrong uint64_t");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
    })();
  });

  it('dapp::multi_index delayed cleanup', done => {
    (async() => {
      try {

        await testcontract.testdelay({
          id: 52343,
          value: 123,
          delay_sec: 15
        }, {
          authorization: `${code}@active`,
        });
        await testcontract.testdelay({
          id: 52343,
          value: 124,
          delay_sec: 15
        }, {
          authorization: `${code}@active`,
        });
        await testcontract.testdelay({
          id: 52343,
          value: 125,
          delay_sec: 5
        }, {
          authorization: `${code}@active`,
        });

        var tableRes = await readVRAMData({
          contract: code,
          key: 52343,
          table: "test",
          scope: code,
          keytype: 'number'
        });
        assert(tableRes.row.sometestnumber == 125, "wrong uint64_t");
        await delaySec(10);
        tableRes = await readVRAMData({
          contract: code,
          key: 52343,
          table: "test",
          scope: code,
          keytype: 'number'
        });
        assert(tableRes.row.sometestnumber == 125, "wrong uint64_t");
        await testcontract.testdelay({
          id: 52343,
          value: 126,
          delay_sec: 2
        }, {
          authorization: `${code}@active`,
        });
        await testcontract.testdelay({
          id: 52343,
          value: 127,
          delay_sec: 1
        }, {
          authorization: `${code}@active`,
        });

        tableRes = await readVRAMData({
          contract: code,
          key: 52343,
          table: "test",
          scope: code,
          keytype: 'number'
        });
        assert(tableRes.row.sometestnumber == 127, "wrong uint64_t");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});