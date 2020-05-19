const { requireBox } = require('@liquidapps/box-utils');
const { fmt, loadSettings, deployer, artifacts } = requireBox('liquidapps-deployment/settings');

const deployAuctionInstance = async (auctionInstance) => {
  const settings = await loadSettings();
  const distribution = settings.distribution;
  const auctionsPortion = distribution.auctions;
  const auctions = settings.auctions;
  const cyclesSettings = auctions.cycles;
  const cycles = cyclesSettings.iterations;
  const seconds_per_cycle = cyclesSettings.secondsPerCycle;
  const startTime = cyclesSettings.startTimestamp;
  const start_ts = startTime * 1000;
  const accepted = auctions.accepted;
  const account = auctionInstance.account;
  const savings_account = auctionInstance.safeAccount;
  const whitelist = (auctionInstance.whitelist) ? auctionInstance.whitelist : account;
  const ratio = auctionInstance.ratio;
  const supply = distribution.supply;
  const auctionsSupply = auctionsPortion * supply;
  const totalAmountForAuction = (auctionsSupply * ratio);
  const perCycle = totalAmountForAuction / cycles;
  const contractI = artifacts.require(`./microauctions/`);

  const deployedContract = await deployer.deploy(contractI, account);

  const instance = deployedContract.contractInstance;
  const dappTokenSettings = settings.dapptoken;
  await instance.init({
    setting: {
      whitelist,
      cycles,
      seconds_per_cycle,
      savings_account,
      tokens_account: account,
      start_ts,
      quota_per_cycle: {
        contract: dappTokenSettings.account,
        amount: fmt(perCycle),
        precision: 4,
        symbol: 'DAPP'
      },
      accepted_token: {
        contract: accepted.contract,
        amount: accepted.minimum,
        precision: 4,
        symbol: accepted.symbol
      },
      payout_cycles_per_user: 10,
      payouts_per_payin: 5,
      payouts_delay_sec: 10
    }
  }, {
    authorization: `${account}@active`,
    broadcast: true,
    sign: true
  });
};

module.exports = async function () {
  var settings = await loadSettings();
  var auctions = settings.auctions;
  await deployAuctionInstance(auctions.whitelisted);
  await deployAuctionInstance(auctions.standard);
};
