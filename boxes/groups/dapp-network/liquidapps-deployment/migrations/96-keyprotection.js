const { getEos, loadSettings } = require('../settings');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
var args = getDefaultArgs();

const protectAccount = async (account) => {
  // get current for account eos
  // set keys
  var settings = await loadSettings();
  var newActivePublicKey = settings.protect.newActivePublicKey;
  var newOwnerPublicKey = settings.protect.newOwnerPublicKey;

  var eos = await getEos(account, args);
  await eos.updateauth({
    account: account,
    permission: 'active',
    parent: 'owner',
    auth: {
      threshold: 1,
      keys: [{ key: newActivePublicKey, weight: 1 }],
      accounts: [{
        permission: { actor: account, permission: 'eosio.code' },
        weight: 1
      }]
    }
  }, { authorization: `${account}@owner` });

  await eos.updateauth({
    account: account,
    permission: 'owner',
    parent: '',
    auth: {
      threshold: 1,
      keys: [{ key: newOwnerPublicKey, weight: 1 }],
      accounts: []
    }
  }, { authorization: `${account}@owner` });
};

module.exports = async function () {
  var settings = await loadSettings();
  if (!settings.protect) return;

  var auctions = settings.auctions;
  const whitelisted = auctions.whitelisted;
  const standard = auctions.standard;
  var accounts = [...new Set([
    settings.dapptoken.account,
    standard.account,
    standard.safeAccount,
    whitelisted.safeAccount,
    whitelisted.account,
    ...Object.keys(settings.distribution.wallets),
    ...Object.values(settings.services)
  ])];
  await Promise.all(accounts.map(protectAccount));
};
