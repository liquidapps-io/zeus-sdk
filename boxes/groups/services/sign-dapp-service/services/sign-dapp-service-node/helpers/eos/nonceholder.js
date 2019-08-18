// Helpers for storing nonce using EOS as persistent backend
const { getEos } = require('./eosProvider');
const { getNonce } = require('../ethereum/nonce');
const consts = require('../../consts');

async function getExternalNonce(ethAddress) {
  const eos = getEos();
  const data = await eos.getTableRows({
    code: consts.eosNonceHolderAccount,
    scope: consts.eosNonceHandlerAccount,
    table: 'nonces',
    json: true
  });
  return data.rows[0] ? parseInt(data.rows[0].nonce) : 0;
}

async function incrementExternalNonce(ethAddress) {
  const eos = getEos();
  const currentNonce = await getNonce(ethAddress);
  const ethAddressKey = ethAddressToUint64(ethAddress);
  const nonceholderContract = await eos.contract(consts.eosNonceHolderAccount);
  console.log(currentNonce)
  await nonceholderContract.updatenonce({
    key: ethAddressKey,
    owner: consts.eosNonceHandlerAccount,
    address: ethAddress,
    nonce: currentNonce + 1
  }, {
    authorization: `${consts.eosNonceHandlerAccount}@active`,
    broadcast: true
  });
  console.log('done')
}

// converts an eth address to a uint64_t key
function ethAddressToUint64(ethAddress) {
  return parseInt(ethAddress.substr(0, 18));
}

module.exports = {
  getExternalNonce,
  incrementExternalNonce
}
