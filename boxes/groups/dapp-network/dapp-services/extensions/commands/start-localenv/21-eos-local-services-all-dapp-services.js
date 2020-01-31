const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { getCreateAccount, getEos } = require('../../tools/eos/utils');
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

async function deployLocalService(serviceModel, provider = 'pprovider1', gatewayPort) {
  var eos = await getEos(provider);
  var contractInstance = await eos.contract(servicescontract)
  var serviceName = serviceModel.name;
  var serviceContract = getContractAccountFor(serviceModel);
  var package_id = provider === 'pprovider1' ? 'default' : 'foobar';
  // reg provider packages
  await contractInstance.regpkg({
    newpackage: {
      id: 0,
      provider,
      enabled: false,
      api_endpoint: `http://localhost:${gatewayPort}`,
      package_json_uri: '',
      service: serviceContract,
      package_id,
      quota: '1000000.0000 QUOTA',
      min_stake_quantity: '1.0000 DAPP',
      min_unstake_period: 10,
      package_period: 10
    }
  }, {
    authorization: `${provider}@active`,
  });
  var serviceC = artifacts.require(`./${serviceName}service/`);
  var deployedService = await deployer.deploy(serviceC, serviceContract);
  var contractServiceInstance = await eos.contract(serviceContract)
  await contractServiceInstance.regprovider({
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

var serviceRunner = require('../../helpers/service-runner');

module.exports = async(args) => {
  if (args.creator !== 'eosio') { return; } // only local
  var models = await loadModels('dapp-services');
  const gatewayPort = args.gatewayPort || '13015';
  var deployedServices = await deployer.deploy(servicesC, servicescontract);
  for (var i = 0; i < models.length; i++) {
    var serviceModel = models[i];
    var testProviders = testProvidersList;
    for (var pi = 0; pi < testProviders.length; pi++) {
      var testProvider = testProviders[pi];
      var key = await getCreateAccount(testProvider);
      await serviceRunner(`/dummy/${serviceModel.name}-dapp-service-node.js`, serviceModel.port * (pi + 1)).handler(args, {
        DSP_PRIVATE_KEY: key.active.privateKey,
        DSP_GATEWAY_MAINNET_ENDPOINT: `http://localhost:${13015 * (pi + 1)}`, // mainnet gateway
        DSP_ACCOUNT: testProvider,
        SVC_PORT: serviceModel.port * (pi + 1),
        DSP_PORT: 13015 * (pi + 1),
      });
      await deployLocalService(serviceModel, testProvider, gatewayPort * (pi + 1));
    }
  }
};
