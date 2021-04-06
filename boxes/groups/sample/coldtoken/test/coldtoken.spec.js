require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getTestContract } = requireBox('seed-eos/tools/eos/utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = requireBox('dapp-services/tools/eos/dapp-services');

var contractCode = 'coldtoken';
var ctrt = artifacts.require(`./${contractCode}/`);
const { awaitTable, getTable, delay } = requireBox('seed-tests/lib/index');

const { parseTable } = requireBox('ipfs-dapp-service/utils/ipfs-service/get-table');

describe(`${contractCode} Contract`, () => {
  var testcontract;
  const code = 'airairairair';
  const code2 = 'airairairai2';
  var testUser = "tt11";
  var testUser2 = "tt12";

  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await deployer.deploy(ctrt, code2);
        await deployer.deploy(ctrt, testUser);
        await deployer.deploy(ctrt, testUser2);
        await genAllocateDAPPTokens(deployedContract, 'ipfs');
        testcontract = await getTestContract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('should increase the balance of receiver and decrease of the sender', done => {
    (async () => {
      try {
        var symbol = 'AIRZ';
        // create token
        await testcontract.create({
          issuer: code,
          maximum_supply: `1000000000.0000 ${symbol}`
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        var testtoken = testcontract;
        await testtoken.issue({
          to: code,
          quantity: `1000.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        txRes = await testtoken.transfer({
          from: code,
          to: code2,
          quantity: `500.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        const tableRes1 = await readVRAMData({
          contract: code,
          key: symbol,
          table: "accounts",
          scope: code,
          keytype: 'symbol'
        });
        const tableRes2 = await readVRAMData({
          contract: code,
          key: symbol,
          table: "accounts",
          scope: code2,
          keytype: 'symbol'
        });
        await delay(2000);
        assert(tableRes1.row.balance == `500.0000 ${symbol}`, "wrong sender balance");
        assert(tableRes2.row.balance == `500.0000 ${symbol}`, "wrong receiver balance");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('shouldn\'t be able to transfer more than the balance', done => {
    (async () => {
      try {
        var symbol = 'AIR';
        var failed = false;
        // create token
        await testcontract.create({
          issuer: code,
          maximum_supply: `1000000000.0000 ${symbol}`
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });

        var testtoken = testcontract;
        txRes = await testtoken.issue({
          to: code,
          quantity: `1000.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        try {
          await testtoken.transfer({
            from: code,
            to: code2,
            quantity: `1000.0003 ${symbol}`,
            memo: ''
          }, {
            authorization: `${code}@active`,
            broadcast: true,
            sign: true
          });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed big transfer');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('issue and read', done => {
    (async () => {
      try {
        var symbol = 'AIRU';

        // create token
        await testcontract.create({
          issuer: code,
          maximum_supply: `1000000000.0000 ${symbol}`
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await delay(9000);
        var testtoken = testcontract;
        txRes = await testtoken.issue({
          to: testUser,
          quantity: `1000.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await delay(2000);
        var tableRes = await readVRAMData({
          contract: code,
          key: symbol,
          table: "accounts",
          scope: testUser,
          keytype: 'symbol'
        });
        assert(tableRes.row.balance == `1000.0000 ${symbol}`, "wrong balance");
        await testtoken.issue({
          to: testUser,
          quantity: `1000.0000 ${symbol}`,
          memo: ''
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await delay(2000);
        tableRes = await readVRAMData({
          contract: code,
          key: symbol,
          table: "accounts",
          scope: testUser,
          keytype: 'symbol'
        });
        assert(tableRes.row.balance == `2000.0000 ${symbol}`, "wrong balance");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Table can be parsed', done => {
    (async () => {
      try {
        const contractName = 'airairairair';
        const tableName = 'accounts';
        const dspEndpoint = 'http://localhost:13015';
        const table = await parseTable(contractName, tableName, dspEndpoint);
        const balanceEntry = table.find(entry => (entry.scope === 'airairairair' && entry.key === '4149525a00000000'));
        assert(balanceEntry.data.balance === '500.0000 AIRZ', 'airairairair balance of AIRZ not as expected');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  })
});
