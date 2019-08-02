import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork, getCreateAccount, getEos } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, dappServicesContract } = require('../extensions/tools/eos/dapp-services');
const { loadModels } = require('../extensions/tools/models');
const contractCode = 'dappairhodl1';
var contractCode2 = 'ipfsconsumer';
var ctrt = artifacts.require(`./airhodl/`);
var ctrt2 = artifacts.require(`./${contractCode2}/`);
const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);

async function issueInitialSupply({ deployedContract }) {
  var key = await getCreateKeys(dappServicesContract);
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  await servicesTokenContract.issue({
      to: contractCode,
      quantity: "100000.0000 DAPP",
      memo: 'issue DAPP to airhodl contract'
  }, {
      authorization: `${dappServicesContract}@active`,
      broadcast: true,
      sign: true,
      keyProvider: [key.active.privateKey]
  });

  return servicesTokenContract;
}

async function allocateDAPPTokens( deployedContract, quantity = '1000.0000 DAPP' ) {
  var key = await getCreateKeys(dappServicesContract);
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  var contract = deployedContract.address;
  await servicesTokenContract.issue({
    to: contract,
    quantity: quantity,
    memo: ''
  }, {
    authorization: `${dappServicesContract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function allocateHODLTokens( deployedContract, quantity = '1000.0000 DAPPHDL' ) {
  var key = await getCreateKeys(contractCode);
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  var contract = deployedContract.address;
  await servicesTokenContract.issue({
    to: contract,
    quantity,
    memo: ''
  }, {
    authorization: `${contractCode}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function selectPackage({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', selectedPackage = 'default' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  var contract = deployedContract.address;
  var key = await getCreateKeys(contract);
  await servicesTokenContract.selectpkg({
    owner: deployedContract.address,
    provider: provider,
    service: service,
    'package': selectedPackage
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function stake({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  var key = await getCreateKeys(contract);
  await servicesTokenContract.stake({
    owner: contract,
    service,
    provider,
    quantity: `${amount} DAPPHDL`
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function stakeDapp({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  var key = await getCreateKeys(contract);
  await servicesTokenContract.stake({
    from: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function unstake({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  await servicesTokenContract.unstake({
    owner: contract,
    service,
    provider,
    quantity: `${amount} DAPPHDL`
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function unstakeDapp({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  await servicesTokenContract.unstake({
    to: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}	

async function issue({ deployedContract, to, quantity, memo }) {
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  var key = await getCreateKeys(contract);
  await servicesTokenContract.issue({
    to,
    quantity: `${quantity} DAPPHDL`,
    memo
  }, {
    authorization: `${contractCode}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function refresh({ deployedContract }) {
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  await servicesTokenContract.refresh({
    owner: contract
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function withdraw({ deployedContract }) {
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  var key = await getCreateKeys(contract);
  await servicesTokenContract.withdraw({
    owner: contract
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

function checkDateParse( date ) {
  const result = Date.parse(date);
  if (Number.isNaN(result)) {
      throw new Error('Invalid time format');
  }
  return result;
}

function dateToTimePoint( date ) {
  return Math.round(checkDateParse(date + 'Z') * 1000);
}

async function activate({ deployedContract, start, end }) {
  var key = await getCreateKeys(contractCode);
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  await servicesTokenContract.activate({
    start:dateToTimePoint(start),
    end:dateToTimePoint(end)
  }, {
    authorization: `${contractCode}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function grab({ deployedContract, owner, ram_payer }) {
  var contract = deployedContract.address;
  var key = await getCreateKeys(contract);
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  await servicesTokenContract.grab({
    owner,
    ram_payer
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function update({ deployedContract, issuer }) {
  var contract = deployedContract.address;
  var key = await getCreateKeys(contract);
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  await servicesTokenContract.update({
    issuer
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function refund({ deployedContract, provider = 'pprovider1', serviceName = 'ipfs' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(contractCode);
  await servicesTokenContract.refund({
    owner: contract,
    provider,
    service
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function deployDAPPAccount( code ) {
  var deployedContract = await getCreateAccount(code);
  var eos = await getEos(code);
  deployedContract.address = code;
  deployedContract.eos = eos;
  await allocateDAPPTokens(deployedContract);
  return deployedContract;
}

async function deployHODLAccount( code ) {
  var deployedContract = await getCreateAccount(code);
  var eos = await getEos(code);
  deployedContract.address = code;
  deployedContract.eos = eos;
  await allocateHODLTokens(deployedContract);
  return deployedContract;
}

async function returnTimeData( table_time ) {
  let startDate = new Date(table_time.head_block_time);
  let endDate = new Date(table_time.head_block_time);
  startDate.setMinutes(startDate.getMinutes()-10000);
  endDate.setMinutes(endDate.getMinutes()+200);
  let start = startDate.toISOString();
  start = start.substr(0,start.length-1);
  let end = endDate.toISOString();
  end = end.substr(0,end.length-1);
  return { start, end };
}

async function deployConsumerContract( code, provider = "pprovider1" ) {
  var deployedContract = await deployer.deploy(ctrt2, code);
  await allocateDAPPTokens(deployedContract);
  var selectedNetwork = getNetwork(getDefaultArgs());
  var config = {
    expireInSeconds: 120,
    sign: true,
    chainId: selectedNetwork.chainId
  };
  var keys = await getCreateKeys(code);
  config.keyProvider = keys.active.privateKey;
  var eosvram = deployedContract.eos;
  config.httpEndpoint = 'http://localhost:13115';
  eosvram = new Eos(config);
  var testcontract = await eosvram.contract(code);
  await eosvram.updateauth({
    account: deployedContract.address,
    permission: 'active',
    parent: 'owner',
    auth: {
      threshold: 1,
      keys: [{
        weight: 1, 
        key: keys.active.publicKey
      }],
      accounts: [{
        permission: { actor: deployedContract.address, permission: 'eosio.code' },
        weight: 1
      }]
    }
  }, { 
    authorization: `${deployedContract.address}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [keys.active.privateKey]
  });
  return { testcontract, deployedContract };
}

async function returnVramTestFunc( testContractAccount, index, testcontract ) {
  await testcontract.testset({
    data: {
      field1: index,
      field2: `hello-world${index}`,
      field3: index+2
    }
  }, {
    authorization: `${testContractAccount}@active`,
    broadcast: true,
    sign: true
  });
}

async function vramTest( deployedContract, testContractAccount, testcontract ) {
  let initialRamWithMerkleRoot = await deployedContract.eos.getAccount({
    account_name: testContractAccount
  });
  await returnVramTestFunc(testContractAccount, 555, testcontract);
  await returnVramTestFunc(testContractAccount, 556, testcontract);
  await returnVramTestFunc(testContractAccount, 557, testcontract);
  await returnVramTestFunc(testContractAccount, 558, testcontract);
  await returnVramTestFunc(testContractAccount, 559, testcontract);
  // wait for DSP/demux to catch up
  await delaySec(3);
  let final_ram = await deployedContract.eos.getAccount({
    account_name: testContractAccount
  });
  let e = false;
  if (final_ram.ram_usage <= initialRamWithMerkleRoot.ram_usage){
    e = true;
  }
  return e;
}

var deployedHODL;

describe(`AirHODL Tests`, () => {
  it('Create AirHODL and activate with start/end time', done => {
    (async() => {
      try {     
        deployedHODL = await deployer.deploy(ctrt, contractCode);
        var hodlkey = await getCreateKeys(contractCode);
        await deployedHODL.contractInstance.create({
          issuer:contractCode,
          maximum_supply: '100000000.0000 DAPPHDL'
        }, {
          authorization: `${contractCode}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [hodlkey.active.privateKey]
        });
        let table_time = await deployedHODL.eos.getInfo({
          json: true,
        });
        let { start, end } = await returnTimeData( table_time );
        await activate({ deployedContract: deployedHODL, start, end });
        await update({ deployedContract: deployedHODL, issuer: contractCode });
        await issueInitialSupply({ deployedContract: deployedHODL });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Unstake more than staked', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer123';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await genAllocateDAPPTokens( deployedContract, 'ipfs', 'pprovider1' );
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        await stake({ deployedContract, amount: '1.0000' });
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        var failed = false;
        try {
          await unstake({ deployedContract, amount: '2.0000' });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed, unstaking more than total staked');
        await unstake({ deployedContract, amount: '1.0000' });
        await delaySec(10);
        failed = false;
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Unstake without staking', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer11';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        var failed = false;
        try {
          await unstake({ deployedContract, amount: '1.0000' });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'unstake should fail, stake skipped');
        await stake({ deployedContract, amount: '1.0000' });  
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        await unstake({ deployedContract, amount: '1.0000' });
        await delaySec(11); 
        failed = false;      
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Refund before unstake', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer2';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        await stake({ deployedContract, amount: '1.0000' });  
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        var failed = false;
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should fail, unstake skipped');
        await unstake({ deployedContract, amount: '1.0000' });
        await delaySec(11); 
        failed = false;      
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Refund before staking and unstaking', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer3';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        var failed = false;
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should fail, staking and unstaking skipped');
        await stake({ deployedContract, amount: '1.0000' });  
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        await unstake({ deployedContract, amount: '1.0000' });
        await delaySec(11); 
        failed = false;      
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Grab without being eligible', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer4';
        var { deployedContract } = await deployConsumerContract(testContractAccount);
        await selectPackage({ deployedContract });
        var failed = false;
        try {
          await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'grab should have failed, account was not issued to');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Staking without being eleigible', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer5';
        var { deployedContract } = await deployConsumerContract(testContractAccount);
        await selectPackage({ deployedContract });
        var failed = false;
        try {
          await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'grab should have failed, account was not issued to');
        failed = false;
        try {
          await stake({ deployedContract, amount: '1.0000' }); 
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'staking should have failed, account was not issued to and did not grab');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Stake without grab', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer13';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await stake({ deployedContract, amount: '1.0000' });  
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        await unstake({ deployedContract, amount: '1.0000' });
        await delaySec(11); 
        var failed = false;
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Stake more than balance', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer14';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        var failed = false;
        try {
          await stake({ deployedContract, amount: '10000.0000' });  
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'stake should fail, balance is less than amount being staked');
        await stake({ deployedContract, amount: '1.0000' }); 
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        await unstake({ deployedContract, amount: '1.0000' });
        await delaySec(11); 
        failed = false;      
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Stake 50% DAPP 50% DAPPHDL', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer23';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        await stake({ deployedContract, amount: '0.5000' });  
        await stakeDapp({ deployedContract, amount: '0.5000' }); 
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        await unstake({ deployedContract, amount: '0.5000' });
        await unstakeDapp({ deployedContract, amount: '0.5000' }); 
        await delaySec(11); 
        var failed = false;
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Withdraw before unstake', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer21';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        await stake({ deployedContract, amount: '1.0000' });  
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        var failed = false;
        try {
          await withdraw({ deployedContract });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'withdraw should fail, unstake skipped');
        await unstake({ deployedContract, amount: '1.0000' });
        await delaySec(11); 
        failed = false;
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Withdraw before unstaked', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer22';
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await selectPackage({ deployedContract });
        await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount });
        await stake({ deployedContract, amount: '1.0000' });  
        // let e = await vramTest(deployedContract, testContractAccount, testcontract);
        // assert(e, 'final ram should not be greater than initial RAM');
        await unstake({ deployedContract, amount: '1.0000' });
        var failed = false;
        try {
          await withdraw({ deployedContract });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'withdraw should fail, unstake not finished');
        await delaySec(11); 
        failed = false;
        try {
          await refund({ deployedContract, provider: "pprovider1" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'refund should have already processed');
        await withdraw({ deployedContract });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Withdraw before grab', done => {
    (async() => {
      try {    
        var testContractAccount = 'consumer12';
        var { deployedContract } = await deployConsumerContract(testContractAccount);
        await allocateHODLTokens( deployedContract );
        await withdraw({ deployedContract });
        await selectPackage({ deployedContract });
        let failed = false;
        try {
          await grab({ deployedContract, owner: testContractAccount, ram_payer: testContractAccount }); 
        } catch(e) {
          failed = true;
        }
        assert(failed, 'should have failed, no balance to grab');
        // reset dappairhodl1 contract to avoid conflict with dappservices unit test
        deployedHODL = await deployer.deploy(ctrt2, contractCode);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});