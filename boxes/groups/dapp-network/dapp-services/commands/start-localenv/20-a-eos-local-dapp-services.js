const { requireBox } = require('@liquidapps/box-utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');

const { getCreateAccount } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');
const { dappServicesContract, testProvidersList } = requireBox('dapp-services/tools/eos/dapp-services');
const servicescontract = dappServicesContract;
const servicesC = artifacts.require(`./dappservices/`);
const serviceRunner = requireBox('seed-microservices/helpers/service-runner');

async function deployLocalExtensions() {
  const deployedContract = await deployer.deploy(servicesC, servicescontract);
  const blocksPerSecond = 2;
  const blocksPerMinute = 60 * blocksPerSecond;
  const blocksPerHour = 60 * blocksPerMinute;
  const blocksPerDay = 24 * blocksPerHour;
  const blocksPerYear = 365 * blocksPerDay;
  const numberOfBlocksToTwice = blocksPerYear;
  const inflation = 0.0271;
  await deployedContract.contractInstance.create({
    maximum_supply_amount: 5000000000 * 10000,
    inflation_per_block: Math.pow(1.00 + inflation, 1.0 / (numberOfBlocksToTwice)) - 1.0,
    gov_allocation: 0,
    inflation_starts_at: new Date().getTime()
  }, {
    authorization: `${servicescontract}@active`,
    broadcast: true,
    sign: true
  });
  await deployedContract.contractInstance.issue({
    to: servicescontract,
    quantity: '1000000000.0000 DAPP',
    memo: ''
  }, {
    authorization: `${servicescontract}@active`,
    broadcast: true,
    sign: true
  });

  return deployedContract;
}

module.exports = async (args) => {
  if (args.creator !== 'eosio') { 
    return;
  } // only local
  if(args.kill) {
    return
  }
  await deployLocalExtensions();
  var servicesPorts = {};
  var loadedExtensions = await loadModels('dapp-services');
  var testProviders = testProvidersList;
  for (var pi = 0; pi < testProviders.length; pi++) {
    for (var i = 0; i < loadedExtensions.length; i++) {
      var loadedExtension = loadedExtensions[i];
      servicesPorts[`DAPPSERVICE_PORT_${loadedExtension.name.toUpperCase()}`] = loadedExtension.port * (pi + 1);
    }
    var testProvider = testProviders[pi];
    const keys = await getCreateAccount(testProvider.account);
    await serviceRunner(`/dummy/dapp-services-node.js`, 13015 * (pi + 1)).handler(args, {
      DSP_ACCOUNT: testProvider.account,
      DSP_GATEWAY_MAINNET_ENDPOINT: `http://localhost:${13015 * (pi + 1)}`,
      WEBHOOK_DAPP_PORT: 8812 * (pi + 1),
      DSP_PRIVATE_KEY: keys.active.privateKey,
      NODEOS_LATEST: true,
      DSP_ALLOW_API_NON_BROADCAST: false,
      DSP_PORT: 13015 * (pi + 1),
      ...servicesPorts
    });
  }
};
