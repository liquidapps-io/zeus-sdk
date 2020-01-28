require('mocha');


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
  var testcontract, testcontract2;
  const code = 'test1ipfs';
  const code2 = 'tstbakcomp';
  var eosvram;
  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        var deployedContract2 = await deployer.deploy(ctrt, code2);
        await genAllocateDAPPTokens(deployedContract, 'ipfs');
        await genAllocateDAPPTokens(deployedContract2, 'ipfs', '', 'default', null, false);
        // create token
        var selectedNetwork = getNetwork(getDefaultArgs());
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId,
          httpEndpoint: 'http://localhost:13015'
        };

        var keysTest1 = await getCreateKeys(code);
        config.keyProvider = keysTest1.active.privateKey;
        eosvram = getEosWrapper(config);
        testcontract = await eosvram.contract(code);

        var keysTest2 = await getCreateKeys(code2);
        config.keyProvider = keysTest2.active.privateKey;
        eosvram = getEosWrapper(config);
        testcontract2 = await eosvram.contract(code2);

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('IPFS Write', done => {
    (async () => {
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
    (async () => {
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
    (async () => {
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

        assert.equal(next_key, '000000000000000000000000000000000000000000000000000000000000022c', 'wrong key');


        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('dapp::multi_index Resize Should Fail', done => {
    (async () => {
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
    (async () => {
      try {
        await testcontract.testindexa({
          id: 12345
        }, {
          authorization: `${code}@active`,
        });

        await testcontract.testfind({
          id: 12345
        }, {
          authorization: `${code}@active`,
        });

        await testcontract.testfind({
          id: 0
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

        tableRes = await readVRAMData({
          contract: code,
          key: 0,
          table: "test",
          scope: code,
          keytype: 'number'
        });
        assert(tableRes.row.id == 0, "wrong uint64_t");

        done();
      }
      catch (e) {
        console.log(JSON.stringify(e.json));
        done(e);
      }
    })();
  });

  it('dapp::multi_index uint128_t Primary Key', done => {
    (async () => {
      try {

        let res = await testcontract.testmed({
          id: 12345,
          value: 45678
        }, {
          authorization: `${code}@active`,
        });

        res = await testcontract.checkmed({
          id: 12345,
          value: 45678
        }, {
          authorization: `${code}@active`,
        });

        var tableRes = await readVRAMData({
          contract: code,
          key: 12345,
          table: "test3",
          scope: code,
          keytype: 'number',
          keysize: 128
        });
        assert(tableRes.row.id == 12345, "wrong uint128_t");

        done();
      }
      catch (e) {
        console.log(JSON.stringify(e.json));
        done(e);
      }
    })();
  });

  it('dapp::multi_index checksum256 Primary Key', done => {
    (async () => {
      try {

        let res = await testcontract.testbig({
          id: '0000000000000000000000000000000000000000000000000000000000003039',
          value: 45678
        }, {
          authorization: `${code}@active`,
        });

        res = await testcontract.checkbig({
          id: '0000000000000000000000000000000000000000000000000000000000003039',
          value: 45678
        }, {
          authorization: `${code}@active`,
        });

        var tableRes = await readVRAMData({
          contract: code,
          key: '0000000000000000000000000000000000000000000000000000000000003039',
          table: "test2",
          scope: code,
          keytype: 'hex',
          keysize: 256
        });
        assert(tableRes.row.id == '0000000000000000000000000000000000000000000000000000000000003039', "wrong checksum256");

        done();
      }
      catch (e) {
        console.log(JSON.stringify(e.json));
        done(e);
      }
    })();
  });

  it('dapp::multi_index checksum256 Get Available Key', done => {
    (async () => {
      try {

        let res = await testcontract.testbig({
          id: '00000000000000000000000000000000ffffffffffffffffffffffffffffffff',
          value: 45678
        }, {
          authorization: `${code}@active`,
        });

        let table = await eosvram.getTableRows({
          code: code,
          scope: 'test2',
          table: '.vconfig',
          json: true,
        });
        let next_key = table.rows[0].next_available_key;
        assert.equal(next_key, '0000000000000000000000000000000100000000000000000000000000000000', 'wrong key');

        done();
      }
      catch (e) {
        console.log(JSON.stringify(e.json));
        done(e);
      }
    })();
  });

  it('doesnt overwrite data when buckets collide', done => {
    (async () => {
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
        (async () => {
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
    (async () => {
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

  it.skip('Cleanup', done => {
    (async () => {
      try {
        await delaySec(20);
        await testcontract.verfempty({
          id: 52343,
          value: 123,
          delay_sec: 2
        }, {
          authorization: `${code}@active`,
        });
        done();
      }
      catch (e) {
        done(e)
      }
    })();
  });

  var backup = {};

  it.skip('IPFS Save Manifest', done => {
    (async () => {
      try {
        //backup = await generateBackup(code,"test");            
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('IPFS Clear', done => {
    (async () => {
      try {

        let failed = false;

        await testcontract.testfind({
          id: 20
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        await testcontract.testclear({}, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        try {
          await testcontract.testfind({
            id: 20
          }, {
            authorization: `${code}@active`,
            broadcast: true,
            sign: true
          });
        } catch (e) {
          failed = true;
        }

        assert(failed, 'should have failed');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it.skip('IPFS Load Manifest', done => {
    (async () => {
      try {
        // let shardbuckets = pastbuckets.map((data) => {
        //   return {
        //     key: data.shard,
        //     value: data.shard_uri
        //   }
        // })

        // let manifest = {
        //   next_available_key: 556,
        //   shards: 1024,
        //   buckets_per_shard: 64,
        //   shardbuckets
        // }
        let manifest = backup.manifest;
        let failed = false;

        try {
          await testcontract.testfind({
            id: 20
          }, {
            authorization: `${code}@active`,
            broadcast: true,
            sign: true
          });
        } catch (e) {
          failed = true;
        }

        assert(failed, 'should have failed');

        await testcontract.testman({
          man: manifest
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        await testcontract.testfind({
          id: 20
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('IPFS without custom dsp permissions (backwards compatibility)', done => {
    (async () => {
      try {
        // now this needs to be warmed up
        await testcontract2.testget({
          uri: 'ipfs://zb2rhnyodRMHNeY4iaSVXzVhtFmYdWxsvddrhzhWZFUMiZdrd',
          expectedfield: 123
        }, {
          authorization: `${code2}@active`,
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
