require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const contract = require('truffle-contract');
const { assert } = require('chai'); // Using Assert style
const { getLocalDSPEos, getCreateAccount, getNetwork } = requireBox('seed-eos/tools/eos/utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const delay = ms => new Promise(res => setTimeout(res, ms));

const contractCode = 'ethtokenpeg';
const ctrt = artifacts.require(`./${contractCode}/`);
const eosTokenContract = artifacts.require('./eosio.token/');

const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

describe(`Token bridge Test`, () => {
  // cpp contract, sol contract instances
  const codeEos = 'ethtokenpeg';
  const testAccEos = 'testpegmn';
  const testAccEosHex = 167755678134730;
  const tokenMainnet = 'sometoken';
  let tokenMainnetContract;
  let testAddressEth;
  let tokenpegCpp;
  let dspeos;
  let ethToken, ethTokenpeg;
  const quantity = "2.0000 TKN"
  before(done => {
    (async () => {
      try {
        const accounts = await web3.eth.getAccounts();
        testAddressEth = accounts[5];
        console.log("Sending tokens to: ", testAddressEth);

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
          maximum_supply: "1000000.0000 TKN"
        }, {
            authorization: `${tokenMainnet}@active`,
        });
        await deployedTokenMainnet.contractInstance.issue({
          to: testAccEos,
          quantity: "1000.0000 TKN",
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

        const { token, tokenpeg } = await deployEthContracts();
        ethToken = token;
        ethTokenpeg = tokenpeg;

        // set up bridge contracts
        await tokenpegCpp.init({
          sister_address: ethTokenpeg.address,
          //sister_msig_address: ethMultisig.address,
          sister_msig_address: ethTokenpeg.address, // remove
          sister_chain_name: "123456",
          this_chain_name: "localmainnet",
          processing_enabled: true,
          token_contract: tokenMainnet,
          token_symbol: "4,TKN",
          min_transfer: "10000",
          transfers_enabled: true,
          can_issue: false // true if token is being bridged to this chain, else false
        }, {
          authorization: `${codeEos}@active`
        });
        await tokenpegCpp.enable({
          processing_enabled: true,
          transfers_enabled: true
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
        console.log("First transfer");
        await tokenMainnetContract.transfer({
          from: testAccEos,
          to: codeEos,
          quantity,
          memo: testAddressEth
        }, {
          authorization: `${testAccEos}@active`
        });
        await delay(2000);
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
        await delay(35000);
        const ethBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(ethBalance, "40000");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Refunds to sender when eth address doesn\'t exist', done => {
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
        await delay(35000);
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

  it('Refunds to sender when eos account doesn\'t exist', done => {
    (async () => {
      try {
        const prevBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        await ethTokenpeg.sendToken("10000", 12345, {
          from: testAddressEth
        });
        const midBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(parseInt(prevBalance) - parseInt(midBalance), 30000);
        await delay(35000);
        const postBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(parseInt(postBalance) - parseInt(prevBalance), 0);
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
        await ethTokenpeg.sendToken("10000", testAccEosHex, {
          from: testAddressEth
        });
        await delay(35000);
        res = await dspeos.getTableRows({
          'json': true,
          'scope': testAccEos,
          'code': tokenMainnet,
          'table': 'accounts',
          'limit': 1
        });
        const postEosBalance = parseInt(res.rows[0].balance.split(" ")[0]);
        assert.equal(postEosBalance - prevEosBalance, 1);
        done();
      } catch(e) {
        done(e);
      }
    })()
  });
});

async function deployEthContracts() {
  const tokenpegAbi = JSON.parse(fs.readFileSync(path.resolve('./zeus_boxes/contracts/eth/build/tokenpeg.abi')));
  const tokenpegBin = fs.readFileSync(path.resolve('./zeus_boxes/contracts/eth/build/tokenpeg.bin'), 'utf8');
  const tokenAbi = JSON.parse(fs.readFileSync(path.resolve('./zeus_boxes/test/eth-build/tokenAbi.json')));
  const tokenBin = fs.readFileSync(path.resolve('./zeus_boxes/test/eth-build/token.bin'), 'utf8');
  const availableAccounts = await web3.eth.getAccounts();
  const masterAccount = availableAccounts[0];
  const dsp1 = availableAccounts[2];
  const dsp2 = availableAccounts[3];
  const signers = [dsp1, dsp2];
  const tokenContract = contract({
    abi: tokenAbi,
    unlinked_binary: tokenBin
  });
  const tokenpegContract = contract({
    abi: tokenpegAbi,
    unlinked_binary: tokenpegBin
  });
  tokenContract.setProvider(web3.currentProvider);
  tokenpegContract.setProvider(web3.currentProvider);
  const deployedToken = await tokenContract.new('Test Token', 'TST', '0x0', {
    from: masterAccount,
    gas: '5000000'
  });
  console.log(`Token address: ${deployedToken.address}`);
  const deployedTokenpeg = await tokenpegContract.new(signers, 2, deployedToken.address, {
    from: masterAccount,
    gas: '5000000'
  });
  await deployedToken.transferOwnership(deployedTokenpeg.address, {
    from: masterAccount,
    gas: '5000000'
  });
  await deployedTokenpeg.acceptTokenOwnership({
    from: masterAccount,
    gas: '5000000'
  });
  return { token: deployedToken, tokenpeg: deployedTokenpeg };
}
