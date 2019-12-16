const { getTestContract, getEos } = require('../extensions/tools/eos/utils');
const { loadModels } = require('../extensions/tools/models');

module.exports = async function () {
  const deployments = await loadModels('contract-deployments');
  const eos = await getEos();
  const info = await eos.get_info();
  const chainId = info.chain_id;
  for (var i = 0; i < deployments.length; i++) {
    const contract = await getTestContract(deployments[i].account);
    await contract.xvinit({
      chainid: chainId
    }, {
      authorization: `${deployments[i].account}@active`
    })
  }
}
