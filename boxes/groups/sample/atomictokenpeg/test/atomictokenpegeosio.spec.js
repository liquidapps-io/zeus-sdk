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
const testNftAuthor = 'testpegmnown';

describe(`Atomic NFT Token bridge Test EOSIO <> EOSIO`, () => {
  let testcontract, testcontractX, keys;
  const tokenpegMainnet = 'nftpegmn';
  const tokenpegSidechain = 'nftpegsc';
  const sidechainName = 'test1';
  const testAccMainnet = 'testaccmn';
  const testAccSidechain = 'testaccsc';
  const atomicMainnet = 'atomicassets';
  const atomicSidechain = 'atomicassets';
  let dspeos, sidechain;
  let sent_asset_id;
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
        const author = "authorsixmn";
        const author_sidechain = "authorsixsc";
        const collection_name = "colectionsix";
        const schema_name = "schemasix";
        const template_id = await atomic.returnNextTemplateId({dspeos});
        const ownerKeys = await getCreateAccount(author);
        await atomic.createcol({
          deployed_contract: deployedAtomicNft,
          author,
          collection_name,
          authorized_account: tokenpegMainnet,
        });
        await atomic.createschema({
          deployed_contract: deployedAtomicNft,
          authorized_creator: author,
          collection_name,
          schema_name,
          schema_format: atomic.schema_format
        });
        await atomic.createtempl({
          deployed_contract: deployedAtomicNft,
          authorized_creator: author,
          collection_name,
          schema_name,
          immutable_data: atomic.immutable_data
        });
        await atomic.mintasset({
            deployed_contract: deployedAtomicNft,
            authorized_minter: author,
            collection_name,
            schema_name,
            template_id,
            new_asset_owner: testAccMainnet,
            immutable_data: atomic.immutable_data,
        });
        sent_asset_id = await atomic.returnAssetId({
          dspeos,
          owner: testAccMainnet
        });

        // register sidechain map post creation
        const template_id_sidechain = await atomic.returnNextTemplateId({dspeos: eosconsumerX});
        const diff_collection_name = "diffcollnm33";
        const diff_schema_name = "diffschemanm";
        await testcontract.regmapping({
          collection_name,
          schema_name,
          template_id,
          collection_name_mapping: diff_collection_name,
          schema_name_mapping: diff_schema_name,
          template_id_mapping: template_id_sidechain,
          immutable_data: atomic.immutable_data,
        }, {
          authorization: [`${author}@active`],
          keyProvider: [ownerKeys.active.privateKey]
        });

        const ownerKeysSidechain = await getCreateAccount(author_sidechain, null, false, sidechain);
        await atomic.createcol({
          deployed_contract: deployedAtomicatomicSidechain,
          author: author_sidechain,
          collection_name: diff_collection_name,
          authorized_account: tokenpegSidechain,
          sidechain
        });
        await atomic.createschema({
          deployed_contract: deployedAtomicatomicSidechain,
          authorized_creator: author_sidechain,
          collection_name: diff_collection_name,
          schema_name: diff_schema_name,
          schema_format: atomic.schema_format,
          sidechain
        });
        await atomic.createtempl({
          deployed_contract: deployedAtomicatomicSidechain,
          authorized_creator: author_sidechain,
          collection_name: diff_collection_name,
          schema_name: diff_schema_name,
          immutable_data: atomic.immutable_data,
          sidechain
        });

        // register mainnet map post creation
        await testcontractX.regmapping({
          collection_name: diff_collection_name,
          schema_name: diff_schema_name,
          template_id: template_id_sidechain,
          collection_name_mapping: collection_name,
          schema_name_mapping: schema_name,
          template_id_mapping: template_id,
          immutable_data: atomic.immutable_data
        }, {
          authorization: [`${author_sidechain}@active`],
          keyProvider: [ownerKeysSidechain.active.privateKey]
        });

        const transferMemo = `${testAccSidechain},test1`;
        const next_asset_id = await atomic.returnNextAssetId({
          dspeos: eosconsumerX
        })
        await nftTokenMainnetContract.transfer({
          from: testAccMainnet,
          to: tokenpegMainnet,
          asset_ids: [sent_asset_id],
          memo: transferMemo
        }, {
          authorization: [`${testAccMainnet}@active`],
          keyProvider: [keys.active.privateKey]
        });
        await eosio.awaitTable(eosconsumerX,atomicSidechain,"assets",testAccSidechain,"asset_id",next_asset_id,150000);
        const post_balance = await atomic.returnAssetId({
          dspeos: eosconsumerX,
          owner:testAccSidechain
        });
        assert.equal(post_balance,next_asset_id,"balance did not increase on sidechain");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Atomic NFT Token bridge sidechain to mainnet account doesnt exist', done => {
    (async () => {
      try {
        const asset_id = await atomic.returnAssetId({
          dspeos:eosconsumerX,
          owner: testAccSidechain
        });
        const transferMemo = `mnacctnoexst,localmainnet`;
        keys = await getCreateAccount(testAccSidechain, null, false, sidechain);
        await nfttokenSidechainContract.transfer({
          from: testAccSidechain,
          to: tokenpegSidechain,
          asset_ids: [asset_id],
          memo: transferMemo
        }, {
          authorization: [`${testAccSidechain}@active`],
          keyProvider: [keys.active.privateKey]
        });
        await eosio.awaitTable(eosconsumerX,atomicSidechain,"assets",testAccSidechain,"asset_id",asset_id,240000);
        const post_balance = await atomic.returnAssetId({dspeos:eosconsumerX,owner:testAccSidechain});
        assert(post_balance == ((Number(asset_id) + 1)),"balance changed");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Atomic NFT Token bridge sidechain to mainnet', done => {
    (async () => {
      try {
        const asset_id = await atomic.returnAssetId({
          dspeos: eosconsumerX,
          owner: testAccSidechain
        });
        const transferMemo = `${testAccMainnet},localmainnet`;
        keys = await getCreateAccount(testAccSidechain, null, false, sidechain);
        await nfttokenSidechainContract.transfer({
          from: testAccSidechain,
          to: tokenpegSidechain,
          asset_ids: [asset_id],
          memo: transferMemo
        }, {
          authorization: [`${testAccSidechain}@active`],
          keyProvider: [keys.active.privateKey]
        });
        await eosio.awaitTable(dspeos,atomicMainnet,"assets",testAccMainnet,"asset_id",asset_id,100000);
        const post_balance = await atomic.returnAssetId({
          dspeos,
          owner: testAccMainnet
        });
        assert(post_balance  == sent_asset_id,"token not returned on mainnet");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Atomic NFT Token bridge mainnet to sidechain account doesnt exist', done => {
    (async () => {
      try {
        const asset_id = await atomic.returnAssetId({
          dspeos,
          owner: testAccMainnet
        });
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
        await eosio.awaitTable(dspeos,atomicMainnet,"assets",testAccMainnet,"asset_id",asset_id,240000);
        const post_balance = await atomic.returnAssetId({
          dspeos,
          owner: testAccMainnet
        });
        assert.equal(post_balance,asset_id,"balance changed");
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
