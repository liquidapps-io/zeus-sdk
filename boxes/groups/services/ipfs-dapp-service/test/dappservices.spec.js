import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork, getCreateAccount, getEos } = require('../extensions/tools/eos/utils');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { dappServicesContract, testProvidersList } = require('../extensions/tools/eos/dapp-services');
const { loadModels } = require('../extensions/tools/models');
const { getEosWrapper } = require('../extensions/tools/eos/eos-wrapper');

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

async function deployServicePackage({ serviceName = 'ipfs', serviceContractAccount = null, package_id = 'default', quota = '1.0000', min_stake_quantity = '1.0000', min_unstake_period = 2, package_period = 5, cost_per_action = 1, provider = 'pprovider1' }) {
  var models = await loadModels('dapp-services');
  var serviceModel = models.find(a => a.name == serviceName);
  await deployer.deploy(servicesC, servicescontract);
  var eos = await getEos(provider)
  var contractInstance = await eos.contract(servicescontract);
  var serviceContract = serviceContractAccount || serviceModel.contract;

  // reg provider packages
  await contractInstance.regpkg({
    newpackage: {
      id: 0,
      provider,
      api_endpoint: `oopshttp://localhost:${serviceModel.port}`,
      package_json_uri: 'http://someuri/dsp-package1.json',
      enabled: false,
      service: serviceContract,
      package_id,
      quota: `${quota} QUOTA`,
      min_stake_quantity: `${min_stake_quantity} DAPP`,
      min_unstake_period: min_unstake_period,
      package_period: package_period
    }
  }, {
    authorization: `${provider}@active`,
  });
  await contractInstance.modifypkg({
    provider,
    api_endpoint: `http://localhost:${serviceModel.port}`,
    package_json_uri: '',
    service: serviceContract,
    package_id
  }, {
    authorization: `${provider}@active`,
  });

  // reg provider and model model
  var serviceC = artifacts.require(`./${serviceName}service/`);
  var deployedService = await deployer.deploy(serviceC, serviceContract);
  contractInstance = await eos.contract(serviceContract);
  await contractInstance.regprovider({
    provider,
    model: {
      package_id,
      model: generateModel(Object.keys(serviceModel.commands))
    }
  }, {
    authorization: `${provider}@active`,
  });

  return deployedService;
}

async function allocateDAPPTokens(deployedContract, quantity = '1000.0000 DAPP') {
  var eos = await getEos(dappServicesContract);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  var contract = deployedContract.address;
  await servicesTokenContract.issue({
    to: contract,
    quantity: quantity,
    memo: ''
  }, {
    authorization: `${dappServicesContract}@active`,
  });
}
async function selectPackage({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', selectedPackage = 'default' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var eos = await getEos(contract);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  await servicesTokenContract.selectpkg({
    owner: contract,
    provider,
    service,
    'package': selectedPackage
  }, {
    authorization: `${contract}@active`,
  });
}

async function stake({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var eos = await getEos(contract);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  await servicesTokenContract.stake({
    from: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${contract}@active`,
  });
}

async function staketo({ deployedPayer, deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var payer = deployedPayer.address;
  var eos = await getEos(payer);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  await servicesTokenContract.staketo({
    from: payer,
    to: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${payer}@active`,
  });
}

async function unstake({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var eos = await getEos(contract);
  let servicesTokenContract = await eos.contract(dappServicesContract);

  await servicesTokenContract.unstake({
    to: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${contract}@active`,
  });
}

async function unstaketo({ deployedPayer, deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var payer = deployedPayer.address;
  var eos = await getEos(payer);
  let servicesTokenContract = await eos.contract(dappServicesContract);

  await servicesTokenContract.unstaketo({
    from: payer,
    to: contract,
    service,
    provider,
    quantity: `${amount} DAPP`
  }, {
    authorization: `${payer}@active`,
  });
}

async function refund({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1' }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var contract = deployedContract.address;
  var eos = await getEos(contract);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  try {
    await servicesTokenContract.refund({
      to: contract,
      service,
      provider,
      symcode: `DAPP`
    }, {
      authorization: `${contract}@active`,
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
  var eos = await getEos(payer);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  try {
    await servicesTokenContract.refundto({
      from: payer,
      to: contract,
      service,
      provider,
      symcode: `DAPP`
    }, {
      authorization: `${payer}@active`,
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
  config.keyProvider = keys.active.privateKey;
  var eosvram = deployedContract.eos;
  config.httpEndpoint = 'http://localhost:13015';
  eosvram = getEosWrapper(config);
  var testcontract = await eosvram.contract(code);
  return { testcontract, deployedContract };
}


describe(`DAPP Services Provider & Packages Tests`, () => {
  const invokeService = async(code, testcontract) => {
    var keys = await getCreateKeys(code);
    var res = await testcontract.testempty({
      uri: 'ipfs://zb2rhmy65F3REf8SZp7De11gxtECBGgUKaLdiDj7MCGCHxbDW',
    }, {
      authorization: `${code}@active`,
      keyProvider: keys.active.privateKey
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
        var package_period = 5;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage });
        var res = await testcontract.testset({
          data: {
            field1: 123,
            field2: new Buffer('hello-world').toString('hex'),
            field3: 312
          }
        }, {
          authorization: `${testContractAccount}@active`,
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
        var package_period = 5;
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
        var package_period = 5;
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
        await delaySec(package_period + 1);
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
        var package_period = 5;
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
        var testContractPayer = 'dappairhodl1';
        var testContractAccount = 'recip2';
        var package_period = 5;
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
        var package_period = 5;
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
  it('test rewards', done => {
    (async() => {
      try {
        var selectedPackage = 'test2222';
        var testContractAccount = 'con25';
        var package_period = 5;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await allocateDAPPTokens(deployedContract, '1000000.0000 DAPP');

        await stake({ deployedContract, selectedPackage, amount: '200000.0000' });

        let table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });
        //console.log(table);

        let balance0 = table.rows[0].balance.replace(' DAPP', '');
        let startStaked = table.rows[0].total_staked.replace(' DAPP', '');
        let startTS = table.rows[0].last_inflation_ts;

        await delaySec(package_period + 1);
        await stake({ deployedContract, selectedPackage, amount: '200000.0000' });

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });
        //console.log(table);

        let balance1 = table.rows[0].balance.replace(' DAPP', '');
        assert(balance1 > balance0, 'balance should have increased');

        await delaySec(package_period + 1);
        await unstake({ deployedContract, selectedPackage, amount: '100000.0000' });

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });
        //console.log(table);

        let balance2 = table.rows[0].balance.replace(' DAPP', '');
        assert(balance2 > balance1, 'balance should have increased');

        await delaySec(package_period + 1);
        await invokeService(testContractAccount, testcontract);

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });
        //console.log(table);

        let balance3 = table.rows[0].balance.replace(' DAPP', '');
        assert(balance3 > balance2, 'balance should have increased');

        await delaySec(package_period + 1);

        var key = await getCreateKeys('pprovider1');
        let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
        await servicesTokenContract.claimrewards({
          provider: 'pprovider1'
        }, {
          authorization: `pprovider1@active`,
          broadcast: true,
          sign: true,
          keyProvider: [key.active.privateKey]
        });

        let accounts = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'accounts',
          json: true,
        });
        //console.log(accounts);

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });
        //console.log(table);


        let balance4 = accounts.rows[0].balance.replace(' DAPP', '');
        let reward = table.rows[0].balance.replace(' DAPP', '');

        assert(balance4 > balance3, 'balance should have increased');
        assert(reward == 0, 'reward should be 0')

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
