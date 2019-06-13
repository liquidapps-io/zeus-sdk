const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { getCreateAccount } = require('../../tools/eos/utils');
const { loadModels } = require('../../tools/models');
const { dappServicesContract, getContractAccountFor, testProvidersList } = require('../../tools/eos/dapp-services');

const servicescontract = dappServicesContract;
var servicesC = artifacts.require(`./dappservices/`);
var generateModel = (commandNames) => {
  var model = {};
  commandNames.forEach(a => {
    model[`${a}_model_field`] = {
      cost_per_action: 1
    };
  });
  return model;
};

async function deployLocalService(serviceModel, provider = 'pprovider1') {
  var deployedServices = await deployer.deploy(servicesC, servicescontract);
  var key = await getCreateAccount(provider);

  var serviceName = serviceModel.name;
  var serviceContract = getContractAccountFor(serviceModel);

  // reg provider packages
  await deployedServices.contractInstance.regpkg({
    newpackage: {
      id: 0,
      provider,
      enabled: 0,
      api_endpoint: `http://localhost:${serviceModel.port}`,
      package_json_uri: '',
      service: serviceContract,
      package_id: 'default',
      quota: '1.0000 QUOTA',
      min_stake_quantity: '1.0000 DAPP',
      min_unstake_period: 10,
      package_period: 10
    }
  }, {
    authorization: `${provider}@active`,
    broadcast: true,
    sign: true,
    keyProvider: [key.privateKey]
  });
  // await deployedServices.contractInstance.enablepkg({
  //         package_id:"default",
  //         service: serviceContract,
  //         provider,
  // }, {
  //     authorization: `${provider}@active`,
  //     broadcast: true,
  //     sign: true,
  //     keyProvider:[key.privateKey]
  // });

  // reg provider and model model
  var serviceC = artifacts.require(`./${serviceName}service/`);
  var deployedService = await deployer.deploy(serviceC, serviceContract);

  await deployedService.contractInstance.regprovider({
    provider,
    model: {
      package_id: 'default',
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

var serviceRunner = require('../../helpers/service-runner');

module.exports = async(args) => {
  var models = await loadModels('dapp-services');
  for (var i = 0; i < models.length; i++) {
    var serviceModel = models[i];
    var testProviders = testProvidersList;
    for (var pi = 0; pi < testProviders.length; pi++) {
      var testProvider = testProviders[pi];
      await serviceRunner(`/dummy/${serviceModel.name}-dapp-service-node.js`, serviceModel.port * (pi + 1)).handler(args, {
        DSP_ACCOUNT: testProvider,
        SVC_PORT: serviceModel.port * (pi + 1),
        NODEOS_HOST_DSP_PORT: 13015 * (pi + 1),
      });
      await deployLocalService(serviceModel, testProvider);
    }
  }
};
