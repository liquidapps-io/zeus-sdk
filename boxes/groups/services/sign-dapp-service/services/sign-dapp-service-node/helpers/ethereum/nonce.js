// module for ensuring the correct nonce for a DSPs ethereum account.
const { requireBox } = require('@liquidapps/box-utils');
const { getWeb3 } = require('./web3Provider');
const dal = requireBox('dapp-services/services/dapp-services-node/dal/dal');
const logger = requireBox('log-extensions/helpers/logger');

let internalNonce = {};

async function getNonce(ethAddress, chain) {
  const web3 = getWeb3(chain);
  const chainInternalNonce = fetchInternalNonce(ethAddress, chain)
  const web3Nonce = await web3.eth.getTransactionCount(ethAddress);
  const externalNonce = await getDatabaseNonce(ethAddress, chain);
  if(process.env.DSP_VERBOSE_LOGS) logger.debug(`web3Nonce: ${web3Nonce}, externalNonce: ${externalNonce}, chainInternalNonce: ${chainInternalNonce} for chain ${chain}`)
  return Math.max(web3Nonce, externalNonce, chainInternalNonce || 0);
}

function fetchInternalNonce(ethAddress,chain) {
  let chainInternalNonce = internalNonce[chain];
  if(chainInternalNonce && chainInternalNonce[ethAddress]) {
    chainInternalNonce = chainInternalNonce[ethAddress].nonce;
  } else {
    chainInternalNonce = 0;
  }
  return chainInternalNonce;
}

function updateInternalNonce(ethAddress, chain) {
  if(internalNonce && internalNonce[chain] && internalNonce[chain][ethAddress]) {
    internalNonce[chain][ethAddress].nonce++;
  } else if(internalNonce && internalNonce[chain]) {
    internalNonce[chain][ethAddress] = { nonce: 0 };
  } else {
    internalNonce[chain] = {}
    internalNonce[chain][ethAddress] = { nonce: 0 };
  }
}

async function incrementNonce(ethAddress, chain) {
  await incrementDatabaseNonce(ethAddress, chain);
  updateInternalNonce(ethAddress,chain);
}

async function decrementNonce(ethAddress, chain) {
  if(internalNonce && internalNonce[chain] && internalNonce[chain][ethAddress]) {
    internalNonce[chain][ethAddress].nonce--;
  }
  const settings = await dal.fetchNonce(chain);
  if(settings && settings[ethAddress]) {
    settings[ethAddress].nonce--
    await dal.updateNonce(settings, chain);
  }
}

async function getDatabaseNonce(ethAddress, chain) {
  const settings = await dal.fetchNonce(chain);
  if (settings && settings.data && settings.data[ethAddress]) {
    return settings.data[ethAddress].nonce || 0;
  }
  return 0;
}

async function incrementDatabaseNonce(ethAddress, chain) {
  const settings = await dal.fetchNonce(chain);
  let settingsUpdates = { };
  let nonce;
  logger.warn(JSON.stringify(settings))
  if (settings && settings[ethAddress]) {
    nonce = settings[ethAddress].nonce + 1;
  }
  else {
    nonce = await getNonce(ethAddress, chain) + 1;
  }
  settingsUpdates[ethAddress] = { nonce };
  await dal.updateNonce(settingsUpdates, chain);
}

module.exports = {
  getNonce,
  incrementNonce,
  decrementNonce
}
