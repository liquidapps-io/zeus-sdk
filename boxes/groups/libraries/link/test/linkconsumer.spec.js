require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getLocalDSPEos, getCreateAccount, getNetwork } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const { awaitTable, getTable, delay } = requireBox('seed-tests/lib/index');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');

const contractCode = 'linkconsumer';
const contractCodeX = 'linkconsumerx';
const ctrt = artifacts.require(`./${contractCode}/`);
const ctrtx = artifacts.require(`./${contractCodeX}/`);

describe(`LiquidBrinX BlockchainRPC`, () => {
  let testcontract, testcontractX;
  const codeXMainnet = 'testbrpcxm';
  const codeXSidechain = 'testbrpcx';
  const sidechainName = 'test1';
  let dspeos, sidechain;
  let eosconsumerX;
  let eostestMainnet, eostestSidechain;
  let maxDelay = 80000;
  before(done => {
    (async () => {
      try {

        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        const deployedContract = await deployer.deploy(ctrt, codeXMainnet);
        
        
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
        eosconsumerX = getEosWrapper({
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId,
          httpEndpoint: `http://localhost:${sidechain.nodeos_port}`,
          keyProvider: keys.active.privateKey
        });

        // launch dappservicex contract on sister chain
        const dappservicexInstance = await eosconsumerX.contract(dappservicex);
        
        // register dsps on sister chain
        await dappservicexInstance.adddsp({ owner: codeXSidechain, dsp: 'xprovider1' }, {
          authorization: `${codeXSidechain}@active`,
        });
        await dappservicexInstance.adddsp({ owner: codeXSidechain, dsp: 'xprovider2' }, {
          authorization: `${codeXSidechain}@active`,
        });

        // create eos objs for semaphore to debug
        keys = await getCreateKeys(codeXSidechain, getDefaultArgs(), false, sidechain);
        eostestSidechain = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: `http://localhost:13016`
        });
        testcontractX = await eostestSidechain.contract(codeXSidechain);

        keys = await getCreateKeys(codeXMainnet);
        eostestMainnet = getEosWrapper({
          keyProvider: keys.active.privateKey,
          httpEndpoint: 'http://localhost:13115'
        });
        testcontract = await eostestMainnet.contract(codeXMainnet);

        // set up bridge contracts
        await testcontractX.init({
          sister_code: codeXMainnet,
          sister_chain_name: "localmainnet",
          this_chain_name: "test1",
          processing_enabled: true
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await testcontract.init({
          sister_code: codeXSidechain,
          sister_chain_name: "test1",
          this_chain_name: "localmainnet",
          processing_enabled: true
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

  it('Message mainnet to sidechain', done => {
    (async () => {    
      try {
        let message1 = "Mainnet origin foo ping";
        let message2 = "Mainnet origin bar ping";
        let tx = await testcontract.emit({ 
          id: 1,
          message: message1
        }, {
          authorization: `${codeXMainnet}@active`
        });
        // handler,code,table,scope,search_field,desired_state,timeout = 240000,limit = 1
        await awaitTable(dspeos,codeXMainnet,"parcels",codeXMainnet,"response_message",`${message1} pong`,maxDelay);

        tx = await testcontract.emit({ 
          id: 2,
          message: message2
        }, {
          authorization: `${codeXMainnet}@active`
        });
        await awaitTable(dspeos,codeXMainnet,"parcels",codeXMainnet,"response_message",`${message2} pong`,maxDelay);

        let parcels = await getTable(dspeos,codeXMainnet,"parcels",codeXMainnet);        
        assert.equal(parcels.rows[0].original_message, message1);
        assert.equal(parcels.rows[0].response_message, message1 + " pong");
        
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Message sidechain to mainnet', done => {
    (async () => {    
      try {
        let message1 = "Sidechain origin foo ping";
        let message2 = "Sidechain origin bar ping";
        let tx = await testcontractX.emit({ 
          id: 10,
          message: message1
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await awaitTable(eosconsumerX,codeXSidechain,"parcels",codeXSidechain,"response_message",`${message1} pong`,maxDelay);
        
        tx = await testcontractX.emit({
          id: 11,
          message: message2
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await awaitTable(eosconsumerX,codeXSidechain,"parcels",codeXSidechain,"response_message",`${message2} pong`,maxDelay);

        let parcels = await getTable(eosconsumerX,codeXSidechain,"parcels",codeXSidechain,3);      
        assert.equal(parcels.rows[2].original_message, message1);
        assert.equal(parcels.rows[2].response_message, message1 + " pong");
        
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it.skip('Message mainnet to sidechain (Diagnostic)', done => {
    (async () => {     
      const checkStatus = async() => {
        let hasLocalConfirmed = false;
        let hasRemoteCRelease = false;
        let hasRemoteRelease = false;
        let hasRemoteReceipt = false;
        let hasForeignReceipt = false;
        let hasHandledReceipt = false;
        let waited = 0;
        let finished = false;

        while(!finished) {
          try {
            await delay(2000); // sleep
            waited += 2000;
            let res;
            if(!hasLocalConfirmed) {
              res = await getTable(dspeos,codeXMainnet,"cmessages",codeXMainnet);
              if(res.rows.length > 0) {
                console.log(`Got local confirmed message <${waited} ms elapsed>:\n ${JSON.stringify(res.rows)}\n\n`);
                hasLocalConfirmed = true;
              }
            }
            if(!hasRemoteCRelease) {
              res = await getTable(eosconsumerX,codeXSidechain,"releases",codeXSidechain);
              if(res.rows.length > 0) {
                console.log(`Got remote compressed release <${waited} ms elapsed>:\n ${JSON.stringify(res.rows)}\n\n`);
                hasRemoteCRelease = true;
              }
            }
            if(!hasRemoteRelease) {
              res = await getTable(eosconsumerX,codeXSidechain,"creleases",codeXSidechain);
              if(res.rows.length > 0) {
                console.log(`Got remote uncompressed release <${waited} ms elapsed>:\n ${JSON.stringify(res.rows)}\n\n`);
                hasRemoteRelease = true;
              }
            }
            if(!hasRemoteReceipt) {
              res = await getTable(eosconsumerX,codeXSidechain,"lreceipts",codeXSidechain);
              if(res.rows.length > 0) {
                console.log(`Got remote compressed receipt <${waited} ms elapsed>:\n ${JSON.stringify(res.rows)}\n\n`);
                hasRemoteReceipt = true;
              }
            }
            if(!hasForeignReceipt) {
              res = await getTable(dspeos,codeXMainnet,"freceipts",codeXMainnet);
              if(res.rows.length > 0) {
                console.log(`Got foreign compressed receipt <${waited} ms elapsed>:\n ${JSON.stringify(res.rows)}\n\n`);
                hasForeignReceipt = true;
              }
            }
            // if(!hasHandledReceipt) {
            //   res = await getTable(dspeos,codeXMainnet,"cfreceipts",codeXMainnet);
            //   if(res.rows.length > 0) {
            //     console.log(`Got foreign uncompressed receipt <${waited} ms elapsed>:\n ${JSON.stringify(res.rows[0])}\n\n`);
            //     hasHandledReceipt = true;
            //   }
            // } 
            finished = waited >= maxDelay || hasForeignReceipt;
          } catch(e) { finished = waited >= maxDelay || hasForeignReceipt; }
        }
      }
      try {
        let tx = await testcontract.emit({ 
          id: 5,
          message: "Mainnet origin foo ping"
        }, {
          authorization: `${codeXMainnet}@active`
        });
        await checkStatus();
        tx = await testcontract.emit({ 
          id: 1,
          message: "Mainnet origin bar ping"
        }, {
          authorization: `${codeXMainnet}@active`
        });
        await delay(maxDelay); // sleep
        await checkStatus();
        
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it.skip('Message sidechain to mainnet (Diagnostic', done => {
    (async () => {
      const checkStatus = async() => {
        let hasLocalConfirmed = false;
        let hasRemoteCRelease = false;
        let hasRemoteRelease = false;
        let hasRemoteReceipt = false;
        let hasForeignReceipt = false;
        let hasHandledReceipt = false;
        let waited = 0;
        let finished = false;

        while(!finished) {
          try {
            await delay(2000); // sleep
            waited += 2000;
            let res;
            if(!hasLocalConfirmed) {
              res = await getTable(eosconsumerX,codeXSidechain,"cmessages",codeXSidechain);
              if(res.rows.length > 0) {
                console.log(`Got local confirmed message <${waited} ms elapsed>:\n ${JSON.stringify(res.rows[0])}\n\n`);
                hasLocalConfirmed = true;
              }
            }
            if(!hasRemoteCRelease) {
              res = await getTable(dspeos,codeXMainnet,"releases",codeXMainnet);
              if(res.rows.length > 0) {
                console.log(`Got remote compressed release <${waited} ms elapsed>:\n ${JSON.stringify(res.rows[0])}\n\n`);
                hasRemoteCRelease = true;
              }
            }
            if(!hasRemoteRelease) {
              res = await getTable(dspeos,codeXMainnet,"creleases",codeXMainnet);
              if(res.rows.length > 0) {
                console.log(`Got remote uncompressed release <${waited} ms elapsed>:\n ${JSON.stringify(res.rows[0])}\n\n`);
                hasRemoteRelease = true;
              }
            }
            if(!hasRemoteReceipt) {
              res = await getTable(dspeos,codeXMainnet,"lreceipts",codeXMainnet);
              if(res.rows.length > 0) {
                console.log(`Got remote compressed receipt <${waited} ms elapsed>:\n ${JSON.stringify(res.rows[0])}\n\n`);
                hasRemoteReceipt = true;
              }
            }
            if(!hasForeignReceipt) {
              res = await getTable(eosconsumerX,codeXSidechain,"freceipts",codeXSidechain);
              if(res.rows.length > 0) {
                console.log(`Got foreign compressed receipt <${waited} ms elapsed>:\n ${JSON.stringify(res.rows[0])}\n\n`);
                hasForeignReceipt = true;
              }
            }
          // if(!hasHandledReceipt) {
          //   res = await getTable(dspeos,codeXMainnet,"cfreceipts",codeXMainnet);
          //   if(res.rows.length > 0) {
          //     console.log(`Got foreign uncompressed receipt <${waited} ms elapsed>:\n ${JSON.stringify(res.rows[0])}\n\n`);
          //     hasHandledReceipt = true;
          //   }
          // } 
            finished = waited >= maxDelay || hasForeignReceipt;
          } catch(e) { finished = waited >= maxDelay || hasForeignReceipt; }
        }
      }
      try {
        let tx = await testcontractX.emit({ 
          id: 10,
          message: "Sidechain origin foo ping"
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await checkStatus();

        tx = await testcontractX.emit({ 
          id: 20,
          message: "Sidechain origin bar ping"
        }, {
          authorization: `${codeXSidechain}@active`
        });
        await delay(maxDelay); // sleep
        await checkStatus();

        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('Disable mainnet/sidechain stop intervals', done => {
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
