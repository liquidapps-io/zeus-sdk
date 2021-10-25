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

const contractCode = 'atomictokenpeg1155';
const ctrt = artifacts.require(`./${contractCode}/`);
const nftTokenContract = artifacts.require('./atomicassets/');

const Web3 = require('web3');
const provider = new Web3.providers.WebsocketProvider('http://localhost:8545');
const web3 = new Web3(provider);

// gotta change for overlap
const 
bridge = 'atomictk1155', 
account = 'testpegmn5', 
account64 = "14605625119638896640", 
atomicassets = 'atomicassets', 
uri = "https://cloudflare-ipfs.com/ipfs/QmSXDsFeNaPa3CJKmn8WKBnA421Zv5r3Ra8n71LZhvEi9s/blocks/1mb.png",
diffuri = "https://cloudflare-ipfs.com/ipfs/QmSXDsFeNaPa3CJKmn8WKBnA421Zv5r3Ra8n71LZhvEi9s/blocks/2mb.png";

describe(`Atomic NFT ERC1155 Token bridge Test EOSIO <> EVM`, () => {
  let ethToken, ethToken2, ethtokenpeg, deployedAtomicNft, atomicassetsContract, keys = "", ethAccount, bridgeContract, dspeos,dspSigners;
  before(done => {
    (async () => {
      try {
        const accounts = await web3.eth.getAccounts();
        ethAccount = accounts[5];

        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        const deployedContract = await deployer.deploy(ctrt, bridge);
        bridgeContract = deployedContract.contractInstance;

        // deploy eos token
        deployedAtomicNft = await deployer.deploy(nftTokenContract, atomicassets);

        keys = await getCreateAccount(account);
        const eosTestAcc = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: 'http://localhost:8888'
        });
        atomicassetsContract = await eosTestAcc.contract(atomicassets);

        await deployedAtomicNft.contractInstance.init({}, {
            authorization: `${atomicassets}@active`,
        });
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "sign", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "sign", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider2", "default");
        dspeos = await getLocalDSPEos(bridge);

        const { token, tokenpeg, signers, token2 } = await deployEthContracts();
        ethToken = token;
        ethToken2 = token2;
        ethtokenpeg = tokenpeg;
        dspSigners = signers;

        // set up bridge contracts
        await bridgeContract.init({
          sister_address: ethtokenpeg.address,
          sister_msig_address: ethtokenpeg.address, // remove
          sister_chain_name: "evmlocal",
          this_chain_name: "localmainnet",
          processing_enabled: true,
          token_contract: atomicassets,
          min_transfer: "10000",
          transfers_enabled: true,
          can_issue: false // true if token is being bridged to this chain, else false
        }, {
          authorization: `${bridge}@active`
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
        const author = "authorthree";
        const collection_name = "colectithree";
        const schema_name = "schemathree";
        const template_id = await atomic.returnNextTemplateId({dspeos});
        const ownerKeys = await getCreateAccount(author);
        await atomic.createcol({
          deployed_contract: deployedAtomicNft,
          author,
          collection_name,
          authorized_account: bridge,
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
            new_asset_owner: account,
            immutable_data: atomic.immutable_data,
        });
        const asset_id = await atomic.returnAssetId({
          dspeos,
          owner: account
        });
        await bridgeContract.regcolection({
          collection_name,
          address: `${ethToken.address}`
        }, {
          authorization: [`${author}@active`],
          keyProvider: [ownerKeys.active.privateKey]
        });
        await bridgeContract.regnft({
          template_id,
          schema_name,
          collection_name,
          immutable_data: atomic.immutable_data,
          uri
        }, {
          authorization: [`${author}@active`],
          keyProvider: [ownerKeys.active.privateKey]
        });
        await atomicassetsContract.transfer({
          from: account,
          to: bridge,
          asset_ids: [asset_id],
          memo: `${ethAccount}`
        }, {
          authorization: [`${account}@active`],
          keyProvider: [keys.active.privateKey]
        });
        await eosio.delay(10000);
        const ethBalance = (await ethToken.balanceOf(ethAccount,asset_id)).toString();
        assert.equal(ethBalance, "1");
        const postTokenpegBalance = await atomic.returnAssetId({
          dspeos,
          owner: bridge
        });
        assert(postTokenpegBalance == asset_id, "ID should exist because NFT not burned");
        assert((await ethToken.uri(asset_id)).toString() == uri, "invalid uri");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Manual refund to sender when eos account doesn\'t exist', done => {
    (async () => {
      try {
        const asset_id = await atomic.returnAssetId({
          dspeos,
          owner: bridge
        });
        const prevBalance = (await ethToken.balanceOf(ethAccount,asset_id)).toString();
        await ethToken.setApprovalForAll(ethtokenpeg.address, 1,{
          from: ethAccount,
          gas: '5000000'
        });
        await ethtokenpeg.sendToken(asset_id, 12345, ethToken.address, {
          from: ethAccount,
          gasLimit: '1000000'
        });
        const midBalance = (await ethToken.balanceOf(ethAccount,asset_id)).toString();
        assert.equal(parseInt(prevBalance) - parseInt(midBalance), 1);
        await eosio.delay(130000);
        await bridgeContract.refund({
          receipt_id: 2147483648
        }, {
          authorization: [`${bridge}@active`]
        });
        await eosio.delay(10000);
        const postBalance = (await ethToken.balanceOf(ethAccount,asset_id)).toString();
        assert.equal(parseInt(postBalance) - parseInt(prevBalance), 0);
        const postTokenpegBalance = (await ethToken.balanceOf(ethtokenpeg.address,asset_id)).toString();
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
        const asset_id = await atomic.returnAssetId({
          dspeos,
          owner:bridge
        });
        await ethToken.setApprovalForAll(ethtokenpeg.address, 1,{
          from: ethAccount,
          gas: '5000000'
        });
        await ethtokenpeg.sendToken(asset_id, account64, ethToken.address, {
          from: ethAccount,
          gasLimit: '10000000'
        });
        await eosio.awaitTable(dspeos,atomicassets,"assets",account,"asset_id",asset_id,200000);
        const postEosBalance = await atomic.returnAssetId({
          dspeos,
          owner:account
        });
        assert.equal(postEosBalance, asset_id, "post balance not 1");
        const postTokenpegBalance = (await ethToken.balanceOf(ethAccount,asset_id)).toString();
        assert(postTokenpegBalance == 0, "NFT should not exist because NFT burned");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Auto refund to sender when eth address doesn\'t exist', done => {
    (async () => {
      try {
        const asset_id = await atomic.returnAssetId({
          dspeos, 
          owner:account
        });
        await atomicassetsContract.transfer({
          from: account,
          to: bridge,
          asset_ids: [asset_id],
          memo: `0x0`
        }, {
          authorization: [`${account}@active`],
          keyProvider: [keys.active.privateKey]
        });
        await eosio.awaitTable(dspeos,atomicassets,"assets",account,"asset_id",asset_id,60000);
        const postEosBalance = await atomic.returnAssetId({
          dspeos,
          owner:account
        });
        assert(postEosBalance == asset_id, "ID should exist because NFT returned");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('register new NFT, try double register, and transfer', done => {
    (async () => {
      try {
        const author = "authorfour";
        const collection_name = "collectifour";
        const schema_name = "schemafour";
        const template_id = await atomic.returnNextTemplateId({dspeos});
        const ownerKeys = await getCreateAccount(author);
        await atomic.createcol({
          deployed_contract: deployedAtomicNft,
          author,
          collection_name,
          authorized_account: bridge,
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
            new_asset_owner: account,
            immutable_data: atomic.immutable_data,
        });
        const asset_id = await atomic.returnAssetId({
          dspeos,
          owner: account,
          last: true
        });
        await bridgeContract.regcolection({
          collection_name,
          address: `${ethToken2.address}`
        }, {
          authorization: [`${author}@active`],
          keyProvider: [ownerKeys.active.privateKey]
        });
        await bridgeContract.regnft({
          template_id,
          schema_name,
          collection_name,
          immutable_data: atomic.immutable_data,
          uri: diffuri
        }, {
          authorization: [`${author}@active`],
          keyProvider: [ownerKeys.active.privateKey]
        });
        let failed = false;
        try {
          await bridgeContract.regcolection({
            collection_name,
            address: `${ethToken2.address}`
          }, {
            authorization: [`${author}@active`],
            keyProvider: [ownerKeys.active.privateKey]
          });
        } catch(e) { failed = true; }
        assert(failed == true,"should have failed");
        failed = false;
        try {
          await bridgeContract.regnft({
            template_id,
            schema_name,
            collection_name,
            immutable_data: atomic.immutable_data,
            uri: diffuri
          }, {
            authorization: [`${author}@active`],
            keyProvider: [ownerKeys.active.privateKey]
          });
        } catch(e) { failed = true; }
        assert(failed == true,"should have failed");
        await atomicassetsContract.transfer({
          from: account,
          to: bridge,
          asset_ids: [asset_id],
          memo: `${ethAccount}`
        }, {
          authorization: [`${account}@active`],
          keyProvider: [keys.active.privateKey]
        });
        await eosio.delay(10000);
        const ethBalance = (await ethToken2.balanceOf(ethAccount,asset_id)).toString();
        assert.equal(ethBalance, "1");
        const postTokenpegBalance = await atomic.returnAssetId({
          dspeos,
          owner: bridge,
          last: true
        });
        assert(postTokenpegBalance == asset_id, "ID should exist because NFT not burned");
        assert((await ethToken2.uri(asset_id)).toString() == diffuri, "invalid uri");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Token peg mainnet/sidechain stop intervals', done => {
    (async () => {
      try {
        await bridgeContract.disable({
          timer: "packbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${bridge}@active`
        });
        await bridgeContract.disable({
          timer: "getbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${bridge}@active`
        });
        await bridgeContract.disable({
          timer: "unpkbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${bridge}@active`
        });
        await bridgeContract.disable({
          timer: "hndlmessage",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${bridge}@active`
        });
        await bridgeContract.disable({
          timer: "pushbatches",
          processing_enabled: false,
          transfers_enabled: false
        }, {
          authorization: `${bridge}@active`
        });
        done();
      } catch(e) {
        done(e);
      }
    })()
  });
});

async function deployEthContracts() {
  const tokenpegAbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/atomictokenpeg1155.json')));
  const erc1155AbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/ERC1155Tradable.json')));
  const bitManipulationAbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/bitManipulation.json')));
  const MockProxyRegistryAbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/MockProxyRegistry.json')));
  const availableAccounts = await web3.eth.getAccounts();
  const owner = availableAccounts[0];
  const dsp1 = availableAccounts[8];
  const dsp2 = availableAccounts[9];
  const proxyForOwner = availableAccounts[5];
  const signers = [dsp1, dsp2];
  const tokenpegContract = contract({
    abi: tokenpegAbiBin['abi'],
    unlinked_binary: tokenpegAbiBin['bytecode']
  });
  const collectionContract = contract({
    abi: erc1155AbiBin['abi'],
    unlinked_binary: erc1155AbiBin['bytecode']
  });
  const bitManipulationContract = contract({
    abi: bitManipulationAbiBin['abi'],
    unlinked_binary: bitManipulationAbiBin['bytecode']
  });
  const MockProxyRegistry = contract({
    abi: MockProxyRegistryAbiBin['abi'],
    unlinked_binary: MockProxyRegistryAbiBin['bytecode']
  });
  collectionContract.setProvider(web3.currentProvider);
  bitManipulationContract.setProvider(web3.currentProvider);
  MockProxyRegistry.setProvider(web3.currentProvider);
  tokenpegContract.setProvider(web3.currentProvider);
  const deployedBitManipulation = await bitManipulationContract.new({
    from: owner,
    gas: '5000000'
  });
  const proxy = await MockProxyRegistry.new({
    from: owner,
    gas: '5000000'
  });
  await proxy.setProxy(owner, proxyForOwner, {
    from: owner,
    gas: '5000000'
  });
  const deployedToken = await collectionContract.new("Atomic Assets Collection", "AAC", uri, proxy.address, {
    from: owner,
    gas: '5000000'
  });
  const deployedToken2 = await collectionContract.new("Atomic Assets Collection2", "AAC2", uri, proxy.address,{
    from: owner,
    gas: '5000000'
  });
  await tokenpegContract.detectNetwork();
  await tokenpegContract.link("bitManipulation", deployedBitManipulation.address);
  const deployedTokenpeg = await tokenpegContract.new(signers, 1, {
    from: owner,
    gas: '5000000'
  });
  await deployedToken.transferOwnership(deployedTokenpeg.address, {
    from: owner,
    gas: '5000000'
  });
  await deployedToken2.transferOwnership(deployedTokenpeg.address, {
    from: owner,
    gas: '5000000'
  });
  return { token: deployedToken, tokenpeg: deployedTokenpeg, signers, token2: deployedToken2 };
}