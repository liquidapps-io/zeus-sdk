require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getCreateAccount } = requireBox('seed-eos/tools/eos/utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { loadModels } = requireBox('seed-models/tools/models');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');
const Web3 = require('web3');
const contract = require('@truffle/contract');
const fs = require('fs');
const path = require('path');

const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

let testcontract;
let ethMultiSig;
const randomEthAddress = '0xC80fE1df25bBe3837944d87f4349ae8786cce42f';
const sister_code = 'testsign1x';

var contractCode = 'signxtest';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`LiquidX Sidechain Sign Service Test Contract`, () => {
  const mainnet_code = 'testsign1';
  var eosconsumer;
  var sidechainName = 'test1';
  var sidechain;
  before(done => {
    (async () => {
      try {
        var sidechains = await loadModels('eosio-chains');
        sidechain = sidechains.find(a => a.name === sidechainName);
        await getCreateAccount(sister_code, null, false, sidechain);
        await getCreateAccount(mainnet_code, null, false);
        var deployedContract = await deployer.deploy(ctrt, sister_code, null, sidechain);
        await genAllocateDAPPTokens({ address: mainnet_code }, 'sign', '', 'default');
        await createLiquidXMapping(sidechain.name, mainnet_code, sister_code);
        // allowdsps
        const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
        if (!mapEntry)
          throw new Error('mapping not found')
        const dappservicex = mapEntry.chain_account;

        // create token
        var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        if (sister_code) {
          var keys = await getCreateKeys(sister_code, getDefaultArgs(), false, sidechain);
          config.keyProvider = keys.active.privateKey;
        }
        eosconsumer = deployedContract.eos;
        config.httpEndpoint = `http://localhost:${sidechain.dsp_port}`;
        eosconsumer = getEosWrapper(config);

        testcontract = await eosconsumer.contract(sister_code);
        const dappservicexInstance = await eosconsumer.contract(dappservicex);
        try {
          await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider1' }, {
            authorization: `${sister_code}@active`,
          });
          await dappservicexInstance.adddsp({ owner: sister_code, dsp: 'xprovider2' }, {
            authorization: `${sister_code}@active`,
          });
        }
        catch (e) {

        }
        // deploy eth multi sig contract
        // accounts 8/9 from mnemonic 
        const signers = ['0xd2B7C71080a74b44f9518aBC065EF756bA871aCe'];
        ethMultiSig = await deployEthMultiSig(signers);

        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('sends 1 wei from the multisig to a selected address', done => {
    (async() => {
      try {
        const prevBalance = (await web3.eth.getBalance(randomEthAddress)).toString();
        const data = getEthMultisigTxData(randomEthAddress, '1'); 
        await sendSigRequest('1', ethMultiSig.address, data, 'evmlocal', 'ethereum', '0', '1', 1);
        await sleep(2000)
        const postBalance = (await web3.eth.getBalance(randomEthAddress)).toString();
        console.log(`${postBalance} - ${prevBalance}`)
        assert.equal(postBalance - prevBalance, 1, 'eth address balance should be 1');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  })
});


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    authorization: `${sister_code}@active`,
    broadcast: true,
    sign: true
  })
}


function getEthMultisigTxData(to, value) {
  const multiSigAbi = JSON.parse(fs.readFileSync(path.resolve('./test/eth-build/multisigAbi.json')));

  const multiSigContract = new web3.eth.Contract(multiSigAbi);
  return multiSigContract.methods.submitTransaction(to, value, '0x0').encodeABI();
}

// deploys multisig from accounts[0] with accounts[1] as signer
async function deployEthMultiSig(signers, numOfSigners = '1') {
  const multiSigAbi = JSON.parse(fs.readFileSync(path.resolve('./test/eth-build/multisigAbi.json')));
  const multiSigBin = fs.readFileSync(path.resolve('./test/eth-build/multisig.bin'), 'utf8');

  const availableAccounts = await web3.eth.getAccounts();
  const masterAccount = availableAccounts[0];
  const signerAccount = availableAccounts[8];
  if (!signers)
    signers = [signerAccount]

  const multiSigContract = contract({
    abi: multiSigAbi,
    unlinked_binary: multiSigBin
  });

  multiSigContract.setProvider(web3.currentProvider);

  const deployedContract = await multiSigContract.new(signers, numOfSigners, {
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
