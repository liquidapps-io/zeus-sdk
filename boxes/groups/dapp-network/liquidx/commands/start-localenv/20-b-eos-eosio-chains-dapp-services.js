const { requireBox } = require('@liquidapps/box-utils');
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { getCreateAccount, getEos } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');
const serviceRunner = requireBox('seed-microservices/helpers/service-runner');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');

const { createLiquidXMapping, dappServicesLiquidXContract, testProvidersList } = requireBox('dapp-services/tools/eos/dapp-services');

var servicesC = artifacts.require(`./dappservicex/`);
var liquidXC = artifacts.require(`./liquidx/`);

async function deployLocalExtensions(sidechain) {
  const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
  if (!mapEntry)
    throw new Error(`missing LiquidX mapping (liquidx-mappings) for dappservices in ${sidechain.name}`);
  const dappServicesSisterContract = mapEntry.chain_account;
  var deployedContract = await deployer.deploy(servicesC, dappServicesSisterContract, null, sidechain);
  var deployedContractLiquidX = await deployer.deploy(liquidXC, dappServicesLiquidXContract);

  await deployedContract.contractInstance.init({
    chain_name: sidechain.name
  }, {
    authorization: `${dappServicesSisterContract}@active`,
    broadcast: true,
    sign: true
  });
  await getCreateAccount(sidechain.name);
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

module.exports = async (args) => {
  if (args.creator !== 'eosio') { return; } // only local
  var testProviders = testProvidersList;

  var sidechains = await loadModels('eosio-chains');
  // for each sidechain
  for (var i = 0; i < sidechains.length; i++) {
    if (sidechains[i].local === false) return;
    var sidechain = sidechains[i];
    const { deployedContractLiquidX, deployedContract } = await deployLocalExtensions(sidechain);
    for (var pi = 0; pi < testProviders.length; pi++) {
      var testProvider = testProviders[pi];
      const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === testProvider);
      if (!mapEntry)
        throw new Error(`missing LiquidX mapping (liquidx-mappings) for ${testProvider} in ${sidechain.name}`);
      const sidechainKeys = await getCreateAccount(mapEntry.chain_account, null, true, sidechain);
      const mainnetKeys = await getCreateKeys(testProvider);
      await createLiquidXMapping(sidechain.name, mapEntry.mainnet_account, mapEntry.chain_account);
      const config = {};
      config[`DSP_PRIVATE_KEY_${sidechain.name.toUpperCase()}`] = sidechainKeys.active.privateKey;
      await serviceRunner(`/dummy/dapp-services-node.js`, 13016 * (pi + 1)).handler(args, {
        DSP_ACCOUNT: mapEntry.mainnet_account,
        DSP_GATEWAY_MAINNET_ENDPOINT: `http://localhost:${13015 * (pi + 1)}`, // mainnet gateway
        WEBHOOK_DAPP_PORT: 8813 * (pi + 1),
        DSP_PRIVATE_KEY: mainnetKeys.active.privateKey,
        SIDECHAIN: sidechain.name,
        LOGFILE_NAME: `${sidechain.name}-dapp-services-node`,
        NODEOS_LATEST: true,
        ...config
      });
    }
  }
};
