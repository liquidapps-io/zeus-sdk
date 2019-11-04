const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { getCreateAccount, getEos } = require('../../tools/eos/utils');
const { loadModels } = require('../../tools/models');
const { dappServicesContract, getContractAccountFor, testProvidersList } = require('../../tools/eos/dapp-services');

const servicescontract = dappServicesContract;
var servicesC = artifacts.require(`./dappservicex/`);
var generateModel = (commandNames) => {
  var model = {};
  commandNames.forEach(a => {
    model[`${a}_model_field`] = {
      cost_per_action: 1
    };
  });
  return model;
};

async function deployLocalService(serviceModel, provider = 'pprovider1', pi = 0, sidechain) {
  var eos = await getEos(provider, null, sidechain);
  var contractInstance = await eos.contract(servicescontract)
  var serviceName = serviceModel.name;
  var serviceContract = getContractAccountFor(serviceModel, sidechain);
  var package_id = provider === 'pprovider1' ? 'default' : 'foobar';
  var svcPort = serviceModel.port * (pi + 1);
  // reg provider packages
  // await contractInstance.regpkg({
  //   newpackage: {
  //     id: 0,
  //     provider,
  //     enabled: false,
  //     api_endpoint: `http://localhost:${svcPort}`,
  //     package_json_uri: '',
  //     service: serviceContract,
  //     package_id,
  //     quota: '1.0000 QUOTA',
  //     min_stake_quantity: '1.0000 DAPP',
  //     min_unstake_period: 10,
  //     package_period: 10
  //   }
  // }, {
  //   authorization: `${provider}@active`,
  // });
  // await contractInstance.enablepkg({
  //         package_id:"default",
  //         service: serviceContract,
  //         provider,
  // }, {
  //     authorization: `${provider}@active`,
  // });

  // reg provider and model model
  var serviceC = artifacts.require(`./${serviceName}service/`);
  var deployedService = await deployer.deploy(serviceC, serviceContract, null, sidechain);

  var contractServiceInstance = await eos.contract(serviceContract)
  // await contractServiceInstance.regprovider({
  //   provider,
  //   model: {
  //     package_id,
  //     model: generateModel(Object.keys(serviceModel.commands))
  //   }
  // }, {
  //   authorization: `${provider}@active`,
  // });

  return deployedService;
}


module.exports = async(args) => {
  if (args.creator !== 'eosio') { return; } // only local
  var sidechains = await loadModels('local-sidechains');
  // for each sidechain
  for (var i = 0; i < sidechains.length; i++) {
    var sidechain = sidechains[i];
    var models = await loadModels('dapp-services');
    var deployedServices = await deployer.deploy(servicesC, servicescontract, null, sidechain);
    for (var i = 0; i < models.length; i++) {
      var serviceModel = models[i];
      var testProviders = testProvidersList;
      for (var pi = 0; pi < testProviders.length; pi++) {
        var testProvider = testProviders[pi];
        await deployLocalService(serviceModel, testProvider, pi, sidechain);
      }
    }
  }


};
