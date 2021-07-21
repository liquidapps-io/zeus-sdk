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

const contractCode = 'tokenpeg';
const contractCodeX = 'tokenpegx';
const ctrt = artifacts.require(`./${contractCode}/`);
const ctrtx = artifacts.require(`./${contractCodeX}/`);
const tokenContract = artifacts.require('./eosio.token/');
const { eosio,atomic } = requireBox('test-extensions/lib/index');

describe(`Token bridge Test EOSIO <> EOSIO`, () => {
  let testcontract, testcontractX;
  const codeXMainnet = 'testpegxm';
  const codeXSidechain = 'testpegx';
  const sidechainName = 'test1';
  const testAccMainnet = 'testpegmn4';
  const testAccSidechain = 'testpegsc';
  const tokenAccMainnet = 'tpgmainnet';
  const tokenAccSidechain = 'tpgsidechain';
  let dspeos, sidechain;
  let eosconsumerX;
  let eostestMainnet, eostestSidechain;
  let tokenMainnet, tokenSidechain;
  before(done => {
    (async () => {
      try {

        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        const deployedContract = await deployer.deploy(ctrt, codeXMainnet);
        // deploy token on mainnet
        const deployedTokenMainnet = await deployer.deploy(tokenContract, tokenAccMainnet);
        await getCreateAccount(testAccMainnet);
        await deployedTokenMainnet.contractInstance.create({
          issuer: tokenAccMainnet,
          maximum_supply: "1000000.0000 TKN"
        }, {
            authorization: `${tokenAccMainnet}@active`,
        });
        await deployedTokenMainnet.contractInstance.issue({
          to: tokenAccMainnet,
          quantity: "1000.0000 TKN",
          memo: ""
        }, {
            authorization: `${tokenAccMainnet}@active`,
        });
        await deployedTokenMainnet.contractInstance.transfer({
          from: tokenAccMainnet,
          to: testAccMainnet,
          quantity: "1000.0000 TKN",
          memo: ""
        }, {
            authorization: `${tokenAccMainnet}@active`,
        });
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider2", "foobar");
        dspeos = await getLocalDSPEos(codeXMainnet);
        testcontract = deployedContract.contractInstance;

        // staking to 2 DSPs for the oracle and cron services for side/sister chain contract
        const sidechains = await loadModels('eosio-chains');
        sidechain = sidechains.find(a => a.name === sidechainName);
        await getCreateAccount(codeXMainnet, null, false);
        await getCreateAccount(codeXSidechain, null, false, sidechain);
        const deployedContractX = await deployer.deploy(ctrtx, codeXSidechain, null, sidechain);
        testcontractX = deployedContractX.contractInstance;
        // deploy token on sidechain
        const deployedTokenSidechain = await deployer.deploy(tokenContract, tokenAccSidechain, null, sidechain);
        await deployedTokenSidechain.contractInstance.create({
          issuer: codeXSidechain,
          maximum_supply: "1000000.0000 TKN"
        }, {
            authorization: `${tokenAccSidechain}@active`,
        });
        await genAllocateDAPPTokens({ address: codeXMainnet }, 'cron', '', 'default');
        // await genAllocateDAPPTokens({ address: codeXMainnet }, 'cron', '', 'foobar');
        await genAllocateDAPPTokens({ address: codeXMainnet }, 'ipfs', '', 'default');
        // await genAllocateDAPPTokens({ address: codeXMainnet }, 'ipfs', '', 'foobar');
        await genAllocateDAPPTokens({ address: codeXMainnet }, 'oracle', '', 'default');
        // await genAllocateDAPPTokens({ address: codeXMainnet }, 'oracle', '', 'foobar'); 
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
        //testcontractX = await eosconsumerX.contract(codeXSidechain);

        const dappservicexInstance = await eosconsumerX.contract(dappservicex);
        await dappservicexInstance.adddsp({ owner: codeXSidechain, dsp: 'xprovider1' }, {
          authorization: `${codeXSidechain}@active`,
        });
        await dappservicexInstance.adddsp({ owner: codeXSidechain, dsp: 'xprovider2' }, {
          authorization: `${codeXSidechain}@active`,
        });

        // create test account on mainnet and sidechain
        await getCreateAccount(testAccSidechain, null, false, sidechain);

        // create eos objs for test accounts to transfer tokens
        keys = await getCreateKeys(testAccSidechain, getDefaultArgs(), false, sidechain);
        eostestSidechain = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: `http://localhost:${sidechain.nodeos_port}`
        });
        tokenSidechain = await eostestSidechain.contract(tokenAccSidechain);

        keys = await getCreateKeys(testAccMainnet);
        eostestMainnet = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: 'http://localhost:13015'
        });
        tokenMainnet = await eostestMainnet.contract(tokenAccMainnet);

        // set up bridge contracts
        await testcontractX.init({
          sister_code: codeXMainnet,
          sister_chain_name: "localmainnet",
          this_chain_name: "test1",
          processing_enabled: true,
          token_contract: tokenAccSidechain,
          token_symbol: "4,TKN",
          min_transfer: "10000",
          transfers_enabled: true,
          can_issue: true,
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await testcontract.init({
          sister_code: codeXSidechain,
          sister_chain_name: "test1",
          this_chain_name: "localmainnet",
          processing_enabled: true,
          token_contract: tokenAccMainnet,
          token_symbol: "4,TKN",
          min_transfer: "10000",
          transfers_enabled: true,
          can_issue: false,
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

  it('Token peg mainnet to sidechain', done => {
    (async () => {
      try {
        const prevMainnetBalance = await eosio.parseTokenTable(dspeos,tokenAccMainnet,testAccMainnet,'accounts')
        // console.log(prevMainnetBalance)
        const prevSidechainBalance = 0; // no table row to check
        const preBalanceBurned = await eosio.parseTokenTable(dspeos,tokenAccMainnet,codeXMainnet,'accounts')
        const transferMemo = `${testAccSidechain},test1`;
        await tokenMainnet.transfer({ 
          from: testAccMainnet,
          to: codeXMainnet,
          quantity: "2.0000 TKN",
          memo: transferMemo
        }, {
          authorization: `${testAccMainnet}@active`
        });
        const postMainnetBalance = await eosio.parseTokenTable(dspeos,tokenAccMainnet,testAccMainnet,'accounts')
        // console.log(postMainnetBalance)
        // handler,code,table,scope,search_field,desired_state,timeout = 240000,limit = 1
        let res = await eosio.awaitTable(eosconsumerX,tokenAccSidechain,"accounts",testAccSidechain,"balance",`${prevSidechainBalance + 2}.0000 TKN`);
        if(!res) throw new Error(`await table expired`);
        const postSidechainBalance = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
        // console.log(res)
        // console.log(postSidechainBalance)
        // console.log(typeof(prevMainnetBalance))
        // console.log(typeof(postSidechainBalance))
        assert.equal(prevMainnetBalance - postMainnetBalance, 2);
        assert.equal(postSidechainBalance - prevSidechainBalance, 2);
        const postBalanceBurned = await eosio.parseTokenTable(dspeos,tokenAccMainnet,codeXMainnet,'accounts')
        assert.equal(preBalanceBurned + 2,postBalanceBurned, "tokens were burned, should not be");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Token peg sidechain to mainnet account doesnt exist', done => {
    (async () => {
      try {
        const prevMainnetBalance = await eosio.parseTokenTable(dspeos,tokenAccMainnet,testAccMainnet,'accounts')
        const prevSidechainBalance = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,testAccSidechain,'accounts')
        const transferMemo = `notrightacct,localmainnet`;
        const preBurn = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,codeXSidechain,'accounts')
        await tokenSidechain.transfer({ 
          from: testAccSidechain,
          to: codeXSidechain,
          quantity: "1.0000 TKN",
          memo: transferMemo
        }, {
          authorization: `${testAccSidechain}@active`
        });
        const prePostBurn = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,codeXSidechain,'accounts')
        assert.equal(preBurn,prePostBurn,"token not burned")
        // handler,code,table,scope,search_field,desired_state,timeout = 240000,limit = 1
        let res = await eosio.awaitTable(eosconsumerX,tokenAccSidechain,"accounts",testAccSidechain,"balance",`${prevSidechainBalance}.0000 TKN`);
        if(!res) throw new Error(`await table expired`);
        const postSidechainBalance = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
        const postMainnetBalance = await eosio.parseTokenTable(dspeos,tokenAccMainnet,testAccMainnet,'accounts')
        assert.equal(prevSidechainBalance, postSidechainBalance, "sidechain account not refunded");
        assert.equal(postMainnetBalance ,prevMainnetBalance, "mainnet account should not be credited, does not exist");
        const postPostBurn = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,codeXSidechain,'accounts')
        assert.equal(postPostBurn,prePostBurn,"token not burned")
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Token peg sidechain to mainnet', done => {
    (async () => {
      try {
        const prevMainnetBalance = await eosio.parseTokenTable(dspeos,tokenAccMainnet,testAccMainnet,'accounts')
        const prevSidechainBalance = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,testAccSidechain,'accounts')
        const transferMemo = `${testAccMainnet},localmainnet`;
        // console.log('before transfer')
        const prePreBurn = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,codeXSidechain,'accounts')
        await tokenSidechain.transfer({ 
          from: testAccSidechain,
          to: codeXSidechain,
          quantity: "1.0000 TKN",
          memo: transferMemo
        }, {
          authorization: `${testAccSidechain}@active`
        });
        const postPreBurn = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,codeXSidechain,'accounts')
        assert.equal(prePreBurn,postPreBurn,"token not burned")
        let res = await eosio.awaitTable(dspeos,tokenAccMainnet,"accounts",testAccMainnet,"balance",`${prevMainnetBalance + 1}.0000 TKN`);
        if(!res) throw new Error(`await table expired`);

        const postMainnetBalance = await eosio.parseTokenTable(dspeos,tokenAccMainnet,testAccMainnet,'accounts')
        const postSidechainBalance = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,testAccSidechain,'accounts')
        assert.equal(prevSidechainBalance - postSidechainBalance, 1);
        assert.equal(postMainnetBalance - prevMainnetBalance, 1);
        const postPostBurn = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,codeXSidechain,'accounts')
        assert.equal(postPostBurn,postPreBurn,"token not burned")
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Token peg mainnet to sidechain account doesnt exist', done => {
    (async () => {
      try {
        const prevMainnetBalance = await eosio.parseTokenTable(dspeos,tokenAccMainnet,testAccMainnet,'accounts')
        const prevSidechainBalance = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,testAccSidechain,'accounts')
        const transferMemo = `notrightacct,test1`;
        await tokenMainnet.transfer({ 
          from: testAccMainnet,
          to: codeXMainnet,
          quantity: "2.0000 TKN",
          memo: transferMemo
        }, {
          authorization: `${testAccMainnet}@active`
        });
        // handler,code,table,scope,search_field,desired_state,timeout = 240000,limit = 1
        let res = await eosio.awaitTable(dspeos,tokenAccMainnet,"accounts",testAccMainnet,"balance",`${prevMainnetBalance}.0000 TKN`);
        if(!res) throw new Error(`await table expired`);
        const postMainnetBalance = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
        const postSidechainBalance = await eosio.parseTokenTable(eosconsumerX,tokenAccSidechain,testAccSidechain,'accounts')
        assert.equal(prevMainnetBalance, postMainnetBalance, "mainnet account not refunded");
        assert.equal(postSidechainBalance ,prevSidechainBalance, "sidechain account should not be credited, does not exist");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Token peg mainnet/sidechain stop intervals', done => {
    (async () => {
      try {
        await testcontractX.disable({
          timer: "packbatches",
          processing_enabled: false
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await testcontract.disable({
          timer: "packbatches",
          processing_enabled: false
        }, {
          authorization: `${codeXMainnet}@active`
        });
        await testcontractX.disable({
          timer: "getbatches",
          processing_enabled: false
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await testcontract.disable({
          timer: "getbatches",
          processing_enabled: false
        }, {
          authorization: `${codeXMainnet}@active`
        });
        await testcontractX.disable({
          timer: "unpkbatches",
          processing_enabled: false
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await testcontract.disable({
          timer: "unpkbatches",
          processing_enabled: false
        }, {
          authorization: `${codeXMainnet}@active`
        });
        await testcontractX.disable({
          timer: "hndlmessage",
          processing_enabled: false
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await testcontract.disable({
          timer: "hndlmessage",
          processing_enabled: false
        }, {
          authorization: `${codeXMainnet}@active`
        });
        done();
      } catch(e) {
        done(e);
      }
    })()
  });
});
