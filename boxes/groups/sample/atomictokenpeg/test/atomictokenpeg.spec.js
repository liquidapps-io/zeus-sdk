require('mocha');
const { requireBox } = require('@liquidapps/box-utils');

const fs = require('fs');
const path = require('path');
const contract = require('@truffle/contract');
const { assert } = require('chai'); // Using Assert style
const { getLocalDSPEos, getCreateAccount, getNetwork } = requireBox('seed-eos/tools/eos/utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { eosio,atomic } = requireBox('test-extensions/lib/index');

const contractCode = 'atomictokenpeg';
const ctrt = artifacts.require(`./${contractCode}/`);
const nftTokenContract = artifacts.require('./atomicassets/');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

const 
tokenpegMainnet = 'atomictknpeg', 
testAccMainnet = 'testpegmn', 
testAccMainnetUint64 = "14605625119638814720", 
atomicMainnet = 'atomicassets', 
tokenId = 1099511627776;

const logBatch = async (dspeos,atomictokenpeg) => {
  const settings = await eosio.parseTable(dspeos,tokenpegMainnet,tokenpegMainnet,'settings')
  const batch = await atomictokenpeg.getBatch(settings.next_inbound_batch_id-1);
  console.log(JSON.stringify(batch))
  console.log(settings.next_inbound_batch_id)
  // return batch
}

describe(`Atomic NFT Token bridge Test EOSIO <> EVM`, () => {
  let ethToken, atomictokenpeg, deployedAtomicNft, atomicMainnetContract, keys = "", testAddressEth, tokenpegCpp, dspeos, masterAccountVar,dspSigners;
  before(done => {
    (async () => {
      try {
        const accounts = await web3.eth.getAccounts();
        testAddressEth = accounts[5];
        console.log("Sending tokens to: ", testAddressEth);

        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        const deployedContract = await deployer.deploy(ctrt, tokenpegMainnet);
        tokenpegCpp = deployedContract.contractInstance;

        // deploy eos token
        deployedAtomicNft = await deployer.deploy(nftTokenContract, atomicMainnet);

        keys = await getCreateAccount(testAccMainnet);
        const eosTestAcc = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: 'http://localhost:8888'
        });
        atomicMainnetContract = await eosTestAcc.contract(atomicMainnet);

        await deployedAtomicNft.contractInstance.init({}, {
            authorization: `${atomicMainnet}@active`,
        });
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "sign", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "sign", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider2", "default");
        dspeos = await getLocalDSPEos(tokenpegMainnet);

        const { token, tokenpeg, signers } = await deployEthContracts();
        ethToken = token;
        atomictokenpeg = tokenpeg;
        dspSigners = signers;        

        // set up bridge contracts
        await tokenpegCpp.init({
          sister_address: atomictokenpeg.address,
          //sister_msig_address: ethMultisig.address,
          sister_msig_address: atomictokenpeg.address, // remove
          sister_chain_name: "evmlocal",
          this_chain_name: "localmainnet",
          processing_enabled: true,
          token_contract: atomicMainnet,
          // token_symbol: "4,TKN",
          min_transfer: "10000",
          transfers_enabled: true,
          can_issue: false // true if token is being bridged to this chain, else false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Transfers nft from eos to eth', done => {
    (async () => {
      try {
        const asset_id = await atomic.createNft(deployedAtomicNft, dspeos, testAccMainnet,true,atomicMainnet,false,tokenpegMainnet);
        // const asset_id = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet,true);
        await atomicMainnetContract.transfer({
          from: testAccMainnet,
          to: tokenpegMainnet,
          asset_ids: [asset_id],
          memo: testAddressEth
        }, {
          authorization: [`${testAccMainnet}@active`],
          keyProvider: [keys.active.privateKey]
        });
        await eosio.delay(10000);
        const ethBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        const ownerOfToken = (await ethToken.ownerOf(asset_id)).toString();
        assert.equal(ethBalance, "1");
        assert.equal(ownerOfToken == testAddressEth, "1");
        const postTokenpegBalance = await atomic.returnAssetId(dspeos,tokenpegMainnet,atomicMainnet);
        assert(postTokenpegBalance == 1, "ID should exist because NFT not burned");
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
        console.log(prevBalance)
        await ethToken.setApprovalForAll(atomictokenpeg.address, 1,{
          from: testAddressEth,
          gas: '5000000'
        });
        await atomictokenpeg.sendToken(tokenId, 12345, {
          from: testAddressEth,
          gasLimit: '1000000'
        });
        const midBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(parseInt(prevBalance) - parseInt(midBalance), 1);
        await eosio.delay(130000);
        // failed so refund manually
        await tokenpegCpp.refund({
          receipt_id: 2147483648
        }, {
          authorization: [`${tokenpegMainnet}@active`]
        });
        await eosio.delay(5000);
        // await atomictokenpeg.mintToken(tokenId, testAddressEth,{
        //   from: dspSigners[0],
        //   gas: '5000000'
        // });
        const postBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        console.log(postBalance)
        assert.equal(parseInt(postBalance) - parseInt(prevBalance), 0);
        const postTokenpegBalance = (await ethToken.balanceOf(atomictokenpeg.address)).toString();
        assert(postTokenpegBalance == 0, "NFT should not exist because NFT burned");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('transfers nft from eth to eos', done => {
    (async () => {
      try {
        const prevEosBalance = await atomic.returnAssetId(dspeos,testAccMainnet,atomicMainnet);
        await ethToken.approve(atomictokenpeg.address, tokenId,{
          from: testAddressEth,
          gas: '5000000'
        });
        await atomictokenpeg.sendToken(tokenId, testAccMainnetUint64, {
          from: testAddressEth,
          gasLimit: '1000000'
        });
        const asset_id = await atomic.returnAssetId(dspeos, tokenpegMainnet,atomicMainnet,true);
        console.log(asset_id)
        await eosio.awaitTable(dspeos,atomicMainnet,"assets",testAccMainnet,"asset_id",asset_id,200000);
        const postEosBalance = await atomic.returnAssetId(dspeos,testAccMainnet,atomicMainnet);
        assert.equal(postEosBalance, prevEosBalance + 1, "post balance not 0");
        const postTokenpegBalance = (await ethToken.balanceOf(atomictokenpeg.address)).toString();
        assert(postTokenpegBalance == 0, "NFT should not exist because NFT burned");
        // awaiting receipt
        // await eosio.delay(300000);
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Auto refund to sender when eth address doesn\'t exist', done => {
    (async () => {
      try {
        // create another
        // const asset_id = await atomic.createNft(deployedAtomicNft, dspeos, testAccMainnet,false,atomicMainnet,true,tokenpegMainnet);
        // create
        // const asset_id = await atomic.createNft(deployedAtomicNft, dspeos, testAccMainnet,true,atomicMainnet,false,tokenpegMainnet);
        // no create
        const asset_id = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet,true);
        console.log(asset_id);
        // should be 1
        const prevEosBalance = await atomic.returnAssetId(dspeos,testAccMainnet,atomicMainnet);
        assert(prevEosBalance !=0, "ID should exist");
        // await logBatch(dspeos,atomictokenpeg);
        await atomicMainnetContract.transfer({
          from: testAccMainnet,
          to: tokenpegMainnet,
          asset_ids: [asset_id],
          memo: "0x0"
        }, {
          authorization: [`${testAccMainnet}@active`],
          keyProvider: [keys.active.privateKey]
        });
        // await logBatch(dspeos,atomictokenpeg);
        const midEosBalance = await atomic.returnAssetId(dspeos,testAccMainnet,atomicMainnet);
        // assert(midEosBalance ==0, "ID should not exist");
        // await eosio.delay(70000);
        console.log(new Date())
        await eosio.awaitTable(dspeos,atomicMainnet,"assets",testAccMainnet,"asset_id",asset_id,60000);
        // await logBatch(dspeos,atomictokenpeg);
        console.log(new Date())
        const postEosBalance = await atomic.returnAssetId(dspeos,testAccMainnet,atomicMainnet);
        console.log(postEosBalance)
        assert(postEosBalance == 1, "ID should exist because NFT returned");
        // const postTokenpegBalance = await atomic.returnAssetId(dspeos,tokenpegMainnet,atomicMainnet);
        // console.log(postTokenpegBalance)
        // assert(postTokenpegBalance == 0, "ID should not exist because NFT burned");
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
          authorization: `${tokenpegMainnet}@active`
        });
        await tokenpegCpp.disable({
          timer: "getbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        await tokenpegCpp.disable({
          timer: "unpkbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        await tokenpegCpp.disable({
          timer: "hndlmessage",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        await tokenpegCpp.disable({
          timer: "pushbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        done();
      } catch(e) {
        done(e);
      }
    })()
  });
});

async function deployEthContracts() {
  const tokenpegAbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/atomictokenpeg.json')));
  const erc721AbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/atomicnft.json')));
  const availableAccounts = await web3.eth.getAccounts();
  const masterAccount = availableAccounts[0];
  const dsp1 = availableAccounts[8];
  const dsp2 = availableAccounts[9];
  const signers = [dsp1, dsp2];
  const tokenpegContract = contract({
    abi: tokenpegAbiBin['abi'],
    unlinked_binary: tokenpegAbiBin['bytecode']
  });
  const nftContract = contract({
    abi: erc721AbiBin['abi'],
    unlinked_binary: erc721AbiBin['bytecode']
  });
  nftContract.setProvider(web3.currentProvider);
  tokenpegContract.setProvider(web3.currentProvider);
  const deployedToken = await nftContract.new("Atomic NFTs", "NFT", "",{
    from: masterAccount,
    gas: '5000000'
  });
  // console.log(`Token address: ${deployedToken.address}`);
  const deployedTokenpeg = await tokenpegContract.new(signers, 1, deployedToken.address, {
    from: masterAccount,
    gas: '5000000'
  });
  await deployedToken.transferOwnership(deployedTokenpeg.address, {
    from: masterAccount,
    gas: '5000000'
  });
  // await deployedTokenpeg.acceptTokenOwnership({
  //   from: masterAccount,
  //   gas: '5000000'
  // });
  console.log(`erc721 token address ${deployedToken.address}`)
  console.log(`atomictokenpeg contract address ${deployedTokenpeg.address}`)
  return { token: deployedToken, tokenpeg: deployedTokenpeg, signers };
}
