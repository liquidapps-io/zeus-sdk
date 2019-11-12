const providerRunHandler = require('../run/dapp-services-node');

const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { getCreateAccount } = require('../../tools/eos/utils');
const { loadModels } = require('../../tools/models');

const { dappServicesContract, testProvidersList } = require('../../tools/eos/dapp-services');
const servicescontract = dappServicesContract;
const liquidxcontract = "liquidx";
var servicesC = artifacts.require(`./dappservicex/`);
var liquidXC = artifacts.require(`./liquidx/`);

async function deployLocalExtensions(sidechain) {
  var deployedContract = await deployer.deploy(servicesC, servicescontract, null, sidechain);
  var deployedContractLiquidX = await deployer.deploy(liquidXC, liquidxcontract);

  // await deployedContract.contractInstance.issue({
  //   to: servicescontract,
  //   quantity: '1000000000.0000 DAPP',
  //   memo: ''
  // }, {
  //   authorization: `${servicescontract}@active`,
  //   broadcast: true,
  //   sign: true
  // });

  return deployedContract;
}

module.exports = async(args) => {
  if (args.creator !== 'eosio') { return; } // only local
  var testProviders = testProvidersList;

  var sidechains = await loadModels('local-sidechains');
  // for each sidechain
  for (var i = 0; i < sidechains.length; i++) {
    var sidechain = sidechains[i];
    await deployLocalExtensions(sidechain);
    for (var pi = 0; pi < testProviders.length; pi++) {
      var testProvider = testProviders[pi];
      await getCreateAccount(testProvider, null, false, sidechain);
    }
  }
};
