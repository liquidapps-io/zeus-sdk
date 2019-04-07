const { getCreateAccount, loadSettings, deployer, artifacts } = require('../settings');

module.exports = async function(args) {
  const settings = await loadSettings();
  const accepted = settings.auctions.accepted;
  const tokenAccount = settings.auctions.accepted.contract;
  if (tokenAccount == "eosio.token") {
    return; // no need 
  }
  const testUsers = settings.testUsers;

  const symbol = accepted.symbol;
  const precision = precision;
  var tokenContact = artifacts.require('./Token/');

  // deploy token
  const deployedContract = await deployer.deploy(tokenContact, tokenAccount);
  await deployedContract.contractInstance.create({
    issuer: tokenAccount,
    maximum_supply: `100000000.0000 ${symbol}`,
  }, { authorization: `${tokenAccount}@active` });
  await Promise.all(testUsers.map(async testUser => {
    // issue test tokens;
    await getCreateAccount(testUser);

    return await deployedContract.contractInstance.issue({
      to: testUser,
      quantity: `10.0000 ${symbol}`,
      memo: "for testing"
    }, { authorization: `${tokenAccount}@active` });
  }));
};
