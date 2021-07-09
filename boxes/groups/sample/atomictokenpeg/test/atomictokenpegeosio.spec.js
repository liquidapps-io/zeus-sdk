require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getLocalDSPEos, getCreateAccount, getNetwork } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');

const contractCode = 'atomictokenpegeosio';
const contractCodeX = 'atomictokenpegxeosio';
const ctrt = artifacts.require(`./${contractCode}/`);
const ctrtx = artifacts.require(`./${contractCodeX}/`);
const { eosio,atomic } = requireBox('test-extensions/lib/index');
const nftTokenContract = artifacts.require('./atomicassets/');
const nftTokenAccount = 'atomicasset2';
// const asset_id = 1099511627776;

describe(`Atomic NFT Token bridge Test EOSIO <> EOSIO`, () => {
  let testcontract, testcontractX, keys;
  const tokenpegMainnet = 'nftpegmn';
  const tokenpegSidechain = 'nftpegsc';
  const sidechainName = 'test1';
  // const testAccMainnet = 'nfttestpegmn';
  const testAccMainnet = 'testaccmn';
  const testAccSidechain = 'testaccsc';
  const atomicMainnet = 'atomicassemn';
  const atomicSidechain = 'atomicassesc';
  let dspeos, sidechain;
  let eosconsumerX;
  let eostestMainnet, eostestSidechain;
  let nftTokenMainnetContract, nfttokenSidechainContract, deployedAtomicatomicSidechain, deployedAtomicNft, tokenMainnet;
  before(done => {
    (async () => {
      try {

        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        const deployedContract = await deployer.deploy(ctrt, tokenpegMainnet);
        // deploy token on mainnet
        deployedAtomicNft = await deployer.deploy(nftTokenContract, atomicMainnet);
        // await getCreateAccount(testAccMainnet);
        keys = await getCreateAccount(testAccMainnet);
        const eosTestAcc = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: 'http://localhost:8888'
        });
        nftTokenMainnetContract = await eosTestAcc.contract(atomicMainnet);

        await deployedAtomicNft.contractInstance.init({}, {
            authorization: `${atomicMainnet}@active`,
        });
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider2", "default");
        dspeos = await getLocalDSPEos(tokenpegMainnet);
        testcontract = deployedContract.contractInstance;

        // staking to 2 DSPs for the oracle and cron services for side/sister chain contract
        const sidechains = await loadModels('eosio-chains');
        sidechain = sidechains.find(a => a.name === sidechainName);
        await getCreateAccount(nftTokenAccount);
        await getCreateAccount(nftTokenAccount, null, false, sidechain);
        await getCreateAccount(tokenpegMainnet, null, false);
        await getCreateAccount(tokenpegSidechain, null, false, sidechain);
        const deployedContractX = await deployer.deploy(ctrtx, tokenpegSidechain, null, sidechain);
        testcontractX = deployedContractX.contractInstance;
        // deploy token on sidechain
        deployedAtomicatomicSidechain = await deployer.deploy(nftTokenContract, atomicSidechain, null, sidechain);
        await deployedAtomicatomicSidechain.contractInstance.init({}, {
            authorization: `${atomicSidechain}@active`,
        });
        await genAllocateDAPPTokens({ address: tokenpegMainnet }, 'cron', '', 'default');
        // await genAllocateDAPPTokens({ address: tokenpegMainnet }, 'cron', '', 'foobar');
        await genAllocateDAPPTokens({ address: tokenpegMainnet }, 'ipfs', '', 'default');
        // await genAllocateDAPPTokens({ address: tokenpegMainnet }, 'ipfs', '', 'foobar');
        await genAllocateDAPPTokens({ address: tokenpegMainnet }, 'oracle', '', 'default');
        // await genAllocateDAPPTokens({ address: tokenpegMainnet }, 'oracle', '', 'foobar'); 
        await createLiquidXMapping(sidechain.name, tokenpegMainnet, tokenpegSidechain);

        const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
        if (!mapEntry)
          throw new Error('mapping not found');
        const dappservicex = mapEntry.chain_account;

        // create token
        var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);
        let sidechainKeys = await getCreateKeys(tokenpegSidechain, getDefaultArgs(), false, sidechain);
        const config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId,
          httpEndpoint: `http://localhost:${sidechain.nodeos_port}`,
          keyProvider: sidechainKeys.active.privateKey
        };
        eosconsumerX = getEosWrapper({
          chainId: selectedNetwork.chainId,
          httpEndpoint: `http://localhost:${sidechain.nodeos_port}`,
          keyProvider: sidechainKeys.active.privateKey
        });
        //testcontractX = await eosconsumerX.contract(tokenpegSidechain);

        const dappservicexInstance = await eosconsumerX.contract(dappservicex);
        await dappservicexInstance.adddsp({ owner: tokenpegSidechain, dsp: 'xprovider1' }, {
          authorization: `${tokenpegSidechain}@active`,
        });
        await dappservicexInstance.adddsp({ owner: tokenpegSidechain, dsp: 'xprovider2' }, {
          authorization: `${tokenpegSidechain}@active`,
        });

        // create test account on mainnet and sidechain
        await getCreateAccount(testAccSidechain, null, false, sidechain);

        // create eos objs for test accounts to transfer tokens
        sidechainKeys = await getCreateKeys(testAccSidechain, getDefaultArgs(), false, sidechain);
        eostestSidechain = getEosWrapper({
          keyProvider: sidechainKeys.active.privateKey,
          httpEndpoint: `http://localhost:${sidechain.nodeos_port}`
        });
        nfttokenSidechainContract = await eostestSidechain.contract(atomicSidechain);

        sidechainKeys = await getCreateKeys(testAccMainnet);
        eostestMainnet = getEosWrapper({
          keyProvider: sidechainKeys.active.privateKey,
          httpEndpoint: 'http://localhost:13015'
        });
        tokenMainnet = await eostestMainnet.contract(atomicMainnet);
        // set up bridge contracts
        await testcontract.init({
          sister_code: tokenpegSidechain, // remove
          sister_chain_name: "test1",
          this_chain_name: "localmainnet",
          processing_enabled: true,
          token_contract: atomicMainnet,
          // min_transfer: "10000",
          transfers_enabled: true,
          can_issue: false // true if token is being bridged to this chain, else false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        await testcontractX.init({
          sister_code: tokenpegMainnet, // remove
          sister_chain_name: "localmainnet",
          this_chain_name: "test1",
          processing_enabled: true,
          token_contract: atomicSidechain,
          // min_transfer: "10000",
          transfers_enabled: true,
          can_issue: true // true if token is being bridged to this chain, else false
        }, {
          authorization: `${tokenpegSidechain}@active`
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Atomic NFT Token bridge mainnet to sidechain', done => {
    (async () => {
      try {
        const asset_id = await atomic.createNft(deployedAtomicNft, dspeos, testAccMainnet, true,atomicMainnet,false,tokenpegMainnet);
        await atomic.createNft(deployedAtomicatomicSidechain, eosconsumerX, testAccSidechain, true,atomicSidechain,true,tokenpegSidechain,sidechain);
        const pre_balance = await atomic.returnAssetId(eosconsumerX, testAccSidechain,atomicSidechain);
        const transferMemo = `${testAccSidechain},test1`;
        await nftTokenMainnetContract.transfer({
          from: testAccMainnet,
          to: tokenpegMainnet,
          asset_ids: [asset_id],
          memo: transferMemo
        }, {
          authorization: [`${testAccMainnet}@active`],
          keyProvider: [keys.active.privateKey]
        });
        // await eosio.awaitTable(dspeos,tokenpegMainnet,"parcels",tokenpegMainnet,"response_message",`${message2} pong`,maxDelay);
        await eosio.awaitTable(eosconsumerX,atomicSidechain,"assets",testAccSidechain,"asset_id",asset_id,50000);
        // await eosio.delay(50000);
        const post_balance = await atomic.returnAssetId(eosconsumerX, testAccSidechain,atomicSidechain);
        // console.log(post_balance)
        assert.equal(post_balance - pre_balance,1,"balance did not increase on sidechain");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Atomic NFT Token bridge sidechain to mainnet account doesnt exist', done => {
    (async () => {
      try {
        // const asset_id = await atomic.createNft(deployedAtomicNft, dspeos, testAccMainnet, true,atomicMainnet,false,tokenpegMainnet);
        // const asset_id = await atomic.createNft(deployedAtomicatomicSidechain, eosconsumerX, testAccSidechain, false,atomicSidechain,false,tokenpegSidechain,sidechain);
        const pre_balance = await atomic.returnAssetId(eosconsumerX, testAccSidechain,atomicSidechain);
        // const pre_balance = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet);
        assert.equal(pre_balance,1,"no existing balance");
        // console.log(`pre balance ${pre_balance}`)
        const asset_id = await atomic.returnAssetId(eosconsumerX, testAccSidechain,atomicSidechain,true);
        // console.log(`asset_id ${asset_id}`)
        const transferMemo = `mnacctnoexst,localmainnet`;
        keys = await getCreateAccount(testAccSidechain, null, false, sidechain);
        const preBurnBalance = await atomic.returnAssetId(eosconsumerX, tokenpegSidechain,atomicSidechain);
        await nfttokenSidechainContract.transfer({
          from: testAccSidechain,
          to: tokenpegSidechain,
          asset_ids: [asset_id],
          memo: transferMemo
        }, {
          authorization: [`${testAccSidechain}@active`],
          keyProvider: [keys.active.privateKey]
        });
        const postBurnBalance = await atomic.returnAssetId(eosconsumerX, tokenpegSidechain,atomicSidechain);
        assert.equal(preBurnBalance,postBurnBalance,"no balance should exist, nft burned");
        // console.log(new Date())
        await eosio.awaitTable(eosconsumerX,atomicSidechain,"assets",testAccSidechain,"asset_id",asset_id,240000);
        // console.log(new Date())
        const post_balance = await atomic.returnAssetId(eosconsumerX, testAccSidechain,atomicSidechain);
        // const post_balance = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet);
        // console.log(post_balance)
        const asset_id_after = await atomic.returnAssetId(eosconsumerX, testAccSidechain,atomicSidechain,true);
        // console.log(`asset_id_after ${asset_id_after}`)
        assert.equal(pre_balance,post_balance,"balance changed");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Atomic NFT Token bridge sidechain to mainnet', done => {
    (async () => {
      try {
        // const asset_id = await atomic.createNft(deployedAtomicNft, dspeos, testAccMainnet, true,atomicMainnet,false,tokenpegMainnet);
        // await atomic.createNft(deployedAtomicatomicSidechain, eosconsumerX, testAccSidechain, true,atomicSidechain,true,tokenpegSidechain,sidechain);
        const pre_balance = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet);
        // console.log(`pre balance ${pre_balance}`)
        const asset_id = await atomic.returnAssetId(eosconsumerX, testAccSidechain,atomicSidechain,true);
        // console.log(`asset_id ${asset_id}`)
        const transferMemo = `${testAccMainnet},localmainnet`;
        keys = await getCreateAccount(testAccSidechain, null, false, sidechain);
        const preBurnBalance = await atomic.returnAssetId(eosconsumerX, tokenpegSidechain,atomicSidechain);
        await nfttokenSidechainContract.transfer({
          from: testAccSidechain,
          to: tokenpegSidechain,
          asset_ids: [asset_id],
          memo: transferMemo
        }, {
          authorization: [`${testAccSidechain}@active`],
          keyProvider: [keys.active.privateKey]
        });
        const postBurnBalance = await atomic.returnAssetId(eosconsumerX, tokenpegSidechain,atomicSidechain);
        assert.equal(preBurnBalance,postBurnBalance,"no balance should exist, nft burned");
        // console.log(new Date())
        await eosio.awaitTable(dspeos,atomicMainnet,"assets",testAccMainnet,"asset_id",asset_id,100000);
        // console.log(new Date())
        // await eosio.delay(50000);
        const post_balance = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet);
        // console.log(post_balance)
        assert.equal(post_balance - pre_balance,1,"balance did not increase on mainnet");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Atomic NFT Token bridge mainnet to sidechain account doesnt exist', done => {
    (async () => {
      try {
        // const asset_id = await atomic.createNft(deployedAtomicNft, dspeos, testAccMainnet, false,atomicMainnet,false,tokenpegMainnet);
        // await atomic.createNft(deployedAtomicatomicSidechain, eosconsumerX, testAccSidechain, true,atomicSidechain,true,tokenpegSidechain,sidechain);
        const pre_balance = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet);
        assert.equal(pre_balance,1,"no existing balance");
        // console.log(`pre balance ${pre_balance}`)
        const asset_id = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet,true);
        // console.log(`asset_id ${asset_id}`)
        const transferMemo = `scacctnoexis,test1`;
        keys = await getCreateAccount(testAccMainnet);
        await nftTokenMainnetContract.transfer({
          from: testAccMainnet,
          to: tokenpegMainnet,
          asset_ids: [asset_id],
          memo: transferMemo
        }, {
          authorization: [`${testAccMainnet}@active`],
          keyProvider: [keys.active.privateKey]
        });
        // await eosio.delay(50000);
        // console.log(new Date())
        await eosio.awaitTable(dspeos,atomicMainnet,"assets",testAccMainnet,"asset_id",asset_id,240000);
        // console.log(new Date())
        const post_balance = await atomic.returnAssetId(dspeos, testAccMainnet,atomicMainnet);
        // console.log(post_balance)
        assert.equal(pre_balance,post_balance,"balance changed");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });
  it('Atomic NFT Token bridge mainnet/sidechain stop intervals', done => {
    (async () => {
      try {
        await testcontractX.disable({
          timer: "packbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegSidechain}@active`
        });
        await testcontract.disable({
          timer: "packbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        await testcontractX.disable({
          timer: "getbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegSidechain}@active`
        });
        await testcontract.disable({
          timer: "getbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        await testcontractX.disable({
          timer: "unpkbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegSidechain}@active`
        });
        await testcontract.disable({
          timer: "unpkbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegMainnet}@active`
        });
        await testcontractX.disable({
          timer: "hndlmessage",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${tokenpegSidechain}@active`
        });
        await testcontract.disable({
          timer: "hndlmessage",
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
