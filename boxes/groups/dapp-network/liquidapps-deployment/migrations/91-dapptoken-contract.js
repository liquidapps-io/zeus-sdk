const { requireBox } = require('@liquidapps/box-utils');
const { loadSettings, getCreateAccount, deployer, artifacts } = requireBox('liquidapps-deployment/settings');

module.exports = async function (args) {
  const settings = await loadSettings();
  const dappTokenSettings = settings.dapptoken;
  const contractI = artifacts.require(`./dappservices/`);
  const deployedContract = await deployer.deploy(contractI, dappTokenSettings.account);
  console.log(`deployed ${dappTokenSettings.contract} to ${deployedContract.address}`);
  // init
  const blocksPerSecond = 2;
  const blocksPerMinute = 60 * blocksPerSecond;
  const blocksPerHour = 60 * blocksPerMinute;
  const blocksPerDay = 24 * blocksPerHour;
  const blocksPerYear = 365 * blocksPerDay;
  const inflation = dappTokenSettings.yearlyInflation;
  const auctions = settings.auctions;
  const cyclesSettings = auctions.cycles;

  const startTime = cyclesSettings.startTimestamp;

  await deployedContract.contractInstance.create({
    maximum_supply_amount: 20000000000 * 10000,
    inflation_per_block: Math.pow(1.00 + inflation, 1.0 / (blocksPerYear)) - 1.0,
    inflation_starts_at: startTime
  }, {
    authorization: `${dappTokenSettings.account}@active`,
    broadcast: true,
    sign: true
  });
};
