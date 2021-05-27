require('mocha');
const { assert } = require('chai'); // Using Assert style
const { requireBox } = require('@liquidapps/box-utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getCreateAccount } = requireBox('seed-eos/tools/eos/utils');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const fetch = require('node-fetch');
const Web3 = require('web3');
const contract = require('@truffle/contract');
const fs = require('fs');
const path = require('path');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');

const provider = new Web3.providers.HttpProvider('http://localhost:8546');
const web3 = new Web3(provider);

const contractCode = 'signer';
const ctrt = artifacts.require(`./${contractCode}/`);

let testcontract;
let ethMultiSig;
const code = 'signservice2';
const randomEthAddress = '0xE60dEdC13Ee13D563034dF75Acce5C58CB60ab12';

describe(`Sidechain EVM Sign DAPP Service Test Contract`, () => {
  var endpoint;
  var eosvram;
  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        await genAllocateDAPPTokens(deployedContract, 'sign', 'pprovider1');
        // await genAllocateDAPPTokens(deployedContract, 'sign', 'pprovider2');
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
        eosvram = getEosWrapper(config);
        endpoint = config.httpEndpoint;

        testcontract = await eosvram.contract(code);
        // deploy eth multi sig contract
        ethMultiSig = await deployEthMultiSig();
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('sends 1 wei from the multisig to a selected address', done => {
    (async() => {
      try {
        const prevBalance = (await web3.eth.getBalance(randomEthAddress)).toString();
        const data = getEthMultisigTxData(randomEthAddress, '1'); 
        await sendSigRequest('1', ethMultiSig.address, data, 'evmlocalsidechain', 'ethereum', '0', '1', 1);
        await sleep(2000)
        const postBalance = (await web3.eth.getBalance(randomEthAddress)).toString();
        assert.equal(postBalance - prevBalance, 1, 'eth address balance should be 1');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  })

  it('sends 1 token from the multisig to a selected address', done => {
    (async() => {
      try {
        const token = await deployErc20Token(ethMultiSig.address, 100);
        const prevBalance = (await token.balanceOf(randomEthAddress)).toString();
        await testcontract.sendevm({
          multisig_address: ethMultiSig.address,
          token_address: token.address,
          destination: randomEthAddress,
          amount: 1,
          chain: "evmlocalsidechain"
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        await sleep(2000)
        const postBalance = (await token.balanceOf(randomEthAddress)).toString();
        assert.equal(postBalance - prevBalance, 1, 'eth address balance should be 1');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  })

  it('sends 1 wei from the multisig to a random address (internal encoding)', done => {
    (async() => {
      try {
        const prevBalance = (await web3.eth.getBalance(randomEthAddress)).toString();
        await sendEth(ethMultiSig.address, randomEthAddress, 1, "evmlocalsidechain");
        await sleep(2000)
        const postBalance = (await web3.eth.getBalance(randomEthAddress)).toString();
        assert.equal(postBalance - prevBalance, 1, 'eth address balance should be 1');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  })

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
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function sendEth(multiSigAddress, destination, amount, chain) {
  return testcontract.sendeth({
    multisig_address: multiSigAddress,
    destination,
    amount,
    chain
  }, {
    authorization: `${code}@active`,
    broadcast: true,
    sign: true
  })
}

function sendSigRequest(id, destination, trx_data, chain, chain_type, sigs, account, sigs_required) {
  return testcontract.sendsigreq({
    id,
    destination,
    trx_data,
    chain,
    chain_type,
    sigs,
    account,
    sigs_required
  }, {
    authorization: `${code}@active`,
    broadcast: true,
    sign: true
  })
}


function getEthMultisigTxData(to, value) {
  const multiSigAbi = JSON.parse(fs.readFileSync(path.resolve('./test/eth-build/multisigAbi.json')));

  const multiSigContract = new web3.eth.Contract(multiSigAbi);
  return multiSigContract.methods.submitTransaction(to, value, '0x0').encodeABI();
}

// deploys ERC20 token and issues `amount` of token to `account`
async function deployErc20Token(account, amount){
  const tokenAbi = JSON.parse(fs.readFileSync(path.resolve('./test/eth-build/tokenAbi.json')));
  const tokenBin = fs.readFileSync(path.resolve('./test/eth-build/token.bin'), 'utf8');

  const availableAccounts = await web3.eth.getAccounts();
  const masterAccount = availableAccounts[0];

  const tokenContract = contract({
    abi: tokenAbi,
    unlinked_binary: tokenBin
  });

  tokenContract.setProvider(web3.currentProvider);

  const deployedContract = await tokenContract.new('Test Token', 'TST', '0x0', {
    from: masterAccount,
    gas: '5000000'
  });
  // fund multisig with 100 wei
  await deployedContract.issue(account, amount, {
    from: masterAccount,
    gas: '5000000'
  });
  return deployedContract; 
}

// deploys multisig from accounts[0] with accounts[1] as signer
async function deployEthMultiSig() {
  const multiSigAbi = JSON.parse(fs.readFileSync(path.resolve('./test/eth-build/multisigAbi.json')));
  const multiSigBin = fs.readFileSync(path.resolve('./test/eth-build/multisig.bin'), 'utf8');

  const availableAccounts = await web3.eth.getAccounts();
  const masterAccount = availableAccounts[0];
  const dsp1 = availableAccounts[8];
  // const dsp2 = availableAccounts[9];
  // const dspSigners = [dsp1, dsp2];
  const dspSigners = [dsp1];

  const multiSigContract = contract({
    abi: multiSigAbi,
    unlinked_binary: multiSigBin
  });

  multiSigContract.setProvider(web3.currentProvider);

  const deployedContract = await multiSigContract.new(dspSigners, dspSigners.length, {
    from: masterAccount,
    gas: '5000000'
  });
  // fund multisig with 100 wei
  await web3.eth.sendTransaction({
    from: masterAccount,
    to: deployedContract.address,
    value: '100'
  });
  return deployedContract;
}
