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
const { eosio } = requireBox('test-extensions/lib/index');

const contractCode = 'sanftpeg';
const contractCodeX = 'sanftpegx';
const ctrt = artifacts.require(`./${contractCode}/`);
const ctrtx = artifacts.require(`./${contractCodeX}/`);
const tokenContract = artifacts.require('./simpleassets/');
const rejectContract = artifacts.require('./sareject/');

describe(`Simple Assets Token bridge Test EOSIO <> EOSIO`, () => {
  let testcontract, testcontractX;
  const codeXMainnet = 'sanftpeg';
  const codeXSidechain = 'sanftpegx';
  const sidechainName = 'test1';
  const testAccMainnet = 'sanftusr';
  const testAccSidechain = 'sanftusrx';
  const tokenAccMainnet = 'simpleassets';
  const tokenAccSidechain = 'simpleassets';
  let dspeos, sidechain;
  let eosconsumerX;
  let eostestMainnet, eostestSidechain;
  let tokenMainnet, tokenSidechain;
  let tokenPegMainnet, testcontractAcc;
  before(done => {
    (async () => {
      try {
        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        const deployedContract = await deployer.deploy(ctrt, codeXMainnet);
        // deploy NFT contract on mainnet
        const deployedTokenMainnet = await deployer.deploy(tokenContract, tokenAccMainnet); 
        const deployedRejector = await deployer.deploy(rejectContract, testAccMainnet);
          
        // setup DAPP for mainnet bridge
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        dspeos = await getLocalDSPEos(codeXMainnet);
        testcontract = deployedContract.contractInstance;

        // staking to 2 DSPs for the oracle and cron services for side/sister chain contract
        const sidechains = await loadModels('eosio-chains');
        sidechain = sidechains.find(a => a.name === sidechainName);
        await getCreateAccount(codeXMainnet, null, false);
        await getCreateAccount(codeXSidechain, null, false, sidechain);
        const deployedContractX = await deployer.deploy(ctrtx, codeXSidechain, null, sidechain);
        testcontractX = deployedContractX.contractInstance;
        // deploy NFT contract on sidechain
        const deployedTokenSidechain = await deployer.deploy(tokenContract, tokenAccSidechain, null, sidechain);

        await genAllocateDAPPTokens({ address: codeXMainnet }, 'cron', '', 'default');
        await genAllocateDAPPTokens({ address: codeXMainnet }, 'ipfs', '', 'default');
        await genAllocateDAPPTokens({ address: codeXMainnet }, 'oracle', '', 'default');
        await createLiquidXMapping(sidechain.name, codeXMainnet, codeXSidechain);

        const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
        if (!mapEntry)
          throw new Error('mapping not found');
        const dappservicex = mapEntry.chain_account;

        // create token
        var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);
        let keys = await getCreateKeys(codeXSidechain, getDefaultArgs(), false, sidechain);
        const config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId,
          httpEndpoint: `http://localhost:${sidechain.nodeos_port}`,
          keyProvider: keys.active.privateKey
        };
        eosconsumerX = getEosWrapper({
          chainId: selectedNetwork.chainId,
          httpEndpoint: `http://localhost:${sidechain.nodeos_port}`,
          keyProvider: keys.active.privateKey
        });

        const dappservicexInstance = await eosconsumerX.contract(dappservicex);
        await dappservicexInstance.adddsp({ owner: codeXSidechain, dsp: 'xprovider1' }, {
          authorization: `${codeXSidechain}@active`,
        });
        await dappservicexInstance.adddsp({ owner: codeXSidechain, dsp: 'xprovider2' }, {
          authorization: `${codeXSidechain}@active`,
        });
        // create test account on mainnet and sidechain
        await getCreateAccount(testAccMainnet, null, false);
        await getCreateAccount(testAccSidechain, null, false, sidechain);

        // create eos objs for test accounts to transfer tokens
        keys = await getCreateKeys(testAccSidechain, getDefaultArgs(), false, sidechain);
        eostestSidechain = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: `http://localhost:13016`
        });
        tokenSidechain = await eostestSidechain.contract(tokenAccSidechain);

        keys = await getCreateKeys(codeXSidechain, getDefaultArgs(), false, sidechain);
        eostestSidechain = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: `http://localhost:13016`
        });
        testcontractX = await eostestSidechain.contract(codeXSidechain)

        keys = await getCreateKeys(testAccMainnet);
        eostestMainnet = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: 'http://localhost:13015'
        });
        tokenMainnet = await eostestMainnet.contract(tokenAccMainnet);
        testcontractAcc = await eostestMainnet.contract(codeXMainnet);

        keys = await getCreateKeys(codeXMainnet);
        eostestMainnet = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: 'http://localhost:13015'
        });
        tokenPegMainnet = await eostestMainnet.contract(tokenAccMainnet);
        testcontract = await eostestMainnet.contract(codeXMainnet);



        //set up bridge contracts
        await testcontractX.init({
          sister_code: codeXMainnet,
          sister_chain_name: "localmainnet",
          processing_enabled: true,
          this_chain_name: "test1",
          asset_contract: tokenAccSidechain,
          asset_author: codeXSidechain,
          transfers_enabled: true
        }, {
          authorization: `${codeXSidechain}@active`
        });

        await testcontract.init({
          sister_code: codeXSidechain,
          sister_chain_name: "test1",
          processing_enabled: true,
          this_chain_name: "localmainnet",
          asset_contract: tokenAccMainnet,
          asset_author: codeXMainnet,
          transfers_enabled: true
        }, {
          authorization: `${codeXMainnet}@active`
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Simple Assets NFT Peg mainnet to sidechain', done => {
    (async () => {
      try {
        //Create a TSHIRT 1
        await testcontract.mint({
          category: "swag",
          owner: testAccMainnet,
          mdata: "{\"type\":\"tshirt\",\"id\":1}",
          claimrequired: false
        },{
          authorization: `${codeXMainnet}@active`
        });

        //Allow the TSHIRT to be redeemed in the real world
        await testcontract.prepclaim({
          assetid: 100000000000001,
          owner: testAccMainnet,
          type: "hackathon2019",
          code: "123456"
        },{
          authorization: `${codeXMainnet}@active`
        });

        //Claim the TSHIRT (This adds some special meta data)
        await testcontractAcc.claim({
          assetid: 100000000000001,
          owner: testAccMainnet,
          code: "123456"
        },{
          authorization: `${testAccMainnet}@active`
        });

        //Transfer this TSHIRT To TESTNET
        const transferMemo = `${testAccSidechain},test1`;
        let tx = await tokenMainnet.transfer({ 
          from: testAccMainnet,
          to: codeXMainnet,
          assetids: [100000000000001],
          memo: transferMemo
        }, {
          authorization: `${testAccMainnet}@active`
        });
        // console.log(tx);


        //arbitrary delay for irreversibility
        await eosio.delay(40000); // sleep


        //MINT TSHIRT 2
        await testcontract.mint({
          category: "swag",
          owner: testAccMainnet,
          mdata: "{\"type\":\"tshirt\",\"id\":2}",
          claimrequired: false
        },{
          authorization: `${codeXMainnet}@active`
        });

        //TRANSFER TSHIRT 2 TO TESTNET
        tx = await tokenMainnet.transfer({ 
          from: testAccMainnet,
          to: codeXMainnet,
          assetids: [100000000000002],
          memo: transferMemo
        }, {
          authorization: `${testAccMainnet}@active`
        });
        // console.log(tx);


        await eosio.delay(40000);

        //MINT TSHIRT 3
        await testcontract.mint({
          category: "swag",
          owner: testAccMainnet,
          mdata: "{\"type\":\"tshirt\",\"id\":3}",
          claimrequired: false
        },{
          authorization: `${codeXMainnet}@active`
        });

        //test a failure at returning - this will also fail because of the rejector 
        //and will show up in the ffreceipts for review
        tx = await tokenMainnet.transfer({ 
          from: testAccMainnet,
          to: codeXMainnet,
          assetids: [100000000000003],
          memo: `blahblah,test1`
        }, {
          authorization: `${testAccMainnet}@active`
        });
        // console.log(tx);

        await eosio.delay(40000);


        //MINT TSHIRT 4
        await testcontract.mint({
          category: "swag",
          owner: testAccMainnet,
          mdata: "{\"type\":\"tshirt\",\"id\":4}",
          claimrequired: false
        },{
          authorization: `${codeXMainnet}@active`
        });

        //TRANSFER TSHIRT 4 TO TESTNET - Will it work after a failure?
        tx = await tokenMainnet.transfer({ 
          from: testAccMainnet,
          to: codeXMainnet,
          assetids: [100000000000004],
          memo: transferMemo
        }, {
          authorization: `${testAccMainnet}@active`
        });
        // console.log(tx);

        await eosio.delay(40000);

        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Simple Assets NFT Peg sidechain to mainnet', done => {
    (async () => {
      try {   
        let tx;     
        const transferMemo = `${testAccMainnet},localmainnet`;

        try {
          //CLAIM NFTS ON TESTNET (so claimer pays ram)
          await tokenSidechain.claim({ 
            claimer: testAccSidechain,
            assetids: [100000000000001]
          }, {
            authorization: `${testAccSidechain}@active`
          });

          //TRANSFER THEM ALL BACK TO MAINNET
          tx = await tokenSidechain.transfer({ 
            from: testAccSidechain,
            to: codeXSidechain,
            assetids: [100000000000001],
            memo: transferMemo
          }, {
            authorization: `${testAccSidechain}@active`
          });
          // console.log(tx);

        } catch(e) {
          // console.log("Unable to get shirt 1");
          
        }

        await eosio.delay(40000); // sleep

        try {
          //CLAIM NFTS ON TESTNET (so claimer pays ram)
          await tokenSidechain.claim({ 
            claimer: testAccSidechain,
            assetids: [100000000000002]
          }, {
            authorization: `${testAccSidechain}@active`
          });

          //TRANSFER THEM ALL BACK TO MAINNET
          tx = await tokenSidechain.transfer({ 
            from: testAccSidechain,
            to: codeXSidechain,
            assetids: [100000000000002],
            memo: transferMemo
          }, {
            authorization: `${testAccSidechain}@active`
          });
          // console.log(tx);

        } catch(e) {
          // console.log("Unable to get shirt 2");
        }

        await eosio.delay(40000); // sleep

        try {
          //CLAIM NFTS ON TESTNET (so claimer pays ram)
          await tokenSidechain.claim({ 
            claimer: testAccSidechain,
            assetids: [100000000000004]
          }, {
            authorization: `${testAccSidechain}@active`
          });

          //TRANSFER THEM ALL BACK TO MAINNET
          tx = await tokenSidechain.transfer({ 
            from: testAccSidechain,
            to: codeXSidechain,
            assetids: [100000000000004],
            memo: transferMemo
          }, {
            authorization: `${testAccSidechain}@active`
          });
          // console.log(tx);

        } catch(e) {
          // console.log("Unable to get shirt 4");
        }
        await eosio.delay(40000); // sleep
        done();
      } catch(e) {
        done(e);
      }
    })()
  });
});
