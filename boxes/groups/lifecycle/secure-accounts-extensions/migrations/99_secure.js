
const {loadModels} = require('../extensions/tools/models');

module.exports = async function(deployer, network, accounts) {
  for (var i = 0; i < accounts2.length; i++) {
    var {account, versionKeeperAccount} =  accounts2[i];
    // 
    // await accounts.setKeys(account, coldOwner, coldActive);
  }
};

var accounts2 = loadModels("secure-accounts"); // load from models/secure-accounts

