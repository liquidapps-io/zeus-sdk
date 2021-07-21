const { requireBox } = require('@liquidapps/box-utils');
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { getCreateAccount, getEos } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');
const { dappServicesContract, getContractAccountFor, testProvidersList } = requireBox('dapp-services/tools/eos/dapp-services');
const servicescontract = dappServicesContract;
var servicesC = artifacts.require(`./dappservices/`);

async function deployLocalService(serviceModel, provider = 'pprovider1', gatewayPort) {
  var eos = await getEos(provider);
  var contractInstance = await eos.contract(servicescontract)
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
      package_period: 10,
      annual_inflation: 2.71,
      pricing: []
    },
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

  //create the service contract accounts, but don't load them with code
  await getCreateAccount(serviceContract);
}

var serviceRunner = requireBox('seed-microservices/helpers/service-runner');

module.exports = async (args) => {
  if (args.creator !== 'eosio') { 
    return;
  } // only local
  if(args.kill) {
    return;
  }
  var models = await loadModels('dapp-services');
  const gatewayPort = args.gatewayPort || '13015';
  await deployer.deploy(servicesC, servicescontract);
  for (var i = 0; i < models.length; i++) {
    var serviceModel = models[i];
    let runService = false;
    if(args.services) {
      for(const el of args.services){
        if(el === serviceModel.name) runService = true;
      }
      if(!runService) continue;
    }
    var testProviders = testProvidersList;
    for (var pi = 0; pi < testProviders.length; pi++) {
      var testProvider = testProviders[pi];
      var key = await getCreateAccount(testProvider.account);
      await serviceRunner(`/dummy/${serviceModel.name}-dapp-service-node.js`, serviceModel.port * (pi + 1)).handler(args, {
        DSP_PRIVATE_KEY: key.active.privateKey,
        EVM_EVMLOCALSIDECHAIN_PRIVATE_KEY: args.externalEvmSisterPrivateKey?args.externalEvmSisterPrivateKey:testProvider.sidechain_key,
        EVM_PRIVATE_KEY: args.externalEvmPrivateKey?args.externalEvmPrivateKey:testProvider.key,
        EVM_GAS_PRICE_MULT: 1.2,
        EVM_EVMLOCALSIDECHAIN_ENDPOINT: args.externalEvmSisterEndpoint?args.externalEvmSisterEndpoint:`http://${args.evmSisterHost}:${args.evmSisterPort}`,
        EVM_ENDPOINT: args.externalEvmEndpoint?args.externalEvmEndpoint:`http://${args.evmHost}:${args.evmPort}`,
        DSP_GATEWAY_MAINNET_ENDPOINT: `http://localhost:${13015 * (pi + 1)}`, // mainnet gateway
        DSP_ACCOUNT: testProvider.account,
        NODEOS_LATEST: true,
        SVC_PORT: serviceModel.port * (pi + 1),
        DSP_PORT: 13015 * (pi + 1),
        ORACLE_PREFIX_TEST1_IPFS: "ipfs.io/ipfs/Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a"
      });
      await deployLocalService(serviceModel, testProvider.account, gatewayPort * (pi + 1));
    }
  }
};
