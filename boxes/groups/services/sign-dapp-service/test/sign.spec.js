import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork, getCreateAccount } = require('../extensions/tools/eos/utils');
const Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const fetch = require('node-fetch');
const Web3 = require('web3');
const contract = require('truffle-contract');
const fs = require('fs');
const path = require('path');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

const dspUrl = 'http://localhost:13128';
const contractCode = 'signer';
const ctrt = artifacts.require(`./${contractCode}/`);

describe(`Sign DAPP Service Test Contract`, () => {
  var testcontract;
  var testcontracta;
  const code = 'signservice1';
  var endpoint;
  var eosvram;
  before(done => {
    (async() => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);

        await genAllocateDAPPTokens(deployedContract, 'sign');
        // create token
        var selectedNetwork = getNetwork(getDefaultArgs());
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        if (code) {
          var keys = await getCreateKeys(code);
          config.keyProvider = keys.active.privateKey;
        }
        eosvram = deployedContract.eos;
        config.httpEndpoint = 'http://localhost:13015';
        eosvram = new Eos(config);
        endpoint = config.httpEndpoint;

        testcontract = await eosvram.contract(code);


        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('deploys multisig', done => {
    (async() => {
      try {
        const multiSigContract = await deployEthMultiSig();
        console.log('address', multiSigContract.address);
        // generate keys
        // sign 
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  })

  it.skip('sign call - single sig', done => {
    (async() => {
      try {
        // generate keys
        // sign 
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it.skip('sign call - multi sig', done => {
    (async() => {
      try {
        // generate keys
        // sign 
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it.skip('sign call - single sig - post', done => {
    (async() => {
      try {
        // generate keys
        // sign and post
        // use ibc to verify
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it.skip('sign call - multi sig  - post', done => {
    (async() => {
      try {
        // generate keys
        // sign and post
        // use ibc to verify
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

});

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
    .then(async response => {
      var text = await response.text();
      var json = JSON.parse(text);
      if (json.error)
        throw new Error(json.error);
      return json;
    }); // parses response to JSON
}

// deploys multisig from accounts[0] with accounts[1] as signer
async function deployEthMultiSig() {
  const multiSigAbi = JSON.parse(fs.readFileSync(path.resolve('./test/eth-build/multisigAbi.json')));
  const multiSigBin = fs.readFileSync(path.resolve('./test/eth-build/multisig.bin'), 'utf8');

  const availableAccounts = await web3.eth.getAccounts();
  const masterAccount = availableAccounts[0];
  const signerAccount = availableAccounts[1];

  const multiSigContract = contract({
    abi: multiSigAbi,
    unlinked_binary: multiSigBin
  });

  multiSigContract.setProvider(web3.currentProvider);

  const deployedContract = await multiSigContract.new([signerAccount], '1', {
    from: masterAccount,
    gas: '5000000'
  });
  return deployedContract; 
}

async function createDspKey(chain, chain_type, account) {
  const dspPublicKey = await postData(`${dspUrl}/v1/dsp/genkey`, { chain, chain_type, account });
  // fund the new account?
  if (chain == 'ethereum') {
    let fundingAccount = (await web3.eth.getAccounts())[1];
    let fundingAmount = '1000000000000000000'; // 1 ETH
    await web3.eth.sendTransaction({
      from: fundingAccount,
      to: dspPublicKey,
      value: fundingAmount
    });
  }
}