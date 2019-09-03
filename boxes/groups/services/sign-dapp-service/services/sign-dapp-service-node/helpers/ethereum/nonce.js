// module for ensuring the correct nonce for a DSPs ethereum account.
const consts = require('../../consts');
const { getWeb3 } = require('./web3Provider');

let internalNonce;

// We keep track of the nonce in 3 ways to ensure that a DSP
// will not send two different transactions with the same nonce.
// We store and update the nonce on EOS so that in case a pending tx
// exists and the DSP restarts we won't overwrite it (essentially using
// EOS as a persistent database for a minimal amount of data). We also keep
// track of the nonce internally in the case that EOS node latency doesn't
// reflect the updated nonce on-chain. Returning the maximum of these two
// nonces as well as the nonce returned by Web3 should ensure the correct
// nonce in every situation.
async function getNonce(ethAddress) {
  const web3 = getWeb3();
  const web3Nonce = await web3.eth.getTransactionCount(ethAddress);
  const externalNonce = await getExternalNonce(ethAddress);
  return Math.max(web3Nonce, externalNonce, internalNonce || 0);
}

async function incrementNonce(ethAddress) {
  await incrementExternalNonce(ethAddress);
  if (!internalNonce)
    internalNonce = await getNonce(ethAddress);
  else
    internalNonce++;
}

module.exports = {
  getNonce,
  incrementNonce
}

// should probably reconsider design because this is ew
// https://stackoverflow.com/questions/10869276/how-to-deal-with-cyclic-dependencies-in-node-js
const { getExternalNonce, incrementExternalNonce } = require('../eos/nonceholder');
