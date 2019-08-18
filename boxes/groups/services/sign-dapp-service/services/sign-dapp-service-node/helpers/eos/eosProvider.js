const Eos = require('eosjs');
const consts = require('../../consts');

let eos;

function getEos() {
  if (!eos) {
    eos = new Eos({
      chainId: consts.eosChainId,
      sign: true,
      httpEndpoint: `${consts.nodeosUrl}:${consts.nodeosPort}`,
      keyProvider: consts.eosNonceHandlerKey,
      expireInSeconds: 120
    })
  }
  return eos;
}

module.exports = {
  getEos
}
