require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getCreateAccount, getEos } = requireBox('seed-eos/tools/eos/utils');
const { getTableRowsSec } = requireBox('dapp-services/services/dapp-services-node/common');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { dappServicesContract, dappRewardsContract } = requireBox('dapp-services/tools/eos/dapp-services');
const { loadModels } = requireBox('seed-models/tools/models');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

var contractCode = 'ipfsconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
var contractCodeSplit = 'splitter';
var ctrtSplit = artifacts.require(`./${contractCodeSplit}/`);

const servicescontract = dappServicesContract;
var servicesC = artifacts.require(`./dappservices/`);
const { eosio } = requireBox('test-extensions/lib/index');
const delaySec = sec => eosio.delay(sec * 1000);

var generateModel = (commandNames, cost_per_action = 1) => {
  var model = {};
  commandNames.forEach(a => {
    model[`${a}_model_field`] = {
      cost_per_action
    };
  });
  return model;
};

async function deployServicePackage({ 
  serviceName = 'ipfs', 
  serviceContractAccount = null, 
  package_id = 'default', 
  quota = '1.0000', 
  min_stake_quantity = '1.0000', 
  min_unstake_period = 2, 
  package_period = 5, 
  cost_per_action = 1, 
  provider = 'pprovider1', 
  inflation = 2.71
}) {
  var models = await loadModels('dapp-services');
  var serviceModel = models.find(a => a.name == serviceName);
  await deployer.deploy(servicesC, servicescontract);
  var eos = await getEos(provider);
  var contractInstance = await eos.contract(servicescontract);
  var serviceContract = serviceContractAccount || serviceModel.contract;

  // reg provider packages
  await contractInstance.regpkg({
    newpackage: {
      id: 0,
      provider,
      api_endpoint: `http://localhost:${serviceModel.port}`,
      package_json_uri: 'http://someuri/dsp-package1.json',
      enabled: true,
      service: serviceContract,
      package_id,
      quota: `${quota} QUOTA`,
      min_stake_quantity: `${min_stake_quantity} DAPP`,
      min_unstake_period: min_unstake_period,
      package_period: package_period,
      annual_inflation: inflation,
      pricing: []
    },
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
  await contractInstance.enablepkg({
    provider,
    package_id,
    service: serviceContract
  }, {
    authorization: `${provider}@active`,
  });

  // create service account
  await getCreateAccount(serviceContract);
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
  let systemContract = await eos.contract('eosio');
  await servicesTokenContract.selectpkg({
    owner: contract,
    provider,
    service,
    'package': selectedPackage
  }, {
    authorization: `${contract}@active`,
  });
  await systemContract.updateauth({
    account: contract,
    permission: 'dsp',
    parent: 'active',
    auth: {
      threshold: 1,
      keys: [],
      accounts: [{
        permission: { actor: provider, permission: 'active' },
        weight: 1,
      }],
      waits: []
    }
  }, { authorization: `${contract}@active` });
  try {
    var commandNames = Object.keys(model.commands);
    await Promise.all(commandNames.map(async (command) => {
      await systemContract.linkauth({
        account: contract,
        code: contract,
        type: `x${command}`,
        requirement: 'dsp'
      }, { authorization: `${contract}@active` });
    }));
  } catch (e) { }
}

async function preSelectPackage({ deployedContract, serviceName = 'ipfs', provider = 'pprovider1', selectedPackage = 'default', delegators = [], depth = 0 }) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);
  var contract = deployedContract.address;
  if (depth == 0) {
    await servicesTokenContract.retirestake({
      owner: contract,
      provider,
      service,
      'package': selectedPackage,
      delegators
    }, {
      authorization: `${contract}@active`,
      broadcast: true,
      sign: true
    });
  } else {
    await servicesTokenContract.preselectpkg({
      owner: contract,
      provider,
      service,
      'package': selectedPackage,
      depth
    }, {
      authorization: `${contract}@active`,
      broadcast: true,
      sign: true
    });
  }

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

async function staketo({ deployedPayer, deployedContract, serviceName = 'ipfs', provider = 'pprovider1', amount = '500.0000', transfer = false }) {
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
    quantity: `${amount} DAPP`,
    transfer
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

async function setcost(serviceName = 'ipfs', provider = 'pprovider1', package_id, action, cost) {
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = model.contract;
  var eos = await getEos(provider);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  try {
    await servicesTokenContract.pricepkg({
      provider,
      package_id,
      service,
      action,
      cost
    }, {
      authorization: `${provider}@active`,
    });
  }
  catch (e) {
    console.log(JSON.stringify(e));
  }
}

async function updateinflation(inflation_per_block) {
  var eos = await getEos(dappServicesContract);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  await servicesTokenContract.updinflation({
    inflation_per_block
  }, {
    authorization: `${dappServicesContract}@active`,
  });
}

async function updateGovAllocation(gov_allocation) {
  var eos = await getEos(dappServicesContract);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  await servicesTokenContract.updgovalloc({
    gov_allocation
  }, {
    authorization: `${dappServicesContract}@active`,
  });
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

function convertInflation(inflation_per_block) {
  // 100.0 * ( (1 + 0.00000000042394888)^63,072,000 - 1) = 2.7100006741956671395612853715339494176104006721609767429832997964 https://www.wolframalpha.com/input/?i=2.7100006741956671395612853715339494176104006721609767429832997964&assumption=%22ClashPrefs%22+-%3E+%7B%22Math%22%7D
  let blocks_per_year = 7200 * 24 * 365;
  return 100.0 * (Math.pow(1.0 + parseFloat(inflation_per_block), blocks_per_year) - 1.0);
}

function inflationToBlock(inflation) {
  // 2 blocks per second, 60 sec / min, 60 m / hr * 24 hr / day * 365 days / year
  // (1 + 15/100)^(1/63,072,000) - 1 = 2.2159110624367185822983091149543260791518375962948232458330 × 10^-9 https://www.wolframalpha.com/input/?i=%281+%2B+15%2F100%29%5E%281%2F63%2C072%2C000%29+-+1
  let blocks_per_year = 2 * 60 * 60 * 24 * 365;
  return Math.pow(parseFloat(inflation) / 100 + 1, 1 / blocks_per_year) - 1
}

async function openBalance(account, splitter) {
  let eos = await getEos(splitter);
  let servicesTokenContract = await eos.contract(splitter);
  let keys = await getCreateKeys(account);
  await servicesTokenContract.open({
      owner: account,
      ram_payer: account
  }, {
    authorization: `${account}@active`,
    keyProvider: [keys.active.privateKey]
  });
  eos = await getEos(dappServicesContract);
  servicesTokenContract = await eos.contract(dappServicesContract);
  keys = await getCreateKeys(account);
  await servicesTokenContract.open({
      owner: account,
      symbol: "DAPP",
      ram_payer: account
  }, {
    authorization: `${account}@active`,
    keyProvider: [keys.active.privateKey]
  });
}

const invokeService = async (code, testcontract) => {
  var keys = await getCreateKeys(code);
  var res = await testcontract.testempty({
    uri: 'ipfs://zb2rhmy65F3REf8SZp7De11gxtECBGgUKaLdiDj7MCGCHxbDW',
  }, {
    authorization: `${code}@active`,
    keyProvider: keys.active.privateKey
  });
};

describe(`DAPP Services Provider & Packages Tests`, () => {
    // before(done => {
    //   (async () => {
    //     try {
    //       done();
    //     }
    //     catch (e) {
    //       done(e);
    //     }
    //   })();
    // });

  it('Blacklist', done => {
    (async () => {
      try {
        var testContractAccount = 'blklisttst1';
        var testContractAccount2 = 'blklisttst2';
        const keys = await getCreateAccount(testContractAccount);
        const keys2 = await getCreateAccount(testContractAccount2);
        var eos = await getEos(dappServicesContract);
        let servicesTokenContract = await eos.contract(dappServicesContract);
        await servicesTokenContract.issue({
          to: testContractAccount,
          quantity: "1000.0000 DAPP",
          memo: ''
        }, {
          authorization: `${dappServicesContract}@active`,
        });
        var eos = await getEos('pprovider1');
        let table = await eos.getTableRows({
          code: dappServicesContract,
          scope: testContractAccount,
          table: 'accounts',
          json: true,
        });
        console.log(table);
        const balance0 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        console.log('balance0',balance0);
        await servicesTokenContract.transfer({
          from: testContractAccount,
          to: testContractAccount2,
          quantity: "1.0000 DAPP",
          memo: ''
        }, {
          authorization: `${testContractAccount}@active`,
          keyProvider: [keys.active.privateKey]
        });
        table = await eos.getTableRows({
          code: dappServicesContract,
          scope: testContractAccount,
          table: 'accounts',
          json: true,
        });
        console.log(table);
        const balance1 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        console.log('balance1',balance1);
        assert(balance1 < balance0, 'balance should have increased');
        await servicesTokenContract.addbl({
          account: testContractAccount
        }, {
          authorization: `${dappServicesContract}@active`,
        });
        table = await eos.getTableRows({
          code: dappServicesContract,
          scope: dappServicesContract,
          table: 'blacklist',
          json: true,
        });
        console.log(table);
        console.log('here')
        try {
          await servicesTokenContract.transfer({
            from: testContractAccount,
            to: testContractAccount2,
            quantity: "1.0000 DAPP",
            memo: ''
          }, {
            authorization: `${testContractAccount}@active`,
            keyProvider: [keys.active.privateKey]
          });
        } catch(e) {
          console.log(e);
          console.log(e.details);
          console.log(e.message);
        }
        await servicesTokenContract.rmbl({
          account: testContractAccount
        }, {
          authorization: `${dappServicesContract}@active`,
        });
        await servicesTokenContract.transfer({
          from: testContractAccount,
          to: testContractAccount2,
          quantity: "1.0000 DAPP",
          memo: ''
        }, {
          authorization: `${testContractAccount}@active`,
          keyProvider: [keys.active.privateKey]
        });
        // transfer
        // blacklist
        // transfer fail
        // whitelist
        // transfer pass
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Simple package and action', done => {
    (async () => {
      try {
        var selectedPackage = 'test124';
        var testContractAccount = 'consumer2';
        var packagePeriod = 5;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
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
        await delaySec(packagePeriod);
        await invokeService(testContractAccount, testcontract);
        await delaySec(packagePeriod);
        await invokeService(testContractAccount, testcontract);
        await delaySec(packagePeriod);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Simple package and unstake', done => {
    (async () => {
      try {
        var selectedPackage = 'test1231';
        var testContractAccount = 'consumer5';
        var packagePeriod = 5;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
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

  it('Simple package and unstake 0s package', done => {
    (async () => {
      try {
        var selectedPackage = 'test12311';
        var testContractAccount = 'consumer5a';
        var package_period = 0;
        var { deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, package_period });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage });
        var failed = true;
        try {
          await unstake({ deployedContract, selectedPackage });
          await refund({ deployedContract, selectedPackage });
        }
        catch (e) {
          failed = false;
        }
        assert(failed, 'should not have failed for bad unstake');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Simple package and double unstake', done => {
    (async () => {
      try {
        var selectedPackage = 'test121';
        var testContractAccount = 'consumer3';
        var packagePeriod = 5;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage });
        await invokeService(testContractAccount, testcontract);
        await unstake({ deployedContract, selectedPackage, amount: '249.0000' });
        await unstake({ deployedContract, selectedPackage, amount: '251.0000' });
        await delaySec(packagePeriod + 1);
        await refund({ deployedContract, selectedPackage });
        await delaySec(packagePeriod + 1);
        var failed = false;
        await delaySec(packagePeriod + 1);
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
    (async () => {
      try {
        var selectedPackage = 'test111';
        var testContractAccount = 'consumer4';
        var packagePeriod = 5;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
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
    (async () => {
      try {
        var selectedPackage = 'third123';
        var testContractPayer = 'dappairhodl1';
        var testContractAccount = 'recip2';
        var packagePeriod = 5;
        var deployedPayer = await deployPayer(testContractPayer);
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await staketo({ deployedPayer, deployedContract, selectedPackage });
        await invokeService(testContractAccount, testcontract);
        await unstaketo({ deployedPayer, deployedContract, selectedPackage });
        await delaySec(packagePeriod + 1);
        await refundto({ deployedPayer, deployedContract, selectedPackage });
        await delaySec(packagePeriod + 1);
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
  it('Simple package and transfer stake third party', done => {
    (async () => {
      try {
        var selectedPackage = 'third111';
        var testContractPayer = 'transfer1';
        var testContractAccount = 'transfer2';
        var packagePeriod = 5;
        var deployedPayer = await deployPayer(testContractPayer);
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await staketo({ deployedPayer, deployedContract, selectedPackage, transfer: true });
        await invokeService(testContractAccount, testcontract);
        await unstake({ deployedPayer: deployedContract, deployedContract, selectedPackage });
        await delaySec(packagePeriod + 1);
        await refund({ deployedContract, selectedPackage });
        await delaySec(packagePeriod + 1);
        var failed = false;
        try {
          await invokeService(testContractAccount, testcontract);
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for no stake');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Simple package and stake third party - refund on package change', done => {
    (async () => {
      try {
        var selectedPackage = 'third315';
        var nextPackage = 'third325';
        var testContractPayer = 'payer1';
        var testContractPayer2 = 'payer2';
        var testContractAccount = 'recip3';
        var packagePeriod = 5;
        var deployedPayer = await deployPayer(testContractPayer);
        var deployedPayer2 = await deployPayer(testContractPayer2);
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await deployServicePackage({ package_id: nextPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await staketo({ deployedPayer, deployedContract, selectedPackage });
        await staketo({ deployedPayer: deployedPayer2, deployedContract, selectedPackage });

        await invokeService(testContractAccount, testcontract);

        var failed = false;
        try {
          await selectPackage({ deployedContract, selectedPackage: nextPackage });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for thid party stakes');

        await preSelectPackage({ deployedContract, selectedPackage, depth: 2 });
        await selectPackage({ deployedContract, selectedPackage: nextPackage });
        await delaySec(packagePeriod + 1);
        failed = false;
        try {
          await invokeService(testContractAccount, testcontract);
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for no stake');

        await staketo({ deployedPayer, deployedContract, selectedPackage: nextPackage });
        await staketo({ deployedPayer: deployedPayer2, deployedContract, selectedPackage: nextPackage });
        await invokeService(testContractAccount, testcontract);

        failed = false;
        try {
          await selectPackage({ deployedContract, selectedPackage });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for thid party stakes');
        await preSelectPackage({ deployedContract, selectedPackage: nextPackage, delegators: [testContractPayer, testContractPayer2] });
        await selectPackage({ deployedContract, selectedPackage });
        await delaySec(packagePeriod + 1);

        failed = false;
        try {
          await invokeService(testContractAccount, testcontract);
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed for no stake');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Third party preSelectPackage more than depth', done => {
    (async () => {
      try {
        var selectedPackage = 'thirdparty1';
        var nextPackage = 'thirdparty2';
        var testContractPayer = 'thirdparty3';
        var testContractPayer2 = 'thirdparty4';
        var testContractAccount = 'thirdparty5';
        var packagePeriod = 5;
        var deployedPayer = await deployPayer(testContractPayer);
        var deployedPayer2 = await deployPayer(testContractPayer2);
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await deployServicePackage({ package_id: nextPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        // stake to 2 packages
        await staketo({ deployedPayer, deployedContract, selectedPackage });
        await staketo({ deployedPayer: deployedPayer2, deployedContract, selectedPackage });

        await invokeService(testContractAccount, testcontract);

        var failed = true;
        try {
          // try to preSelectPackage for 3 packages (depth)
          await preSelectPackage({ deployedContract, selectedPackage, depth: 3 });
        }
        catch (e) {
          failed = false;
        }
        assert(failed, 'should not have failed for thid party preSelectPackage more than depth');
        await selectPackage({ deployedContract, selectedPackage: nextPackage });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Third party retireStake more than delegators staked', done => {
    (async () => {
      try {
        var selectedPackage = 'thirdpart1';
        var nextPackage = 'thirdpart2';
        var testContractPayer = 'thirdpart3';
        var testContractPayer2 = 'thirdpart4';
        var testContractAccount = 'thirdpart5';
        var packagePeriod = 5;
        var deployedPayer = await deployPayer(testContractPayer);
        var deployedPayer2 = await deployPayer(testContractPayer2);
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await deployServicePackage({ package_id: nextPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await staketo({ deployedPayer, deployedContract, selectedPackage });
        await staketo({ deployedPayer: deployedPayer2, deployedContract, selectedPackage });

        await invokeService(testContractAccount, testcontract);
        await preSelectPackage({ deployedContract, selectedPackage, delegators: [testContractPayer, testContractPayer2, "randomdelega"] });

        var failed = true;
        try {
          await selectPackage({ deployedContract, selectedPackage: nextPackage });
        }
        catch (e) {
          failed = false;
        }
        assert(failed, 'should have succeeded for clearing third party stakes');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Third party test select new package with different provider/service pair', done => {
    (async () => {
      try {
        var selectedPackage = 'thirdpar11';
        var nextPackage = 'thirdpar22';
        var testContractPayer = 'thirdpar33';
        var testContractPayer2 = 'thirdpar44';
        var testContractAccount = 'thirdpar55';
        var packagePeriod = 5;
        var deployedPayer = await deployPayer(testContractPayer);
        var deployedPayer2 = await deployPayer(testContractPayer2);
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await deployServicePackage({ serviceName: 'log', package_id: nextPackage, packagePeriod, provider: 'pprovider2' });
        await deployServicePackage({ package_id: nextPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await staketo({ deployedPayer, deployedContract });
        var failed = true;
        try {
          await selectPackage({ deployedContract, selectedPackage: nextPackage, serviceName: 'log', provider: 'pprovider2' });
        }
        catch (e) {
          failed = false;
        }
        assert(failed, 'should have succeeded because selecting different provider/service pair, no need to clear third party stakes');
        await staketo({ serviceName: 'log', deployedPayer: deployedPayer2, deployedContract, provider: 'pprovider2' });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('not enough stake', done => {
    (async () => {
      try {
        var selectedPackage = 'test1111';
        var testContractAccount = 'con14';
        var packagePeriod = 5;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
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
    (async () => {
      try {
        var selectedPackage = 'test2222';
        var testContractAccount = 'con25';
        var packagePeriod = 5;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await allocateDAPPTokens(deployedContract, '1000000.0000 DAPP');

        await stake({ deployedContract, selectedPackage, amount: '200000.0000' });

        let table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });

        const balance0 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));

        await delaySec(packagePeriod + 1);
        await stake({ deployedContract, selectedPackage, amount: '200000.0000' });

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });

        const balance1 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balance1 > balance0, 'balance should have increased');

        await delaySec(packagePeriod + 1);
        await unstake({ deployedContract, selectedPackage, amount: '100000.0000' });

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });

        const balance2 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balance2 > balance1, 'balance should have increased');

        await delaySec(packagePeriod + 1);
        await invokeService(testContractAccount, testcontract);

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });

        const balance3 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balance3 > balance2, 'balance should have increased');

        await delaySec(packagePeriod + 1);

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

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });

        const balance4 = parseFloat(accounts.rows[0].balance.replace(' DAPP', ''));
        const reward = parseFloat(table.rows[0].balance.replace(' DAPP', ''));

        assert(balance4 > balance3, 'balance should have increased');
        assert(reward == 0, 'reward should be 0')

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Wrong token symbol precision (4,QUOTA / 4,DAPP) when registering service package', done => {
    (async () => {
      try {
        var selectedPackage = 'test136';
        var packagePeriod = 5;
        var failed = false;
        try {
          await deployServicePackage({ package_id: selectedPackage, packagePeriod, min_stake_quantity: "1 DAPP" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed, DAPP token requires 4 decimals of precision (wrong: 1 DAPP -> right: 1.0000 DAPP');
        failed = false;
        try {
          await deployServicePackage({ package_id: selectedPackage, packagePeriod, quota: "1 QUOTA" });
        }
        catch (e) {
          failed = true;
        }
        assert(failed, 'should have failed, QUOTA token requires 4 decimals of precision (wrong: 1 QUOTA -> right: 1.0000 QUOTA');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it.skip('Inflation tuning', done => {
    (async () => {
      try {
        var eos = await getEos('pprovider1');
        let table = await eos.getTableRows({
          code: dappServicesContract,
          scope: 'DAPP',
          table: 'statext',
          json: true,
        });

        let totalStake = Number(table.rows[0].staked.replace(" DAPP", ""));
        let prevInflation = convertInflation(table.rows[0].inflation_per_block)
        let prevAvgInflation = parseFloat(prevInflation.toFixed(2));

        let expectedInflation = ((prevInflation * totalStake) + 500000.0) / (totalStake + 100000.0);
        let expectedAvgInflation = parseFloat(expectedInflation.toFixed(2));

        var selectedPackage = 'inflate5';
        var testContractAccount = 'whale1';
        var package_period = 5;
        var deployedContract = await deployPayer(testContractAccount);
        await allocateDAPPTokens(deployedContract,'100000.0000 DAPP');
        await deployServicePackage({ package_id: selectedPackage, package_period, inflation: 5.0});
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage, amount: '100000.0000'});

        table = await eos.getTableRows({
          code: dappServicesContract,
          scope: 'DAPP',
          table: 'statext',
          json: true,
        });
        
        let updatedStake = Number(table.rows[0].staked.replace(" DAPP", ""));
        let nextInflation = convertInflation(table.rows[0].inflation_per_block);
        let nextAvgInflation = parseFloat(nextInflation.toFixed(2));
        assert.equal(nextAvgInflation, expectedAvgInflation, "inflation did not update correctly");

        expectedInflation = ((nextInflation * updatedStake) - 250000.0) / (updatedStake - 50000.0);
        expectedAvgInflation = parseFloat(expectedInflation.toFixed(2));

        await unstake({ deployedContract, selectedPackage, amount: '50000.0000' });
        await delaySec(package_period + 1);
        await refund({ deployedContract, selectedPackage });
        await delaySec(package_period + 1);

        table = await eos.getTableRows({
          code: dappServicesContract,
          scope: 'DAPP',
          table: 'statext',
          json: true,
        });
        
        updatedStake = Number(table.rows[0].staked.replace(" DAPP", ""));
        nextInflation = convertInflation(table.rows[0].inflation_per_block);
        nextAvgInflation = parseFloat(nextInflation.toFixed(2));
        assert.equal(nextAvgInflation, expectedAvgInflation, "inflation did not update correctly");

        await unstake({ deployedContract, selectedPackage, amount: '50000.0000' });
        await delaySec(package_period + 1);
        await refund({ deployedContract, selectedPackage });
        await delaySec(package_period + 1);

        table = await eos.getTableRows({
          code: dappServicesContract,
          scope: 'DAPP',
          table: 'statext',
          json: true,
        });
        
        updatedStake = Number(table.rows[0].staked.replace(" DAPP", ""));
        nextInflation = convertInflation(table.rows[0].inflation_per_block);
        nextAvgInflation = parseFloat(nextInflation.toFixed(2));
        assert.equal(nextAvgInflation, prevAvgInflation, "inflation did not update correctly");

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('Custom action quota pricing', done => {
    (async () => {
      try {
        var eos = await getEos(dappServicesContract);
        var selectedPackage = 'testpay123';
        var testContractAccount = 'testpay123';
        var packagePeriod = 720;
        var { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await stake({ deployedContract, selectedPackage });
        await setcost("ipfs", "pprovider1", selectedPackage, "warmup", 5);
        await setcost("ipfs", "pprovider1", selectedPackage, "commit", 5);

        //FIRST
        await invokeService(testContractAccount, testcontract);
        let table = await getTableRowsSec(eos.rpc, dappServicesContract, "accountext", "DAPP", [null, testContractAccount, "ipfsservice1", "pprovider1"], 1, 'sha256', 2);
        let first = Number(table[0].quota.replace(" QUOTA", ""));

        //SECOND
        await invokeService(testContractAccount, testcontract);
        table = await getTableRowsSec(eos.rpc, dappServicesContract, "accountext", "DAPP", [null, testContractAccount, "ipfsservice1", "pprovider1"], 1, 'sha256', 2);
        let second = Number(table[0].quota.replace(" QUOTA", ""));
        assert(second <= (first - 0.0005), "quota must decrease by 5");

        //THIRD
        await invokeService(testContractAccount, testcontract);
        table = await getTableRowsSec(eos.rpc, dappServicesContract, "accountext", "DAPP", [null, testContractAccount, "ipfsservice1", "pprovider1"], 1, 'sha256', 2);
        let third = Number(table[0].quota.replace(" QUOTA", ""));
        assert(third <= (second - 0.0005), "quota must decrease by 5");

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Max supply equals supply', done => {
    (async () => {
      try {
        var testContractAccount = 'testsupply1';
        var { deployedContract } = await deployConsumerContract(testContractAccount);
        let table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'DAPP',
          table: 'stat',
          json: true,
        });
        let maxSupply = table.rows[0].max_supply;
        let supply = table.rows[0].supply;
        assert((supply === maxSupply), 'supply should equal max supply');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Try inflation exceeds/under limit', done => {
    (async () => {
      try {
        var testContractAccount = 'testinflate1';
        var selectedPackage = 'testpay123';
        var { deployedContract } = await deployConsumerContract(testContractAccount);
        let failed = false;
        try {
          await deployServicePackage({ package_id: selectedPackage, inflation: 9999.0 });
        } catch(e) {
          failed = true
        }
        failed = false
        try {
          await deployServicePackage({ package_id: selectedPackage, inflation: -10 });
        } catch(e) {
          failed = true
        }
        assert(failed, "should have failed, inflation must be between 0 and 5 %")
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('Adjust inflation and split rewards with gov', done => {
    (async () => {
      try {
        const testContractAccount = 'testinflate2';
        const { deployedContract } = await deployConsumerContract(testContractAccount);
        let table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'DAPP',
          table: 'statext',
          json: true
        });
        const prevInflation = convertInflation(table.rows[0].inflation_per_block);
        const prevAvgInflation = parseFloat(prevInflation.toFixed(2));
        assert.equal(prevAvgInflation, 2.71, "error, inflation previously set to 2%");
        const newInflationPerBlock = inflationToBlock(15);
        const governanceAllocation = (15 - 2.71)/15;
        await updateinflation(newInflationPerBlock);
        await updateGovAllocation(governanceAllocation);
        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'DAPP',
          table: 'statext',
          json: true
        });
        const newInflation = convertInflation(table.rows[0].inflation_per_block);
        const newAvgInflation = parseFloat(newInflation.toFixed(2));
        assert.equal(newAvgInflation, 15, "error, inflation not updated to 15%");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('test split rewards with splitter', done => {
    (async () => {
      try {
        const selectedPackage = 'test2223';
        const testContractAccount = 'contr25';
        const packagePeriod = 5;
        const { testcontract, deployedContract } = await deployConsumerContract(testContractAccount);
        await deployServicePackage({ package_id: selectedPackage, packagePeriod });
        await selectPackage({ deployedContract, selectedPackage });
        await allocateDAPPTokens(deployedContract, '1000000.0000 DAPP');
        const testAccount1 = 'govaccount1';
        const testAccount2 = 'govaccount2';
        const splitterKeys = await getCreateAccount(dappRewardsContract);
        await getCreateAccount(testAccount1);
        await getCreateAccount(testAccount2);
        const splitterContract = await deployer.deploy(ctrtSplit, dappRewardsContract);
        await openBalance(testAccount1, dappRewardsContract);
        await openBalance(testAccount2, dappRewardsContract);
        await openBalance(dappRewardsContract, dappRewardsContract);
        const percentage = '0.5';
        const splitterContractInstance = splitterContract.contractInstance;
        await splitterContractInstance.setup(
        {
            payouts: [
                {
                  account: testAccount1,
                  percentage 
                },
                {
                  account: testAccount2,
                  percentage
                }
            ]
        }, {
          authorization: `${dappRewardsContract}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [splitterKeys.active.privateKey],
        });

        await stake({ deployedContract, selectedPackage, amount: '200000.0000' });

        let table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });
        const balance0 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: dappRewardsContract,
          table: 'reward',
          json: true,
        });
        const balanceGov0 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));

        await delaySec(packagePeriod + 1);
        await stake({ deployedContract, selectedPackage, amount: '200000.0000' });

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });

        const balance1 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balance1 > balance0, 'balance should have increased');

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: dappRewardsContract,
          table: 'reward',
          json: true,
        });
        const balanceGov1 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balanceGov1 > balanceGov0, 'gov balance should have increased');

        await delaySec(packagePeriod + 1);
        await unstake({ deployedContract, selectedPackage, amount: '100000.0000' });

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });

        const balance2 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balance2 > balance1, 'balance should have increased');

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: dappRewardsContract,
          table: 'reward',
          json: true,
        });
        const balanceGov2 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balanceGov2 > balanceGov1, 'gov balance should have increased');

        await delaySec(packagePeriod + 1);
        await invokeService(testContractAccount, testcontract);

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: 'pprovider1',
          table: 'reward',
          json: true,
        });

        const balance3 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balance3 > balance2, 'balance should have increased');

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: dappRewardsContract,
          table: 'reward',
          json: true,
        });
        const balanceGov3 = parseFloat(table.rows[0].balance.replace(' DAPP', ''));
        assert(balanceGov3 > balanceGov2, 'gov balance should have increased');

        await delaySec(packagePeriod + 1);

        let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);


        const govKey = await getCreateKeys(dappRewardsContract);
        await servicesTokenContract.claimrewards({
          provider: dappRewardsContract
        }, {
          authorization: `${dappRewardsContract}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [govKey.active.privateKey]
        });

        let accounts = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: dappRewardsContract,
          table: 'accounts',
          json: true,
        });

        table = await deployedContract.eos.getTableRows({
          code: dappServicesContract,
          scope: dappRewardsContract,
          table: 'reward',
          json: true,
        });

        const balanceGov4 = parseFloat(accounts.rows[0].balance.replace(' DAPP', ''));
        const rewardGov = parseFloat(table.rows[0].balance.replace(' DAPP', ''));

        assert(balanceGov4 > balanceGov3, 'balance should have increased');
        assert(rewardGov == 0, 'reward should be 0');
        
        let eosWrapper = getEosWrapper({
          httpEndpoint: `http://localhost:8888`
        });
        let res = await eosio.getTable(eosWrapper,'dappservices',testAccount1,'accounts')
        let preBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
        res = await eosio.getTable(eosWrapper,'dappservices',testAccount2,'accounts')
        let preBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
        assert.equal(preBalance1, preBalance2);
        await splitterContractInstance.claim({
          account: dappRewardsContract,
          all: true
        }, {
          authorization: `${dappRewardsContract}@active`,
          broadcast: true,
          sign: true,
          keyProvider: [splitterKeys.active.privateKey],
        });
        res = await eosio.getTable(eosWrapper,'dappservices',testAccount1,'accounts')
        let postBalance1 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
        res = await eosio.getTable(eosWrapper,'dappservices',testAccount2,'accounts')
        let postBalance2 = res.rows.length ? parseInt(res.rows[0].balance.split(" ")[0]) : 0;
        assert.equal(postBalance1, postBalance2);
        assert(postBalance1 >= 75, 'split amount should be above 75');

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});