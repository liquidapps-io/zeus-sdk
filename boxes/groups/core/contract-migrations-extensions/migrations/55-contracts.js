const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { emojMap, execPromise } = requireBox('seed-zeus-support/_exec');

const partyMigrate = async (args, {network, account, contract}) => {
  if(!args.network) args.network = network;
  if(!args.creator) args.creator = account;
  if(!args.contract) args.contract = contract;
  var contractI = artifacts.require(`./${contract}/`);
  console.log(`${emojMap.airplane} deploying ${contract} to ${account}`);
  var deployedContract = await deployer.deploy(contractI, account);
  console.log(`${emojMap.zap} deployed ${contract} to ${deployedContract.address}`);
  if (args.creator === 'eosio') {
    var models = await loadModels('dapp-services');
    for (var modeli = 0; modeli < models.length; modeli++) {
      var serviceModel = models[modeli];
      await genAllocateDAPPTokens(deployedContract, serviceModel.name);
    }
  }
}

module.exports = async function (args) {
  var deployments = await loadModels('contract-deployments');
  let exists = false;
  for(const el of deployments) {
    if (el.account) {
      exists = true
    }
  }
  if(!exists && args.creator && args.contract && args.creator !== 'eosio') {
    console.log(`${emojMap.zap} creating contract deployment with: "zeus create contract-deployment ${args.contract} ${args.creator} ${args.network}"`)
    await execPromise(`zeus create contract-deployment ${args.contract} ${args.creator} ${args.network}`)
    deployments = await loadModels('contract-deployments');
  }
  const preContract = args.contract;
  const preCreator = args.creator;
  const preNetwork = args.network;
  if(!deployments.length) throw new Error(`${emojMap.white_frowning_face} please create a contract deployment first with "zeus create contract-deployment -h"`)
  for (var i = 0; i < deployments.length; i++) {
    var { contract, account, network } = deployments[i];
    if(args.creator === 'eosio' && args.network !== 'development') {
      args.creator = account
    }
    if(!args.network && !args.creator && !args.contract){
      await partyMigrate(args, { contract, account, network })
      args.contract = preContract
      args.creator = preCreator
      args.network = preNetwork
    }
    if(!args.network && args.creator && args.contract && network && (contract == args.contract) && (account == args.creator)) {
      await partyMigrate(args, { contract, account, network })
      args.contract = preContract
      args.creator = preCreator
      args.network = preNetwork
    }
    if(!args.creator && args.network && args.contract && account && (contract == args.contract) && (network == args.network)) {
      await partyMigrate(args, { contract, account, network })
      args.contract = preContract
      args.creator = preCreator
      args.network = preNetwork
    }
    if(!args.contract && args.network && args.creator && contract && (account == args.creator) && (network == args.network)) {
      await partyMigrate(args, { contract, account, network })
      args.contract = preContract
      args.creator = preCreator
      args.network = preNetwork
    }
    if(!args.network && !args.creator && args.contract && network && account && (args.contract == contract)) {
      await partyMigrate(args, { contract, account, network })
      args.contract = preContract
      args.creator = preCreator
      args.network = preNetwork
    }
    if(!args.creator && !args.contract&& args.network && account && contract && (args.network == network)) {
      await partyMigrate(args, { contract, account, network })
      args.contract = preContract
      args.creator = preCreator
      args.network = preNetwork
    }
    if(!args.contract && !args.network && args.creator && contract && network && (args.creator == account)) {
      await partyMigrate(args, { contract, account, network })
      args.contract = preContract
      args.creator = preCreator
      args.network = preNetwork
    }
    if(args.contract == contract && args.creator == account && args.network == network) {
      await partyMigrate(args, { contract, account, network })
      args.contract = preContract
      args.creator = preCreator
      args.network = preNetwork
    }
  }
};
