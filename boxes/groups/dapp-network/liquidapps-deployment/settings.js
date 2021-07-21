const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { getCreateAccount, getEos } = requireBox('seed-eos/tools/eos/utils');
const { dappServicesContract } = requireBox('dapp-services/tools/eos/dapp-services');

const loadSettings = async () => {
  var staging = dappServicesContract != 'dappservices';
  var models = await loadModels('liquidapps-deployment-settings');
  var servicesModels = await loadModels('dapp-services');
  var res;
  if (staging) { res = models.find(a => a.name == 'staging'); } else { res = models.find(a => a.name == 'production'); }
  res.dapptoken.account = dappServicesContract;
  res.services = {};
  servicesModels.forEach(model => {
    res.services[`${model.name}service`] = model.contract;
  });
  if (staging) {
    var delayed_start = 5;
    res.auctions.cycles.startTimestamp = new Date().getTime() + (delayed_start * 60 * 1000);
  }
  return res;
};
const fmt = (amount) => {
  return parseFloat(amount).toFixed(4);
};

module.exports = {
  loadSettings,
  artifacts,
  getCreateAccount,
  deployer,
  fmt,
  getEos
};
