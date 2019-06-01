import { assert } from 'chai';
import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { eosDSPGateway } = require('../services/dapp-services-node/common');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const { getCreateAccount, getCreateKeys } = require('../extensions/tools/eos/utils');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var args = getDefaultArgs();

const fetch = require('node-fetch');

function postData(url = ``, data = {}) {
  // Default options are marked with *
  return fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, cors, *same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        // "Content-Type": "application/json",
        // "Content-Type": "application/x-www-form-urlencoded",
      },
      redirect: 'follow', // manual, *follow, error
      referrer: 'no-referrer', // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    })
    .then(response => response.json()); // parses response to JSON
}

const contractCode = 'airdrop';
var contractArtifact = artifacts.require(`./${contractCode}/`);
var tokenContract = artifacts.require(`./Token/`);
describe(`${contractCode} Contract`, () => {
  var airdropContractName = "airdrop1";
  const issuerUser = 'testuseri';
  const testuser1 = 'testuser1';
  const testuser2 = 'testuser2';
  const testuser3 = 'testuser3';
  const testuser4 = 'testuser4';
  var endpoint = 'http://localhost:13015';

  const invokeReadFn = ({
    method,
    payload
  }) => {
    return postData(`${endpoint}/v1/dsp/readfndspsvc/read`, {
      contract_code: airdropContractName,
      method,
      payload
    });
  };

  before(done => {
    (async() => {
      try {
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  const createAirdrop = async({ airdropContractName, token_contract, issuer = issuerUser, symbol = "TST", amount = "100000.0000", memo = "" }) => {
    var deployedAirdropContract = await deployer.deploy(contractArtifact, airdropContractName);
    await genAllocateDAPPTokens(deployedAirdropContract, "readfn");
    await genAllocateDAPPTokens(deployedAirdropContract, "oracle");


    var deployedToken = await deployer.deploy(tokenContract, token_contract);
    var airdropkey = await getCreateKeys(airdropContractName);
    var tokenkey = await getCreateKeys(token_contract);
    var issuerkey = await getCreateAccount(issuer, args);

    // create token
    await deployedToken.contractInstance.create({
      issuer,
      maximum_supply: `${amount} ${symbol}`
    }, {
      authorization: `${token_contract}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [tokenkey.privateKey]
    });
    // create dataset?

    // init airdrop
    await deployedAirdropContract.contractInstance.init({
      issuer,
      token_contract,
      token_symbol: "4,TST",
      url_prefix: "https://airdrop-snapshot-testset.s3.amazonaws.com/",
      memo: "test airdrop"
    }, {
      authorization: `${airdropContractName}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [airdropkey.privateKey]
    });

    // issue to airdrop
    await deployedToken.contractInstance.issue({
      to: airdropContractName,
      quantity: `${amount} ${symbol}`,
      memo: "airdrop supply"
    }, {
      authorization: `${issuer}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [issuerkey.privateKey]
    });
    return { deployedAirdropContract, deployedToken };
  }
  const grab = async({ airdropContractName, token_contract, owner }) => {
    var key = await getCreateAccount(owner);

    var contract = await eosDSPGateway.contract(airdropContractName);
    return await contract.grab({
      owner,
      token_contract
    }, {
      authorization: `${owner}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [key.privateKey]
    });
  }
  const open = async({ token_contract, owner }) => {
    var key = await getCreateAccount(owner);
    var contract = await eosDSPGateway.contract(token_contract);
    var res = await contract.open({
      owner,
      symbol: "4,TST",
      ram_payer: owner
    }, {
      authorization: `${owner}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [key.privateKey]
    });
    return res;
  }
  const issueairdrop = async({ airdropContractName, issuer = issuerUser, owner, token_contract, quantity, memo }) => {
    var key = await getCreateAccount(issuer);
    var contract = await eosDSPGateway.contract(airdropContractName);
    return await contract.issueairdrop({
      owner,
      token_contract,
      quantity,
      memo
    }, {
      authorization: `${issuer}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [key.privateKey]
    });
  }
  const cleanup = async({ airdropContractName, owner, token_contract }) => {
    var key = await getCreateKeys(airdropContractName);
    var contract = await eosDSPGateway.contract(airdropContractName);
    return await contract.cleanup({
      owner,
      token_contract
    }, {
      authorization: `${airdropContractName}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [key.privateKey]
    });
  }
  it('readamount', done => {
    (async() => {
      try {
        var token_contract = "tsttkn1";
        await getCreateAccount(testuser1);
        await createAirdrop({ airdropContractName, token_contract });
        var res = await invokeReadFn({ method: 'readamount', payload: { account: testuser1, token_contract } })
        assert.equal(res.result, "1000000", 'expected result for readamount');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('grab', done => {
    (async() => {
      try {
        var token_contract = "tsttkn2";
        var { deployedToken } = await createAirdrop({ airdropContractName, token_contract });
        // grab
        await open({ token_contract, owner: testuser2 });
        await grab({ airdropContractName, token_contract, owner: testuser2 });

        // read balance
        let table = await deployedToken.eos.getTableRows({
          code: token_contract,
          scope: testuser2,
          table: 'accounts',
          json: true,
        });
        let balance = table.rows[0].balance.replace(' TST', '');

        assert.equal(balance, "200.0000", 'wrong balance');


        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('issueairdrop', done => {
    (async() => {
      try {
        var token_contract = "tsttkn5";
        await getCreateAccount(testuser1);
        await createAirdrop({ airdropContractName, token_contract });
        await issueairdrop({ airdropContractName, owner: testuser1, token_contract, quantity: "1.0000 TST", memo: "airdrop notification test" });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('double grab', done => {
    (async() => {
      try {
        var token_contract = "tsttkn3";
        var { deployedToken } = await createAirdrop({ airdropContractName, token_contract });
        // grab
        await open({ token_contract, owner: testuser3 });
        await grab({ airdropContractName, token_contract, owner: testuser3 });
        var failed = false;
        try {
          // grab again, should fail
          await grab({ airdropContractName, token_contract, owner: testuser3 });
        }
        catch (e) {
          assert.equal(e.indexOf("already claimed") !== -1, true, 'should fail for "already claimed"');
          failed = true;
        }
        assert.equal(failed, true, 'should fail');

        let table = await deployedToken.eos.getTableRows({
          code: token_contract,
          scope: testuser3,
          table: 'accounts',
          json: true,
        });
        let balance = table.rows[0].balance.replace(' TST', '');

        assert.equal(balance, "300.0000", 'wrong balance');


        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('cleanup', done => {
    (async() => {
      try {
        // create airdrop
        // grab
        var token_contract = "tsttkn4";
        var { deployedToken, deployedAirdropContract } = await createAirdrop({ airdropContractName, token_contract });
        // grab
        await open({ token_contract, owner: testuser4 });
        await grab({ airdropContractName, token_contract, owner: testuser4 });

        // clean (by calling init again with an empty dataset)
        var airdropkey = await getCreateKeys(airdropContractName);
        await deployedAirdropContract.contractInstance.init({
          issuer: issuerUser,
          token_contract,
          token_symbol: "4,TST",
          url_prefix: "https://airdrop-snapshot-testset.s3.amazonaws.com/empty/",
          memo: "test airdrop"
        }, {
          authorization: `${airdropContractName}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [airdropkey.privateKey]
        });

        let table = await deployedToken.eos.getTableRows({
          code: token_contract,
          scope: testuser4,
          table: 'accounts',
          json: true,
        });
        let balance = table.rows[0].balance.replace(' TST', '');

        assert.equal(balance, "400.0000", 'wrong balance');
        // call cleanup
        await cleanup({ airdropContractName, token_contract, owner: testuser4 });
        // grab
        var failed = false;
        try {
          // grab again, should fail
          await grab({ airdropContractName, token_contract, owner: testuser4 });
        }
        catch (e) {
          assert.equal(e.indexOf("already claimed") !== -1, true, 'should fail for "already claimed"');
          failed = true;
        }
        assert.equal(failed, true, 'should fail');

        table = await deployedToken.eos.getTableRows({
          code: token_contract,
          scope: testuser4,
          table: 'accounts',
          json: true,
        });
        balance = table.rows[0].balance.replace(' TST', '');

        assert.equal(balance, "400.0000", 'wrong balance');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
