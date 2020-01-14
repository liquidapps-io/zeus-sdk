const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { getCreateAccount, getEos } = require('../../tools/eos/utils');
const { loadModels } = require('../../tools/models');
const { dappServicesContract, getContractAccountFor, testProvidersList, createLiquidXMapping } = require('../../tools/eos/dapp-services');

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
  var serviceName = serviceModel.name;
  const liquidXMaps = loadModels('liquidx-mappings');
  const mapEntrySvc = liquidXMaps.find(m => m.sidechain_name === sidechain.name && m.mainnet_account === serviceModel.contract);
  if (!mapEntrySvc) {
    //throw new Error(`missing mapping for service ${serviceModel.contract} sidechain: ${sidechain.name}`);
    console.log(`missing mapping for service ${serviceModel.contract} sidechain: ${sidechain.name}`);
    return;
  }
    
  const mapEntry = liquidXMaps.find(m => m.sidechain_name === sidechain.name && m.mainnet_account === provider);
  if (!mapEntry) {
    //throw new Error(`missing mapping for service ${provider} sidechain: ${sidechain.name}`);
    console.log(`missing mapping for service ${provider} sidechain: ${sidechain.name}`);
    return;
  }
    
  var serviceContract = getContractAccountFor(serviceModel, sidechain);
  var serviceC = artifacts.require(`./${serviceName}service/`);
  var deployedService = await deployer.deploy(serviceC, serviceContract, null, sidechain);
  var package_id = provider === 'pprovider1' ? 'default' : 'foobar';

  var eos = await getEos(mapEntry.chain_account, null, sidechain);
  var contractServiceInstance = await eos.contract(serviceContract);
  await contractServiceInstance.regprovider({
    provider: mapEntry.chain_account,
    model: {
      package_id,
      model: generateModel(Object.keys(serviceModel.commands))
    }
  }, {
    authorization: `${mapEntry.chain_account}@active`,
  });
  await createLiquidXMapping(sidechain.name, mapEntrySvc.mainnet_account, mapEntrySvc.chain_account, false);
  return deployedService;
}


module.exports = async(args) => {
  if (args.creator !== 'eosio') { return; } // only local
  var sidechains = await loadModels('local-sidechains');
  // for each sidechain
  for (var i = 0; i < sidechains.length; i++) {
    var sidechain = sidechains[i];
    var models = await loadModels('dapp-services');
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
