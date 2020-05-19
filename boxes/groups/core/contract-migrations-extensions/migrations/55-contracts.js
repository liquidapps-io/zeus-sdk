const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');

module.exports = async function () {
  const args = await getDefaultArgs();
  var deployments = await loadModels('contract-deployments');
  for (var i = 0; i < deployments.length; i++) {
    var { contract, account } = deployments[i];
    var contractI = artifacts.require(`./${contract}/`);
    var deployedContract = await deployer.deploy(contractI, account);
    console.log(`deployed ${contract} to ${deployedContract.address}`);
    if (args.creator === 'eosio') {
      const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
      var models = await loadModels('dapp-services');
      for (var modeli = 0; modeli < models.length; modeli++) {
        var serviceModel = models[modeli];
        await genAllocateDAPPTokens(deployedContract, serviceModel.name);
      }
    }
  }
};
