
const { requireBox } = require('@liquidapps/box-utils');
require('mocha');
const { assert } = require('chai'); // Using Assert style
const { getTestContract, getEos } = requireBox('seed-eos/tools/eos/utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, dappServicesContract } = requireBox('dapp-services/tools/eos/dapp-services');

const contractCode = 'oracleconsumer';
const ctrt = artifacts.require(`./${contractCode}/`);
describe(`Web Oracle Service Test`, () => {
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
  it('Oracle HTTPS Get', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from("https://ipfs.io/ipfs/Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a", 'utf8'),
          expectedfield: Buffer.from("Hello from IPFS Gateway Checker\n"),
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
  it('Oracle HTTPS Get Prefix', done => {
    (async () => {
      try {
        // suffix: "Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a"
        var res = await testcontract.testget({
          uri: Buffer.from("https://ipfs", 'utf8'),
          expectedfield: Buffer.from("Hello from IPFS Gateway Checker\n"),
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
  it('Oracle HTTPS+JSON Get', done => {
    (async () => {
      try {
        var res = await testcontract.testget({
          uri: Buffer.from("https+json://name/api.github.com/users/tmuskal", 'utf8'),
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
  it('Oracle HTTPS+POST+JSON', done => {
    (async () => {
      try {
        const body = Buffer.from('{"block_num_or_id":"36568000"}').toString('base64')
        const res = await testcontract.testget({
          uri: Buffer.from(`https+post+json://timestamp/${body}/mainnet.eosn.io:443/v1/chain/get_block`, 'utf8'),
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
  it('Oracle Multiple oracle requests in a transaction', done => {
    (async () => {
      try {
        var res = await testcontract.testmult({
          uri_one: Buffer.from("https+json://name/api.github.com/users/tmuskal", 'utf8'),
          uri_two: Buffer.from("https://ipfs.io/ipfs/Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a", 'utf8')
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
  it('Oracle minimum threshold check', done => {
    (async () => {
      try {
        // set threshold to expected amount of DSPs to return values, 2
        await testcontract.setthreshold({
          new_threshold_val: 2
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        // perform testget to ensure no failure with threshold of 2
        await testcontract.testget({
          uri: Buffer.from("https://ipfs.io/ipfs/Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a", 'utf8'),
          expectedfield: Buffer.from("Hello from IPFS Gateway Checker\n"),
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        // set threshold to 3 which is greater than expected DSP responses of 2
        await testcontract.setthreshold({
          new_threshold_val: 3
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        // ensure testget fails due to min threshold of DSP responses not being met
        let failed = false;
        try {
          await testcontract.testget({
            uri: Buffer.from("https://ipfs.io/ipfs/Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a", 'utf8'),
            expectedfield: Buffer.from("Hello from IPFS Gateway Checker\n"),
          }, {
            authorization: `${code}@active`,
            broadcast: true,
            sign: true
          });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed, only staked to 2 DSPs and threshold is set to 3');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Oracle Test Package DSP API Down/Null', done => {
    (async () => {
      const provider = 'pprovider2';
      const service = 'oracleservic';
      const package_id = 'foobar';
      try {
        // set threshold to 1
        await testcontract.setthreshold({
          new_threshold_val: 1
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        var eos = await getEos(provider)
        let servicesTokenContract = await eos.contract(dappServicesContract);
        // modify other dsp endpoint to non existent endpoint
        await servicesTokenContract.modifypkg({
          provider,
          api_endpoint: `http://localhost:99999`,
          package_json_uri: '',
          service,
          package_id
        }, {
          authorization: `${provider}@active`,
        });
        const body = Buffer.from('{"block_num_or_id":"36568000"}').toString('base64')
        let res = await testcontract.testget({
          uri: Buffer.from(`https+post+json://timestamp/${body}/mainnet.eosn.io:443/v1/chain/get_block`, 'utf8'),
          expectedfield: Buffer.from('2019-01-09T18:20:23.000', 'utf8'),
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        // modify other dsp endpoint to null
        await servicesTokenContract.modifypkg({
          provider,
          api_endpoint: `null`,
          package_json_uri: 'null',
          service,
          package_id
        }, {
          authorization: `${provider}@active`,
        });
        res = await testcontract.testget({
          uri: Buffer.from(`https+post+json://timestamp/${body}/mainnet.eosn.io:443/v1/chain/get_block`, 'utf8'),
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
