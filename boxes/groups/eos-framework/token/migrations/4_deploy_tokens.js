const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const {loadModels} = require("../extensions/tools/models");
var token = artifacts.require("./Token/");


module.exports = async function(args) {
  var tokens = await loadModels("tokens");
  for (var i = 0; i < tokens.length; i++) {
      var {account,symbol} = tokens[i];
      var deployedContract = await deployer.deploy(token,account);
      await deployedContract.contractInstance.create({
          issuer: account,
          maximum_supply: `1000000000.0000 ${symbol}`
      },{
              authorization: `${account}@active`,
              broadcast: true,
              sign: true
        });
      
  }
};
