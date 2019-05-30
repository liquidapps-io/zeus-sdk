import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getNetwork, getCreateKeys, getCreateAccount, getEos } = require('../extensions/tools/eos/utils');
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
    keyProvider: [key.privateKey]
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
    keyProvider: [key.privateKey]
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
    keyProvider: [key.privateKey]
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
    keyProvider: [key.privateKey]
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
  keyProvider: [key.privateKey]
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
          keyProvider: [hodlkey.privateKey]
        });
        var deployedAccount = await deployHODLAccount('test1');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Simple package and unstake', done => {
    (async() => {
      try {
        var selectedPackage = 'default';
        var testContractAccount = 'consumer1';
        var deployedContract = await deployHODLAccount(testContractAccount);        
        await selectPackage({ deployedContract, selectedPackage });
        var failed = false;
        try {
          await stake({ deployedContract, selectedPackage });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for no balance');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  


  it('Attempts to withdraw prior to activation', done => {
    (async() => {
      try {
        var selectedPackage = 'default';
        var testContractAccount = 'consumer4';
        var deployedContract = await deployHODLAccount(testContractAccount);
        
        let table = await deployedContract.eos.getInfo({
          json: true,
        });

        let startDate = new Date(table.head_block_time);
        let endDate = new Date(table.head_block_time);
        startDate.setMinutes(startDate.getMinutes()-1);
        endDate.setMinutes(endDate.getMinutes()+2);
        let start = startDate.toISOString();
        start = start.substr(0,start.length-1);
        let end = endDate.toISOString();
        end = end.substr(0,end.length-1);

        var failed = false;
        try {
          await withdraw({ deployedContract });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for not activated');
        await activate({deployedContract, start, end});
        
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Attempts to withdraw after activation', done => {
    (async() => {
      try {
        var selectedPackage = 'default';
        var testContractAccount = 'consumer5';
        var deployedContract = await deployHODLAccount(testContractAccount);
        await allocateDAPPTokens(deployedContract,'1.0000 DAPP');

        let table = await deployedContract.eos.getTableRows({
          code:dappServicesContract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });
        let oldBalance = table.rows[0].balance.replace(' DAPP','');

        await delaySec(61);
        await withdraw({ deployedContract });
        

        table = await deployedContract.eos.getTableRows({
          code:dappServicesContract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });
        let newBalance = table.rows[0].balance.replace(' DAPP','');

        table = await deployedContract.eos.getTableRows({
          code:hodlcontract,
          scope:'DAPPHDL',
          table:'stat',
          json: true,
        });
        let forfeit = table.rows[0].forfeiture.replace(' DAPPHDL','');

        assert(newBalance > oldBalance, 'should have withdrawn tokens');
        assert(forfeit > 0, 'should have forfeit tokens');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Simple package and unstake', done => {
    (async() => {
      try {
        var selectedPackage = 'default';
        var testContractAccount = 'consumer1';
        var deployedContract = await deployHODLAccount(testContractAccount);        
        await selectPackage({ deployedContract, selectedPackage });

        await refresh({ deployedContract });
        let table = await deployedContract.eos.getTableRows({
          code:hodlcontract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });
        let balance = table.rows[0].balance.replace(' DAPPHDL','');

        await stake({ deployedContract, selectedPackage, amount:`${Number.parseFloat(balance).toFixed(4)}`});

        table = await deployedContract.eos.getTableRows({
          code:hodlcontract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });

        console.log(table);

        var failed = false;
        try {
          await unstake({ deployedContract, selectedPackage, amount:`${Number.parseFloat(balance+50).toFixed(4)}` });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for bad unstake');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });


  // it('Simple package and double unstake', done => {
  //   (async() => {
  //     try {
  //       var selectedPackage = 'default';
  //       var testContractAccount = 'consumer2';
  //       var package_period = 20;
  //       var deployedContract = await deployHODLAccount(testContractAccount);
  //       await selectPackage({ deployedContract, selectedPackage });

  //       await refresh({ deployedContract });
  //       let table = await deployedContract.eos.getTableRows({
  //         code:hodlcontract,
  //         scope:testContractAccount,
  //         table:'accounts',
  //         json: true,
  //       });
  //       let balance = table.rows[0].balance.replace(' DAPPHDL','');

  //       await stake({ deployedContract, selectedPackageamount:`${Number.parseFloat(balance).toFixed(4)}`});
  //       await unstake({ deployedContract, selectedPackage, amount:`${Number.parseFloat((balance/2)-1.5).toFixed(4)}`});
  //       await unstake({ deployedContract, selectedPackage, amount:`${Number.parseFloat((balance/2)+1).toFixed(4)}`});
  //       await delaySec(package_period + 1);
  //       await refund({ deployedContract, selectedPackage });
  //       await delaySec(package_period + 1);
  //       done();
  //     }
  //     catch (e) {
  //       done(e);
  //     }
  //   })();
  // });

  it('Simple package and double unstake too much', done => {
    (async() => {
      try {
        var selectedPackage = 'default';
        var testContractAccount = 'consumer3';
        var deployedContract = await deployHODLAccount(testContractAccount);
        await selectPackage({ deployedContract, selectedPackage });
        await refresh({ deployedContract });
        let table = await deployedContract.eos.getTableRows({
          code:hodlcontract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });
        let balance = table.rows[0].balance.replace(' DAPPHDL','');

        await stake({ deployedContract, selectedPackageamount:`${Number.parseFloat(balance).toFixed(4)}`});
        await unstake({ deployedContract, selectedPackage, amount:`${Number.parseFloat(balance/2).toFixed(4)}`});
        var failed = false;
        try {
          await unstake({ deployedContract, selectedPackage, amount:`${Number.parseFloat((balance/2)+1).toFixed(4)}`});
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for bad unstake');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Stake  after activation and withdrawal by other', done => {
    (async() => {
      try {
        var selectedPackage = 'default';
        var testContractAccount = 'consumer11';
        var testContractAccount2 = 'consumer13';
        var package_period = 20;
        var deployedContract = await deployHODLAccount(testContractAccount);  
        var deployedContract2 = await deployHODLAccount(testContractAccount2);   
        await allocateDAPPTokens(deployedContract,'1.0000 DAPP');  
        await allocateDAPPTokens(deployedContract2,'1.0000 DAPP');  
        await selectPackage({ deployedContract, selectedPackage });

        await refresh({ deployedContract });
        let table = await deployedContract.eos.getTableRows({
          code:hodlcontract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });
        let balance = table.rows[0].balance.replace(' DAPPHDL','');

        await withdraw({ deployedContract: deployedContract2 });

        await stake({ deployedContract, selectedPackageamount:`${Number.parseFloat(balance).toFixed(4)}`});

        table = await deployedContract.eos.getTableRows({
          code:hodlcontract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });
        let newBalance = table.rows[0].balance.replace(' DAPPHDL','');
        assert(newBalance > 0, 'should have a larger balance');

        var failed = false;
        try {
          await withdraw({ deployedContract });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for still staked');

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  
  it('Attempts to withdraw after completion', done => {
    (async() => {
      try {
        var selectedPackage = 'default';
        var testContractAccount = 'consumer12';
        var deployedContract = await deployHODLAccount(testContractAccount);
        await allocateDAPPTokens(deployedContract,'1.0000 DAPP');

        let table = await deployedContract.eos.getTableRows({
          code:dappServicesContract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });
        let oldBalance = table.rows[0].balance.replace(' DAPP','');

        await delaySec(61);
        await withdraw({ deployedContract });
        

        table = await deployedContract.eos.getTableRows({
          code:dappServicesContract,
          scope:testContractAccount,
          table:'accounts',
          json: true,
        });
        let newBalance = table.rows[0].balance.replace(' DAPP','');

        assert(newBalance > oldBalance && newBalance > 1001, 'should have withdrawn tokens');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

});
