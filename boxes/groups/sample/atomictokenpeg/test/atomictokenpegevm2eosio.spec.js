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
const provider = new Web3.providers.WebsocketProvider('ws://localhost:8545');
const web3 = new Web3(provider);

const 
bridge = 'atomictknpez', 
account = 'testpegmn1', 
account64 = "14605625119638831104", 
atomicassets = 'atomicassets',
collection_id = 1;

describe(`Atomic NFT Token bridge Test EVM <> EOSIO`, () => {
  let ethToken, atomictokenpeg, deployedAtomicNft, atomicassetsContract, keys = "", testAddressEth, bridgeContract, dspeos, masterAccountVar,dspSigners,deployedContract;
  before(done => {
    (async () => {
      try {
        const accounts = await web3.eth.getAccounts();
        testAddressEth = accounts[5];

        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        deployedContract = await deployer.deploy(ctrt, bridge);
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

        const { token, tokenpeg, signers, ownerAcc } = await deployEthContracts();
        ethToken = token;
        atomictokenpeg = tokenpeg;
        dspSigners = signers; 
        owner = ownerAcc;   

        // set up bridge contracts
        await bridgeContract.init({
          sister_address: atomictokenpeg.address,
          sister_msig_address: atomictokenpeg.address, // remove
          sister_chain_name: "evmlocal",
          this_chain_name: "localmainnet",
          processing_enabled: true,
          token_contract: atomicassets,
          min_transfer: "10000",
          transfers_enabled: true,
          can_issue: true // true if token is being bridged to this chain, else false
        }, {
          authorization: `${bridge}@active`
        });
        // initialize atomic side
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Transfers ERC721 from EVM to EOSIO', done => {
    (async () => {
      try {
        const author = "authornine";
        const collection_name = "colectionine";
        const schema_name = "schemanine";
        const asset_id = await atomic.returnNextAssetId({dspeos});
        const template_id = await atomic.returnNextTemplateId({dspeos});
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
        await atomic.setupEvmMap({
          bridgeContract,
          bridge,
          collection_name,
          template_id,
          token_address: ethToken.address,
          schema_name,
          collection_id,
          immutable_data: atomic.immutable_data
        })

        await ethToken.mint(testAddressEth, collection_id,{
          from: owner,
          gas: '5000000'
        });
        console.log(`minted: ${(await ethToken.balanceOf(testAddressEth)).toString()}`)
        await ethToken.setApprovalForAll(atomictokenpeg.address, 1,{
          from: testAddressEth,
          gas: '5000000'
        });
        await atomictokenpeg.sendToken(collection_id, account64, ethToken.address, {
          from: testAddressEth,
          gasLimit: '1000000'
        });
        await eosio.delay(80000);
        const ethBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        const ownerOfToken = (await ethToken.ownerOf(collection_id)).toString();
        assert.equal(ethBalance, "0");
        assert.equal(ownerOfToken, atomictokenpeg.address);
        const postTokenpegBalance = await atomic.returnAssetId({
          dspeos,
          owner: account
        });
        assert(postTokenpegBalance == asset_id, "ID should exist");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Auto refund to sender when eth address doesn\'t exist', done => {
    (async () => {
      try {
        const asset_id = await atomic.returnAssetId({dspeos,owner:account});
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
        const postEosBalance = await atomic.returnAssetId({dspeos,owner:account});
        // add 1, burnt and re-minted
        assert(postEosBalance == (Number(asset_id) + 1), "ID should exist because NFT returned");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Transfers ERC721 from EOSIO to EVM', done => {
    (async () => {
      try {
        const asset_id = await atomic.returnAssetId({dspeos,owner:account});
        console.log(asset_id);
        await atomicassetsContract.transfer({
          from: account,
          to: bridge,
          asset_ids: [asset_id],
          memo: `${testAddressEth}`
        }, {
          authorization: [`${account}@active`],
          keyProvider: [keys.active.privateKey]
        });
        // await atomictokenpeg.contract.events.Failure({}, function(error, event){
        //     console.log(error);
        //     console.log(event); 
        // })
        await eosio.delay(10000)
        const postTokenpegBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        console.log(postTokenpegBalance)
        assert(postTokenpegBalance == 1, "NFT should exist");
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
        await ethToken.setApprovalForAll(atomictokenpeg.address, 1,{
          from: testAddressEth,
          gas: '5000000'
        });
        await atomictokenpeg.sendToken(collection_id, 12345, ethToken.address, {
          from: testAddressEth,
          gasLimit: '1000000'
        });
        const midBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(parseInt(prevBalance) - parseInt(midBalance), 1);
        await eosio.delay(130000);
        // failed so refund manually
        await bridgeContract.refund({
          receipt_id: 2147483649
        }, {
          authorization: [`${bridge}@active`]
        });
        await eosio.delay(10000);
        const postBalance = (await ethToken.balanceOf(testAddressEth)).toString();
        assert.equal(parseInt(postBalance) - parseInt(prevBalance), 0);
        const postTokenpegBalance = (await ethToken.balanceOf(atomictokenpeg.address)).toString();
        assert(postTokenpegBalance == 0, "NFT should not exist because NFT burned");
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
  const tokenpegAbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/atomictokenpegevm2eosio.json')));
  const erc721AbiBin = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/atomicnft.json')));
  const availableAccounts = await web3.eth.getAccounts();
  const ownerAcc = availableAccounts[0];
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
  const deployedToken = await nftContract.new("Bridged NFT", "NFT", "QmWx6jv5rQufPu5zbRkC2NADZnaXoBqdiYWDwBqaM3fFnM",{
    from: ownerAcc,
    gas: '5000000'
  });
  const deployedTokenpeg = await tokenpegContract.new(signers, 1, {
    from: ownerAcc,
    gas: '5000000'
  });
  return { token: deployedToken, tokenpeg: deployedTokenpeg, signers, ownerAcc };
}