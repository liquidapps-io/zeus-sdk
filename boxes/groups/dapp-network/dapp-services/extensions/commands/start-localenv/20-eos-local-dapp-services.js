const providerRunHandler = require('../run/dapp-services-node');

const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { getCreateAccount } = require('../../tools/eos/utils');
const { loadModels } = require('../../tools/models');

const { dappServicesContract, testProvidersList } = require('../../tools/eos/dapp-services');
const servicescontract = dappServicesContract;
var servicesC = artifacts.require(`./dappservices/`);
var serviceRunner = require('../../helpers/service-runner');

async function deployLocalExtensions() {
  var deployedContract = await deployer.deploy(servicesC, servicescontract);
  var blocksPerSecond = 2;
  var blocksPerMinute = 60 * blocksPerSecond;
  var blocksPerHour = 60 * blocksPerMinute;
  var blocksPerDay = 24 * blocksPerHour;
  var blocksPerYear = 365 * blocksPerDay;
  var numberOfBlocksToTwice = blocksPerYear;
  var inflation = 0.02;
  await deployedContract.contractInstance.create({
    maximum_supply_amount: 5000000000 * 10000,
    inflation_per_block: Math.pow(1.00 + inflation, 1.0 / (numberOfBlocksToTwice)) - 1.0,
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

module.exports = async(args) => {
  if (args.creator !== 'eosio') { return; } // only local
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
    await getCreateAccount(testProvider);
    await serviceRunner(`/dummy/dapp-services-node.js`, 13015 * (pi + 1)).handler(args, {
      DSP_ACCOUNT: testProvider,
      NODEOS_HOST_DSP: 13015 * (pi + 1),
      WEBHOOK_DAPP_PORT: 8812 * (pi + 1),
      ...servicesPorts
    });
  }
};
