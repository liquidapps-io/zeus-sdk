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

var contractCode = 'ipfsconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);

const servicescontract = dappServicesContract;
var servicesC = artifacts.require(`./dappservices/`);
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
  var serviceModel = models.find(a => a.name == serviceName);
  var deployedServices = await deployer.deploy(servicesC, servicescontract);

  var provider = 'pprovider1';
  var key = await getCreateAccount(provider);
  var serviceContract = serviceContractAccount || serviceModel.contract;

  // reg provider packages
  await deployedServices.contractInstance.regpkg({
    newpackage: {
      id: 0,
      provider,
      api_endpoint: `oopshttp://localhost:${serviceModel.port}`,
      package_json_uri: 'http://someuri/dsp-package1.json',
      enabled: 0,
      service: serviceContract,
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
    api_endpoint: `http://localhost:${serviceModel.port}`,
    package_json_uri: '',
    service: serviceContract,
    package_id
  }, {
    authorization: `${provider}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.privateKey]
  });

  // reg provider and model model
  var serviceC = artifacts.require(`./${serviceName}service/`);
  var deployedService = await deployer.deploy(serviceC, serviceContract);

  await deployedService.contractInstance.regprovider({
    provider,
    model: {
      package_id,
      model: generateModel(Object.keys(serviceModel.commands))
    }
  }, {
    authorization: `${provider}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.privateKey]
  });

  return deployedService;
}

async function allocateDAPPTokens(deployedContract) {
  var key = await getCreateKeys(dappServicesContract);
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  var contract = deployedContract.address;
  await servicesTokenContract.issue({
    to: contract,
    quantity: '1000.0000 DAPP',
    memo: ''
  }, {
    authorization: `${dappServicesContract}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.privateKey]
  });
}
async function selectPackage({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', selectedPackage = 'default' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  var contract = deployedContract.address;
  await servicesTokenContract.selectpkg({
    owner: contract,
    provider,
    service,
    'package': selectedPackage
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function stake({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  await servicesTokenContract.stake({
    from: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${contract}@active`,
    broadcast: true,
    sign: true
  });
}

async function staketo({ deployedPayer, deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var payer = deployedPayer.address;
  let servicesTokenContract = await deployedPayer.eos.contract(dappServicesContract);
  await servicesTokenContract.staketo({
    from: payer,
    to: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${payer}@active`,
    broadcast: true,
    sign: true
  });
}

async function unstake({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
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

async function unstaketo({ deployedPayer, deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var payer = deployedPayer.address;
  let servicesTokenContract = await deployedPayer.eos.contract(dappServicesContract);
  await servicesTokenContract.unstaketo({
    from: payer,
    to: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${payer}@active`,
    broadcast: true,
    sign: true
  });
}

async function refund({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  try {
    await servicesTokenContract.refund({
      to: contract,
      service,
      provider,
      symcode: `DAPP`
    }, {
      authorization: `${contract}@active`,
      broadcast: true,
      sign: true
    });
  }
  catch (e) {

  }
}

async function refundto({ deployedPayer, deployedContract, serviceName = 'ipfs', provider = 'pprovider1' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var payer = deployedPayer.address;
  let servicesTokenContract = await deployedPayer.eos.contract(dappServicesContract);
  try {
    await servicesTokenContract.refundto({
      from: payer,
      to: contract,
      service,
      provider,
      symcode: `DAPP`
    }, {
      authorization: `${payer}@active`,
      broadcast: true,
      sign: true
    });
  }
  catch (e) {

  }
}

async function deployPayer(code) {
  var deployedContract = await getCreateAccount(code);
  var eos = await getEos(code);
  deployedContract.address = code;
  deployedContract.eos = eos;
  await allocateDAPPTokens(deployedContract);
  return deployedContract;
}

async function deployConsumerContract(code) {
  var deployedContract = await deployer.deploy(ctrt, code);
  await allocateDAPPTokens(deployedContract);
  // create token
  var selectedNetwork = getNetwork(getDefaultArgs());
  var config = {
    expireInSeconds: 120,
    sign: true,
    chainId: selectedNetwork.chainId
  };
  var keys = await getCreateKeys(code);
  config.keyProvider = keys.privateKey;
  var eosvram = deployedContract.eos;
  config.httpEndpoint = 'http://localhost:13015';
  eosvram = new Eos(config);
  var testcontract = await eosvram.contract(code);
  return { testcontract, deployedContract };
}


describe(`DAPP Services Provider & Packages Tests`, () => {
  const invokeService = async(code, testcontract) => {
    var res = await testcontract.testget({
      uri: 'ipfs://zb2rhnaYrUde9d7h13vHTXeWcBJcBpEFdMgAcbXbFfM5aQxgK',
      expectedfield: 123
    }, {
      authorization: `${code}@active`,
      broadcast: true,
      sign: true
    });

    // var eventResp = JSON.parse(res.processed.action_traces[0].console);
    // assert.equal(eventResp.etype, "service_request", "wrong etype");
    // assert.equal(eventResp.provider,"", "wrong provider");
    // assert.equal(eventResp.action, "logevent", "wrong action");
  };

  it('Simple package and action', done => {
    (async() => {
      try {
        var selectedPackage = 'test124';
        var testContractAccount = 'consumer2';
        var package_period = 20;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage });
        var res = await testcontract.testset({
          data: {
            field1: 123,
            field2: 'hello-world',
            field3: 312
          }
        }, {
          authorization: `${testContractAccount}@active`,
          broadcast: true,
          sign: true
        });
        await invokeService(testContractAccount, testcontract);
        await delaySec(package_period);
        await invokeService(testContractAccount, testcontract);
        await delaySec(package_period);
        await invokeService(testContractAccount, testcontract);
        await delaySec(package_period);
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
        var selectedPackage = 'test1231';
        var testContractAccount = 'consumer5';
        var package_period = 20;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage });
        var failed = false;
        try {
          await unstake({ deployedContract, selectedPackage, amount: '500.000' });
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
  it('Simple package and double unstake', done => {
    (async() => {
      try {
        var selectedPackage = 'test121';
        var testContractAccount = 'consumer3';
        var package_period = 20;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage });
        await invokeService(testContractAccount, testcontract);
        await unstake({ deployedContract, selectedPackage, amount: '249.0000' });
        await unstake({ deployedContract, selectedPackage, amount: '251.0000' });
        await delaySec(package_period + 1);
        await refund({ deployedContract, selectedPackage });
        await delaySec(package_period + 1);
        var failed = false;
        try {
          await invokeService(testContractAccount, testcontract);
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for no package');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Simple package and double unstake too much', done => {
    (async() => {
      try {
        var selectedPackage = 'test111';
        var testContractAccount = 'consumer4';
        var package_period = 20;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage });
        await invokeService(testContractAccount, testcontract);
        await unstake({ deployedContract, selectedPackage, amount: '250.0000' });
        var failed = false;
        try {
          await unstake({ deployedContract, selectedPackage, amount: '251.0000' });

        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for no package');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Simple package and unstake third party', done => {
    (async() => {
      try {
        var selectedPackage = 'third123';
        var testContractPayer = 'payer2';
        var testContractAccount = 'recip2';
        var package_period = 20;
        var deployedPayer = await deployPayer(testContractPayer);
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await staketo({ deployedPayer, deployedContract, selectedPackage });
        await invokeService(testContractAccount, testcontract);
        await unstaketo({ deployedPayer, deployedContract, selectedPackage });
        await delaySec(package_period + 1);
        await refundto({ deployedPayer, deployedContract, selectedPackage });
        await delaySec(package_period + 1);
        var failed = false;
        try {
          await invokeService(testContractAccount, testcontract);
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for no package');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('not enough stake', done => {
    (async() => {
      try {
        var selectedPackage = 'test1111';
        var testContractAccount = 'con14';
        var package_period = 20;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage, amount: '0.1000' });
        var failed = false;
        try {
          await invokeService(testContractAccount, testcontract);
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for not enough stake');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
