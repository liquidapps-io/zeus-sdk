// module for ensuring the correct nonce for a DSPs ethereum account.
const { requireBox } = require('@liquidapps/box-utils');
const { getWeb3 } = require('./web3Provider');
const dal = requireBox('dapp-services/services/dapp-services-node/dal/dal');

let internalNonce;

async function getNonce(ethAddress) {
  const web3 = getWeb3();
  const web3Nonce = await web3.eth.getTransactionCount(ethAddress);
  const externalNonce = await getDatabaseNonce(ethAddress);
  return Math.max(web3Nonce, externalNonce, internalNonce || 0);
}

async function incrementNonce(ethAddress) {
  await incrementDatabaseNonce(ethAddress);
  if (!internalNonce)
    internalNonce = await getNonce(ethAddress);
  else
    internalNonce++;
}

async function getDatabaseNonce(ethAddress) {
  const settings = await dal.getSettings();
  if (settings && settings.ethereum && settings.ethereum[ethAddress]) {
    return settings.ethereum[ethAddress].nonce || 0;
  }
  return 0;
}

async function incrementDatabaseNonce(ethAddress) {
  const settings = await dal.getSettings();
  let settingsUpdates = { data: { eth: { } }};
  let newNonce;
  if (
    settings && settings.data && settings.data.eth &&
    settings.data.eth[ethAddress] && settings.data.eth[ethAddress].nonce
    ) {
      newNonce = settings.data.eth[ethAddress].nonce + 1;
  }
  else {
    newNonce = await getNonce(ethAddress) + 1;
  }
  settingsUpdates.data.eth[ethAddress] = { nonce: newNonce };
  await dal.updateSettings(settingsUpdates);
}

module.exports = {
  getNonce,
  incrementNonce
}
