const { requireBox } = require('@liquidapps/box-utils');
const { getCreateAccount, fmt, getEos, loadSettings, deployer, artifacts } = requireBox('liquidapps-deployment/settings');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');

module.exports = async function () {
  var settings = await loadSettings();
  var distribution = settings.distribution;
  var dappTokenSettings = settings.dapptoken;
  var auctions = settings.auctions;
  const whitelisted = auctions.whitelisted;
  const standard = auctions.standard;
  const wallets = distribution.wallets;
  const supply = distribution.supply;
  const auctionsSupply = distribution.auctions * supply;
  var dists = {};
  dists[whitelisted.account] = auctionsSupply * whitelisted.ratio;
  dists[standard.account] = auctionsSupply * standard.ratio;
  Object.keys(wallets).forEach(walletAccount => {
    dists[walletAccount] = supply * wallets[walletAccount];
  });
  var args = getDefaultArgs();
  const eos = await getEos(dappTokenSettings.account, args);
  const disttokenContract = await eos.contract(dappTokenSettings.account);

  await Promise.all(Object.keys(dists).map(async walletAccount => {
    await getCreateAccount(walletAccount);
    return disttokenContract.issue({
      to: walletAccount,
      quantity: `${fmt(dists[walletAccount])} DAPP`,
      memo: 'seed transfer'
    }, {
      authorization: `${dappTokenSettings.account}@active`,
      broadcast: true,
      sign: true
    });
  }));
};
