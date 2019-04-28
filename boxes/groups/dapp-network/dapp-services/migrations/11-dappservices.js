const { loadModels } = require('../extensions/tools/models');

module.exports = async function (args) {
  var services = await loadModels('deploy-dapp-services');
};

// from models/deploy-dapp-services
