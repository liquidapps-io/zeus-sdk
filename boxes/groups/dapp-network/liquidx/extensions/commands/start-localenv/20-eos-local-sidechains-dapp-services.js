const providerRunHandler = require('../run/dapp-services-node');

const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { getCreateAccount, getEos } = require('../../tools/eos/utils');
const { loadModels } = require('../../tools/models');

const { createLiquidXMapping, dappServicesContract, dappServicesLiquidXContract, testProvidersList } = require('../../tools/eos/dapp-services');

var servicesC = artifacts.require(`./dappservicex/`);
var liquidXC = artifacts.require(`./liquidx/`);

async function deployLocalExtensions(sidechain) {
  const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
  if (!mapEntry)
    throw new Error(`missing LiquidX mapping (liquidx-mappings) for dappservices in ${sidechain.name}`);
  const dappServicesSisterContract = mapEntry.chain_account;
  var deployedContract = await deployer.deploy(servicesC, dappServicesSisterContract, null, sidechain);
  var deployedContractLiquidX = await deployer.deploy(liquidXC, dappServicesLiquidXContract);
  var key = await getCreateAccount(sidechain.name);

  await deployedContract.contractInstance.init({
    chain_name: sidechain.name
  }, {
    authorization: `${dappServicesSisterContract}@active`,
    broadcast: true,
    sign: true
  });
  var eos = await getEos(sidechain.name);
  var liquidXcontractInstance = await eos.contract(dappServicesLiquidXContract)
  liquidXcontractInstance.setchain({
    chain_name: sidechain.name,
    chain_meta: {
      is_public: false,
      is_single_node: false,
      dappservices_contract: dappServicesSisterContract,
      chain_id: "",
      type: "",
      endpoints: [],
      p2p_seeds: [],
      chain_json_uri: ""

    }
  }, {
    authorization: `${sidechain.name}@active`,
    broadcast: true,
    sign: true
  })
  return { deployedContractLiquidX, deployedContract };
}

module.exports = async(args) => {
  if (args.creator !== 'eosio') { return; } // only local
  var testProviders = testProvidersList;

  var sidechains = await loadModels('local-sidechains');
  // for each sidechain
  for (var i = 0; i < sidechains.length; i++) {
    var sidechain = sidechains[i];
    const { deployedContractLiquidX, deployedContract } = await deployLocalExtensions(sidechain);
    for (var pi = 0; pi < testProviders.length; pi++) {
      var testProvider = testProviders[pi];
      const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === testProvider);
      if (!mapEntry)
        throw new Error(`missing LiquidX mapping (liquidx-mappings) for ${testProvider} in ${sidechain.name}`);
      await getCreateAccount(mapEntry.chain_account, null, false, sidechain);
      await createLiquidXMapping(sidechain.name, mapEntry.mainnet_account, mapEntry.chain_account);
    }
  }
};
