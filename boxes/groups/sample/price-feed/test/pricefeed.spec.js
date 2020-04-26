require('mocha');
const { assert } = require('chai'); // Using Assert style
const { getTestContract, getLocalDSPEos } = require('../extensions/tools/eos/utils');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');
const delay = ms => new Promise(res => setTimeout(res, ms));

// setup nodeos RPC
const fetch = require('node-fetch'); 
const { JsonRpc } = require('eosjs');
const rpc = new JsonRpc('http://127.0.0.1:8888', { fetch });

const contractCode = 'pricefeed';
const ctrt = artifacts.require(`./${contractCode}/`);
describe(`Price Feed Test`, () => {
  let testcontract;
  const code = 'test1';
  let dspeos;
  before(done => {
    (async() => {
      try {
        const deployedContract = await deployer.deploy(ctrt, code);
        // staking to 2 DSPs for the oracle and cron services
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        dspeos = await getLocalDSPEos(code);

        testcontract = await getTestContract(code);
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
        await testcontract.testfeed({
            uri: Buffer.from(`https+json://USD/min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD&api_key=d5a24f9e55abec981ac9ee4c76b04a2f27d18024a1415df80fa00a794f48dcab`, 'utf8'),
            interval: intervalTime // cron interval
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await delay(intervalTime * 1000);
        const interval = await setInterval(async () => {
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
          } catch(e) {
            console.log(e);
          }
        }, intervalTime * 1000);
        await delay((intervalTime * 1000 * 10) + 1000);
        clearInterval(interval);
        // stop interval
        await testcontract.stopstart({
          stopstart_bool: false
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
