var { loadModels } = require('./extensions/tools/models');
const artifacts = require('./extensions/tools/eos/artifacts');
const deployer = require('./extensions/tools/eos/deployer');
const { getCreateAccount, getEos } = require('./extensions/tools/eos/utils');
const { dappServicesContract } = require('./extensions/tools/eos/dapp-services');

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
