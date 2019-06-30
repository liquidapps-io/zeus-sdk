var { loadModels } = require('../extensions/tools/models');
const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');

module.exports = async function() {
  const args = await getDefaultArgs();
  var deployments = await loadModels('contract-deployments');
  for (var i = 0; i < deployments.length; i++) {
    var { contract, account } = deployments[i];
    var contractI = artifacts.require(`./${contract}/`);
    var deployedContract = await deployer.deploy(contractI, account);
    console.log(`deployed ${contract} to ${deployedContract.address}`);
    if (args.creator === 'eosio') {
      const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');
      var models = await loadModels('dapp-services');
      for (var modeli = 0; modeli < models.length; modeli++) {
        var serviceModel = models[modeli];
        await genAllocateDAPPTokens(deployedContract, serviceModel.name);
      }
    }
  }
};
