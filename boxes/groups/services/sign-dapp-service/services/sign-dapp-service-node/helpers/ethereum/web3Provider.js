const Web3 = require('web3');
const consts = require('../../consts');
const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');


function getWeb3(chain) {
  let endpoint;
  if(chain && process.env[`EVM_${chain.toUpperCase()}_ENDPOINT`]){
    endpoint = process.env[`EVM_${chain.toUpperCase()}_ENDPOINT`]
  } else if(process.env.EVM_ENDPOINT) {
    endpoint = process.env.EVM_ENDPOINT
  } else {
    endpoint = 'http://localhost:8545'
  }
  // return new Web3(endpoint);
  return new Web3(new Web3.providers.WebsocketProvider(endpoint));
}

module.exports = {
  getWeb3
}
