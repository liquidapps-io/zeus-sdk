const Web3 = require('web3');
const consts = require('../../consts');

let web3;

function getWeb3() {
  if (!web3) {
    web3 = new Web3(consts.web3Provider);
  }
  return web3;
}

module.exports = {
  getWeb3
}
