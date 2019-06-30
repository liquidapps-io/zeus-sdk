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
const { dappServicesContract } = require('../extensions/tools/eos/dapp-services');
const { loadModels } = require('../extensions/tools/models');

const servicescontract = dappServicesContract;
var servicesC = artifacts.require(`./dappservices/`);

const hodlcontract = 'dappairhodl1';
var hodlC = artifacts.require(`./airhodl/`);

const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);

var generateModel = (commandNames, cost_per_action = 1) => {
  var model = {};
  commandNames.forEach(a => {
    model[`${a}_model_field`] = {
      cost_per_action
    };
  });
  return model;
};

async function deployServicePackage({ serviceName = 'ipfs', serviceContractAccount = null, package_id = 'default', quota = '1.0000', min_stake_quantity = '1.0000', min_unstake_period = 10, package_period = 20, cost_per_action = 1 }) {
  var models = await loadModels('dapp-services');
  //var serviceModel = models.find(a => a.name == serviceName);
  var deployedServices = await deployer.deploy(servicesC, servicescontract);
   

  var provider = 'pprovider1';
  var key = await getCreateAccount(provider);

  //create ipfs account
  await getCreateAccount(serviceName);
  //var serviceContract = serviceContractAccount || serviceModel.contract;

  // reg provider packages
  await deployedServices.contractInstance.regpkg({
    newpackage: {
      id: 0,
      provider,
      api_endpoint: `http://localhost:98765`,
      package_json_uri: 'http://someuri/dsp-package1.json',
      enabled: 0,
      service: serviceName,
      package_id,
      quota: `${quota} QUOTA`,
      min_stake_quantity: `${min_stake_quantity} DAPP`,
      min_unstake_period: min_unstake_period,
      package_period: package_period
    }
  }, {
    authorization: `${provider}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });

  await deployedServices.contractInstance.modifypkg({
    provider,
    api_endpoint: `http://localhost:98765`,
    package_json_uri: '',
    service: serviceName,
    package_id
  }, {
    authorization: `${provider}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });

  return deployedServices;
}

async function allocateDAPPTokens(deployedContract,quantity='1000.0000 DAPP') {
  var key = await getCreateKeys(dappServicesContract);
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  var contract = deployedContract.address;
  await servicesTokenContract.issue({
    to: contract,
    quantity,
    memo: ''
  }, {
    authorization: `${dappServicesContract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}

async function allocateHODLTokens(deployedContract,quantity='1000.0000 DAPPHDL') {
  var key = await getCreateKeys(hodlcontract);
  let servicesTokenContract = await deployedContract.eos.contract(hodlcontract);
  var contract = deployedContract.address;
  await servicesTokenContract.issue({
    to: contract,
    quantity,
    memo: ''
  }, {
    authorization: `${hodlcontract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.active.privateKey]
  });
}


async function selectPackage({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', selectedPackage = 'default' }) {
  //var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  //var service = model.contract;
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  var contract = deployedContract.address;
  await servicesTokenContract.selectpkg({
    owner: contract,
    provider,
    service: serviceName,
    'package': selectedPackage
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function stake({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  // var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  // var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(hodlcontract);
  await servicesTokenContract.stake({
    owner: contract,
    service: serviceName,
    provider,
    quantity: `${amount} DAPPHDL`
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function unstake({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(hodlcontract);
  await servicesTokenContract.unstake({
    owner: contract,
    service: serviceName,
    provider,
    quantity: `${amount} DAPPHDL`
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function refresh({ deployedContract}) {
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(hodlcontract);
  await servicesTokenContract.refresh({
    owner: contract
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function withdraw({ deployedContract}) {
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(hodlcontract);
  await servicesTokenContract.withdraw({
    owner: contract
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

function checkDateParse(date) {
  const result = Date.parse(date);
  if (Number.isNaN(result)) {
      throw new Error('Invalid time format');
  }
  return result;
}

function dateToTimePoint(date) {
  return Math.round(checkDateParse(date + 'Z') * 1000);
}



async function activate({ deployedContract, start, end}) {
var key = await getCreateKeys(hodlcontract);
let servicesTokenContract = await deployedContract.eos.contract(hodlcontract);
await servicesTokenContract.activate({
  start:dateToTimePoint(start),
  end:dateToTimePoint(end)
}, {
  authorization: `${hodlcontract}@active`,
  broadcast: true,
  sign: true,
  keyProvider: [key.active.privateKey]
});
}

async function refund({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1' }) {
  // var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  // var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(hodlcontract);
  try {
    await servicesTokenContract.refund({
      owner: contract,
      service: serviceName,
      provider
    }, {
      authorization: `${contract}@active`,
      broadcast: true,
      sign: true
    });
  }
  catch (e) {

  }
}


async function deployDAPPAccount(code) {
  var deployedContract = await getCreateAccount(code);
  var eos = await getEos(code);
  deployedContract.address = code;
  deployedContract.eos = eos;
  await allocateDAPPTokens(deployedContract);
  return deployedContract;
}

async function deployHODLAccount(code) {
  var deployedContract = await getCreateAccount(code);
  var eos = await getEos(code);
  deployedContract.address = code;
  deployedContract.eos = eos;
  await allocateHODLTokens(deployedContract);
  return deployedContract;
}

describe(`AirHODL Tests`, () => {
  it('Create AirHODL', done => {
    (async() => {
      try {        
        await deployServicePackage({});
        var deployedHODL = await deployer.deploy(hodlC, hodlcontract);
        await allocateDAPPTokens(deployedHODL,'100000000.0000 DAPP');
        var hodlkey = await getCreateKeys(hodlcontract);
        await deployedHODL.contractInstance.create({
          issuer:hodlcontract,
          maximum_supply: '100000000.0000 DAPPHDL'
        }, {
          authorization: `${hodlcontract}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [hodlkey.active.privateKey]
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });


  it('Payout logic testing', done => {
    (async() => {
      try {
        var selectedPackage = 'default';
        var account1 = 'consumer1';
        var account2 = 'consumer2';
        var account3 = 'consumer3';
        var deployed1 = await deployHODLAccount(account1);
        var deployed2 = await deployHODLAccount(account2);
        var deployed3 = await deployHODLAccount(account3);
        await allocateDAPPTokens(deployed2,'1.0000 DAPP');
        await allocateDAPPTokens(deployed3,'1.0000 DAPP');
        
        let table = await deployed1.eos.getInfo({
          json: true,
        });

        let startDate = new Date(table.head_block_time);
        let endDate = new Date(table.head_block_time);
        startDate.setMinutes(startDate.getMinutes());
        endDate.setMinutes(endDate.getMinutes()+2);
        let start = startDate.toISOString();
        start = start.substr(0,start.length-1);
        let end = endDate.toISOString();
        end = end.substr(0,end.length-1);

        await withdraw({ deployedContract: deployed1 });

        table = await deployed1.eos.getTableRows({
          code:hodlcontract,
          scope:'DAPPHDL',
          table:'stat',
          json: true,
        });
        let forfeit = table.rows[0].forfeiture.replace(' DAPPHDL','');
        let supply = table.rows[0].supply.replace(' DAPPHDL','');

        console.log('After account 1 withdrawn stats');
        console.log(table); //for debugging and eye check

        assert(forfeit == 1000, 'should have forfeit tokens');
        assert(supply == 3000, 'should not have changed supply');

        await activate({deployedContract: deployed2, start, end});   

        //test 50% (ish) condition
        await delaySec(60);
        await withdraw({ deployedContract: deployed2 });

        table = await deployed2.eos.getTableRows({
          code:hodlcontract,
          scope:'DAPPHDL',
          table:'stat',
          json: true,
        });

        console.log('After account 2 withdrawn stats');
        console.log(table); //for debugging and eye check

        let forfeit2 = table.rows[0].forfeiture.replace(' DAPPHDL','');
        let supply2 = table.rows[0].supply.replace(' DAPPHDL','');

        table = await deployed2.eos.getTableRows({
          code:dappServicesContract,
          scope:account2,
          table:'accounts',
          json: true,
        });

        console.log('After account 2 withdrawn balance');
        console.log(table); //for debugging and eye check

        let balance2 = table.rows[0].balance.replace(' DAPP','') - 1;

        assert(forfeit2 >= 750, 'should have forfeit tokens');
        assert(supply2 <= 2250, 'should have changed supply');
        assert(balance2 >= 750, 'should have received 50% vesting');

        //test 100% (ish) condition
        await delaySec(65);
        await withdraw({ deployedContract: deployed3 });

        table = await deployed3.eos.getTableRows({
          code:hodlcontract,
          scope:'DAPPHDL',
          table:'stat',
          json: true,
        });

        console.log('After account 3 withdrawn stats');
        console.log(table); //for debugging and eye check

        let forfeit3 = table.rows[0].forfeiture.replace(' DAPPHDL','');
        let supply3 = table.rows[0].supply.replace(' DAPPHDL','');

        table = await deployed3.eos.getTableRows({
          code:dappServicesContract,
          scope:account3,
          table:'accounts',
          json: true,
        });

        console.log('After account 3 withdrawn balance');
        console.log(table); //for debugging and eye check

        let balance3 = table.rows[0].balance.replace(' DAPP','') - 1;

        assert(balance3 == 3000 - balance2, 'should have withdrawn all tokens');
        assert(forfeit3 == 0, 'should be no balance');
        assert(supply3 == 0, 'should have changed supply');       

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
