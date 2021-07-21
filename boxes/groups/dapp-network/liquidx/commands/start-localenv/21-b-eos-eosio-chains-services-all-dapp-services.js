const { requireBox } = require('@liquidapps/box-utils');
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { getEos, getCreateAccount } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');
const { getContractAccountFor, testProvidersList, createLiquidXMapping, dappServicesLiquidXContract } = requireBox('dapp-services/tools/eos/dapp-services');

async function deployLocalService(serviceModel, provider = 'pprovider1', pi = 0, sidechain) {
  const liquidXMaps = loadModels('liquidx-mappings');
  const mapEntrySvc = liquidXMaps.find(m => m.sidechain_name === sidechain.name && m.mainnet_account === serviceModel.contract);
  if (!mapEntrySvc) {
    // console.log(`missing mapping for service ${serviceModel.contract} sidechain: ${sidechain.name}`);
    return;
  }

  const mapEntry = liquidXMaps.find(m => m.sidechain_name === sidechain.name && m.mainnet_account === provider);
  if (!mapEntry) {
    console.log(`missing mapping for provider ${provider} sidechain: ${sidechain.name}`);
    return;
  }

  //we don't require these accounts to exist on the sidechain
  var serviceContract = getContractAccountFor(serviceModel, sidechain);
  await getCreateAccount(serviceContract, null, null, sidechain);
  console.log("Linking ", mapEntrySvc.chain_account, " to ", mapEntrySvc.mainnet_account);
  await createLiquidXMapping(sidechain.name, mapEntrySvc.mainnet_account, mapEntrySvc.chain_account, false);
}

module.exports = async (args) => {
  if (args.creator !== 'eosio') { 
    return;
  } // only local
  if(args.kill) return;
  if(args.singleChain) { return; } // don't run on command
  var sidechains = await loadModels('eosio-chains');
  // for each sidechain
  for (var i = 0; i < sidechains.length; i++) {
    if (sidechains[i].local === false) return;
    var sidechain = sidechains[i];
    var models = await loadModels('dapp-services');
    for (var i = 0; i < models.length; i++) {
      var serviceModel = models[i];
      await deployLocalService(serviceModel, "pprovider1", 0, sidechain);
    }
  }
};