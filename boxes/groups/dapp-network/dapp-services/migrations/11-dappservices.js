const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');

module.exports = async function (args) {
  var services = await loadModels('deploy-dapp-services');
};

// from models/deploy-dapp-services
