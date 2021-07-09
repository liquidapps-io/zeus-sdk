require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const Web3 = require('web3');
// const contract = require('@truffle/contract');
const { assert } = require('chai'); // Using Assert style
const { getLocalDSPEos, getCreateAccount, getNetwork } = requireBox('seed-eos/tools/eos/utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');
const { eosio } = requireBox('test-extensions/lib/index');

const contractCode = 'helloeth';
const ctrt = artifacts.require(`./${contractCode}/`);

const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

describe(`Token bridge Test`, () => {
  // cpp contract, sol contract instances
  const codeEos = 'helloeth';
  let helloEthCpp, helloEosSol;
  let dspeos;
  before(done => {
    (async () => {
      try {

        // staking to 2 DSPs for the oracle and cron services for mainnet contract
        const deployedContract = await deployer.deploy(ctrt, codeEos);
        
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "oracle", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "ipfs", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "sign", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "sign", "pprovider2", "foobar");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedContract, "cron", "pprovider2", "foobar");
        dspeos = await getLocalDSPEos(codeEos);
        helloEthCpp = deployedContract.contractInstance;

        // set up bridge contracts
        await helloEthCpp.init({
          sister_code: '',
          sister_chain_name: "test1",
          processing_enabled: true,
          last_irreversible_block_time: 0,
          last_received_releases_id: 0,
          last_received_receipts_id: 0,
          last_confirmed_messages_id: 0,
          last_pending_messages_id: 0
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

  it('"Hello Eth" from eos to eth', done => {
    (async () => {
      try {
        await helloEthCpp.pushmsg({
          message: "Hello Ethereum"
        }, {
          authorization: `${codeEos}@active`
        });
        await eosio.delay(10000);
        const lastReceivedMessageId = await helloEosSol.last_received_message_id.call(); 
        const lastReceivedMessage = await helloEosSol.foreign_messages.call(lastReceivedMessageId);
        assert.equal(lastReceivedMessage.message, "Hello Ethereum");
        done();
      } catch(e) {
        done(e);
      }
    })()
  });

  it('"Hello Eos" from eth to eos', done => {
    (async () => {
      try {
        const availableAccounts = await web3.eth.getAccounts();
        const ethOwnerAccount = availableAccounts[0];
        const message = "Hello Eos";
        await helloEosSol.pushMessage( message , {
          from: ethOwnerAccount 
        });
        await eosio.delay(10000);
        // verify message received
        //const lastReceivedMessage = await dspeos.getTableRows({
          //'json': true,
          //'scope': codeEos,
          //'code': codeEos,
          //'table': 'accounts',
          //'limit': 1
        //});
      } catch(e) {
        done(e);
      }
    })()
  });
});
