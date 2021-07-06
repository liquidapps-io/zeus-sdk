require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const contract = require('@truffle/contract');
const { assert } = require('chai'); // Using Assert style
const { getLocalDSPEos, getCreateAccount, getNetwork } = requireBox('seed-eos/tools/eos/utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { eosio } = requireBox('test-extensions/lib/index');

const contractCode = 'binancetokenpeg';
const ctrt = artifacts.require(`./${contractCode}/`);
const eosTokenContract = artifacts.require('./eosio.token/');
// use --multi-evm flag
const provider = new Web3.providers.HttpProvider('http://localhost:8546');
const web3 = new Web3(provider);

describe(`Binance Smart Chain EOSIO <> EVM Token bridge Test`, () => {
  // cpp contract, sol contract instances
  const codeEos = 'bsctokenpeg';
  const testAccEos = 'testpegmn2';
  const testAccEosUint64 = "14605625119638847488";
  const tokenMainnet = 'sometoken';
  let tokenMainnetContract;
  let testAddressEth;
  let tokenpegCpp;
  let dspeos;
  let ethToken, binanceTokenpeg, dspSigners;
  const quantity = "2.0000 DAPP"
  before(done => {
    (async () => {
      try {
        const accounts = await web3.eth.getAccounts();
        testAddressEth = accounts[5];
        // console.log("Sending tokens to: ", testAddressEth);

        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        const deployedContract = await deployer.deploy(ctrt, codeEos);
        tokenpegCpp = deployedContract.contractInstance;

        // deploy eos token
        const deployedTokenMainnet = await deployer.deploy(eosTokenContract, tokenMainnet);

        const keys = await getCreateAccount(testAccEos);
        const eosTestAcc = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: 'http://localhost:8888'
        });
        tokenMainnetContract = await eosTestAcc.contract(tokenMainnet);

        await deployedTokenMainnet.contractInstance.create({
          issuer: tokenMainnet,
          maximum_supply: "1000000.0000 DAPP"
        }, {
            authorization: `${tokenMainnet}@active`,
        });
        await deployedTokenMainnet.contractInstance.issue({
          to: tokenMainnet,
          quantity: "1000.0000 DAPP",
          memo: ""
        }, {
            authorization: `${tokenMainnet}@active`,
        });
        await deployedTokenMainnet.contractInstance.transfer({
          from: tokenMainnet,
          to: testAccEos,
          quantity: "1000.0000 DAPP",
          memo: ""
        }, {
            authorization: `${tokenMainnet}@active`,
        });

        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "sign", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "sign", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider2", "default");
        dspeos = await getLocalDSPEos(codeEos);

        const { token, tokenpeg, signers } = await deployEthContracts();
        ethToken = token;
        binanceTokenpeg = tokenpeg;
        dspSigners = signers;    

        // set up bridge contracts
        await tokenpegCpp.init({
          sister_address: binanceTokenpeg.address,
          //sister_msig_address: ethMultisig.address,
          sister_msig_address: binanceTokenpeg.address, // remove
          sister_chain_name: "evmlocalsidechain",
          this_chain_name: "localmainnet",
          processing_enabled: true,
          token_contract: tokenMainnet,
          token_symbol: "4,DAPP",
          min_transfer: "10000",
          transfers_enabled: true,
          can_issue: false // true if token is being bridged to this chain, else false
        }, {
          authorization: `${codeEos}@active`
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Transfers tokens from eos to eth', done => {
    (async () => {
      try {
        await dspeos.getTableRows({
          'json': true,
          'scope': testAccEos,
          'code': tokenMainnet,
          'table': 'accounts',
          'limit': 1
        });
        // console.log("First transfer");
        await tokenMainnetContract.transfer({
          from: testAccEos,
          to: codeEos,
          quantity,
          memo: testAddressEth
        }, {
          authorization: `${testAccEos}@active`
        });
        await eosio.delay(2000);
        await tokenMainnetContract.transfer({ 
          from: testAccEos,
          to: codeEos,
          quantity,
          memo: testAddressEth
        }, {
          authorization: `${testAccEos}@active`
        });
        await dspeos.getTableRows({
          'json': true,
          'scope': testAccEos,
          'code': tokenMainnet,
          'table': 'accounts',
          'limit': 1
        });
        await eosio.delay(50000);
        const ethBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(ethBalance, "40000");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Auto refund to sender when eth address doesn\'t exist', done => {
    (async () => {
      try {
        let res;
        res = await dspeos.getTableRows({
          'json': true,
          'scope': testAccEos,
          'code': tokenMainnet,
          'table': 'accounts',
          'limit': 1
        });
        const prevEosBalance = parseInt(res.rows[0].balance.split(" ")[0]);
        await tokenMainnetContract.transfer({
          from: testAccEos,
          to: codeEos,
          quantity,
          memo: "0x0" // address doesn't exist, gotta make sure deserialization works tho
        }, {
          authorization: `${testAccEos}@active`
        });
        res = await dspeos.getTableRows({
          'json': true,
          'scope': testAccEos,
          'code': tokenMainnet,
          'table': 'accounts',
          'limit': 1
        });
        const midEosBalance = parseInt(res.rows[0].balance.split(" ")[0]);
        assert.equal(prevEosBalance - midEosBalance, 2);
        await eosio.delay(50000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': testAccEos,
          'code': tokenMainnet,
          'table': 'accounts',
          'limit': 1
        });
        const postEosBalance = parseInt(res.rows[0].balance.split(" ")[0]);
        assert.equal(postEosBalance - prevEosBalance, 0);
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Manual refund to sender when eos account doesn\'t exist', done => {
    (async () => {
      try {
        const prevBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        await binanceTokenpeg.sendToken("10000", 12345, {
          from: testAddressEth,
          gasLimit: '1000000'
        });
        const midBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(parseInt(prevBalance) - parseInt(midBalance), 10000);
        await eosio.delay(120000);
        // failed so refund manually
        await tokenpegCpp.refund({
          receipt_id: 2147483648
        }, {
          authorization: [`${codeEos}@active`]
        });
        await eosio.delay(15000);
        // await binanceTokenpeg.mintToken("10000", testAddressEth,{
        //   from: dspSigners[0],
        //   gas: '5000000'
        // });
        const postBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(parseInt(postBalance) - parseInt(prevBalance), 0);
        const postTokenpegBalance = (await ethToken.balanceOf(binanceTokenpeg.address)).toString();
        assert(postTokenpegBalance == 0, "Token should not exist because burned");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('transfers token from eth to eos', done => {
    (async () => {
      try {
        let res;
        res = await dspeos.getTableRows({
          'json': true,
          'scope': testAccEos,
          'code': tokenMainnet,
          'table': 'accounts',
          'limit': 1
        });
        const prevEosBalance = parseInt(res.rows[0].balance.split(" ")[0]);
        await binanceTokenpeg.sendToken("10000", testAccEosUint64, {
          from: testAddressEth,
          gasLimit: '1000000'
        });
        await eosio.delay(120000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': testAccEos,
          'code': tokenMainnet,
          'table': 'accounts',
          'limit': 1
        });
        const postEosBalance = parseInt(res.rows[0].balance.split(" ")[0]);
        assert.equal(postEosBalance - prevEosBalance, 1);
        const postTokenpegBalance = (await ethToken.balanceOf(binanceTokenpeg.address)).toString();
        assert(postTokenpegBalance == 0, "Token should not exist because burned");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Token peg mainnet/sidechain stop intervals', done => {
    (async () => {
      try {
        await tokenpegCpp.disable({
          timer: "packbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${codeEos}@active`
        });
        await tokenpegCpp.disable({
          timer: "getbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${codeEos}@active`
        });
        await tokenpegCpp.disable({
          timer: "unpkbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${codeEos}@active`
        });
        await tokenpegCpp.disable({
          timer: "hndlmessage",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${codeEos}@active`
        });
        await tokenpegCpp.disable({
          timer: "pushbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${codeEos}@active`
        });
        done();
      } catch(e) {
        done(e);
      }
    })()
  });
});

async function deployEthContracts() {
  const bep20TokenAbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/BEP20TokenImplementation.json')));
  const tokenpegAbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/binancetokenpeg.json')));
  const availableAccounts = await web3.eth.getAccounts();
  const masterAccount = availableAccounts[0];
  const dsp1 = availableAccounts[8];
  const dsp2 = availableAccounts[9];
  const tokenAccount = availableAccounts[4];
  const tokenpegAccount = availableAccounts[5];
  const signers = [dsp1, dsp2];
  const tokenContract = contract({
    abi: bep20TokenAbiBin['abi'],
    unlinked_binary: bep20TokenAbiBin['bytecode']
  });
  const tokenpegContract = contract({
    abi: tokenpegAbiBin['abi'],
    unlinked_binary: tokenpegAbiBin['bytecode']
  });
  tokenContract.setProvider(web3.currentProvider);
  tokenpegContract.setProvider(web3.currentProvider);
  const deployedToken = await tokenContract.new({
    from: tokenAccount,
    gas: '5000000'
  });
  await deployedToken.initialize('Bridge Me Please', 'DAPP', 4,1000000000000,1,tokenAccount,{
    from: tokenAccount,
    gas: '5000000'
  });
  const deployedTokenpeg = await tokenpegContract.new(signers, 2, deployedToken.address, {
    from: tokenpegAccount,
    gas: '5000000'
  });
  await deployedToken.transferOwnership(tokenpegAccount, {
    from: tokenAccount,
    gas: '5000000'
  });
  console.log(`erc20 token address ${deployedToken.address}`)
  console.log(`binancetokenpeg contract address ${deployedTokenpeg.address}`)
  return { token: deployedToken, tokenpeg: deployedTokenpeg, signers };
}
