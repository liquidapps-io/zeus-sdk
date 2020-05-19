const { requireBox } = require('@liquidapps/box-utils');
const { loadSettings, getCreateAccount, deployer, artifacts } = requireBox('liquidapps-deployment/settings');

module.exports = async function () {
  const settings = await loadSettings();
  const auctions = settings.auctions;
  const whitelisted = auctions.whitelisted;
  const standard = auctions.standard;

  // standard
  var safeAccount = standard.safeAccount;
  var keys = await getCreateAccount(safeAccount);

  // whitelisted
  safeAccount = whitelisted.safeAccount;
  keys = await getCreateAccount(safeAccount);
};
