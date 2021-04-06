require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getTestContract, getLocalDSPEos } = requireBox('seed-eos/tools/eos/utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { awaitTable, getTable, delay } = requireBox('seed-tests/lib/index');

// setup nodeos RPC
const fetch = require('node-fetch');
const { JsonRpc } = require('eosjs');
const rpc = new JsonRpc('http://127.0.0.1:8888', { fetch });

const contractCode = 'pricefeed';
const ctrt = artifacts.require(`./${contractCode}/`);

const fetchCpuUtilization = async (code, dspeos, cpuUsed, timesCalled = 0) => {
  let res = await dspeos.getTableRows({
    'json': true,
    'scope': code,
    'code': code,
    'table': 'prevprice',
    'limit': 1
  });
  console.log(`prevprice: ${JSON.stringify(res.rows)}`)
  if(res.rows[0]) {
    console.log(`prevprice: ${res.rows[0].last_price}`)
  }
  try {
    let cpu = await rpc.get_account(code);
    console.log(`CPU used: ${cpu.cpu_limit.used}`);
    if(timesCalled != 0) assert(cpuUsed == cpu.cpu_limit.used, 'CPU increased, could be due to price change');
    return cpu.cpu_limit.used;
  } catch(e) {
    throw(e);
  }
}

describe(`Price Feed Test`, () => {
  let testcontract, testcontract2;
  const code = 'test1';
  const code2 = 'test2';
  let dspeos;
  let intervals = 5;
  let cpuUsed = 0;
  let timesRun = 0;
  before(done => {
    (async () => {
      try {
        const deployedContract = await deployer.deploy(ctrt, code);
        const deployedContract2 = await deployer.deploy(ctrt, code2);
        // staking to 2 DSPs for the oracle and cron services
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract2, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract2, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract2, "cron", "pprovider1", "default");
        dspeos = await getLocalDSPEos(code);

        testcontract = await getTestContract(code);
        testcontract2 = await getTestContract(code2);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Oracle Price Feed Fetch Bitcoin', done => {
    (async() => {
      try {
        let prevPrice = 0;
        // setting threshold for how many DSPs must respond in order to accept oracle responses
        await testcontract.settings({
          new_threshold_val: 2, // min number of DSPs that need to be heard from
          upper_bound_filter: 1, // defaults 1 percentage of upper difference for asserting deviation compared to last price
          lower_bound_filter: 1, // defaults 1 percentage of lower difference for asserting deviation compared to last price
          upper_bound_dsp: 1, // defaults 1 percentage of upper difference for asserting DSP deviation in response
          lower_bound_dsp: 1 // defaults 1 percentage of lower difference for asserting DSP deviation in response
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        const intervalTime = 5;
        // using cron to call oracle price feed every 1 second
        const interval = await setInterval(async () => {
          await testcontract.testfetch({
              uri: Buffer.from(`https+json://USD/min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD&api_key=d5a24f9e55abec981ac9ee4c76b04a2f27d18024a1415df80fa00a794f48dcab`, 'utf8')
          }, {
            authorization: `${code}@active`,
            broadcast: true,
            sign: true
          });
          cpuUsed = await fetchCpuUtilization(code, dspeos, cpuUsed, timesRun);
          timesRun += 1;
        }, intervalTime * 1000);
        await delay((intervalTime * 1000 * intervals) + 1000);
        clearInterval(interval);
        let newPrice = await dspeos.getTableRows({
          'json': true,
          'scope': code,
          'code': code,
          'table': 'prevprice',
          'limit': 1
        });
        if(!newPrice.rows.length) newPrice = 0;
        if(newPrice.rows[0]) newPrice = newPrice.rows[0].last_price;
        assert(prevPrice != newPrice, 'new price should exist');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Oracle Price Feed Bitcoin', done => {
    (async() => {
      try {
        let prevPrice = 0;
        // setting threshold for how many DSPs must respond in order to accept oracle responses
        await testcontract2.settings({
          new_threshold_val: 2, // min number of DSPs that need to be heard from
          upper_bound_filter: 1, // defaults 1 percentage of upper difference for asserting deviation compared to last price
          lower_bound_filter: 1, // defaults 1 percentage of lower difference for asserting deviation compared to last price
          upper_bound_dsp: 1, // defaults 1 percentage of upper difference for asserting DSP deviation in response
          lower_bound_dsp: 1 // defaults 1 percentage of lower difference for asserting DSP deviation in response
        }, {
          authorization: `${code2}@active`,
          broadcast: true,
          sign: true
        });
        const intervalTime = 5;
        // using cron to call oracle price feed every 1 second
        await testcontract2.testfeed({
            uri: Buffer.from(`https+json://USD/min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD&api_key=d5a24f9e55abec981ac9ee4c76b04a2f27d18024a1415df80fa00a794f48dcab`, 'utf8'),
            interval: intervalTime // cron interval
        }, {
          authorization: `${code2}@active`,
          broadcast: true,
          sign: true
        });
        await delay(intervalTime * 1000);
        timesRun = 0;
        const interval = await setInterval(async () => {
          cpuUsed = await fetchCpuUtilization(code2, dspeos, cpuUsed, timesRun);
          timesRun += 1;
        }, intervalTime * 1000);
        await delay((intervalTime * 1000 * intervals) + 1000);
        clearInterval(interval);
        // stop interval
        await testcontract2.stopstart({
          stopstart_bool: false
        }, {
          authorization: `${code2}@active`,
          broadcast: true,
          sign: true
        });
        let newPrice = await dspeos.getTableRows({
          'json': true,
          'scope': code2,
          'code': code2,
          'table': 'prevprice',
          'limit': 1
        });
        if(!newPrice.rows.length) newPrice = 0;
        if(newPrice.rows[0]) newPrice = newPrice.rows[0].last_price;
        assert(prevPrice != newPrice, 'new price should exist');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
