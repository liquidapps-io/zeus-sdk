import axios from 'axios';

const fetchBtcData = async(address, thisObject) => {
  if (address.length < 1) return;
  let btcBalanceApiUrl; let balanceData; let balanceArr = []; let queryAddress = ''; let totalBalance = 0;
  if (address.length > 1) {
    for (let i = 0; i < address.length; i++) {
      btcBalanceApiUrl = `${thisObject.state.btcBalanceApiUrl}${address[i]}`;
      balanceData = await axios.get(btcBalanceApiUrl);
      balanceArr.push({
        address: address[i],
        balance: balanceData.data.data.balance / 100000000
      });
      totalBalance += balanceData.data.data.balance / 100000000;
    }
  }
  else {
    queryAddress = address[0];
    btcBalanceApiUrl = `${thisObject.state.btcBalanceApiUrl}${queryAddress}`;
    balanceData = await axios.get(btcBalanceApiUrl);
    balanceArr = [{
      address: queryAddress,
      balance: balanceData.data.data.balance / 100000000
    }];
    totalBalance = balanceData.data.data.balance / 100000000;
  }
  await thisObject.setState({ btcBalanceArr: balanceArr, btcTotalBalance: totalBalance * thisObject.state.btcPrice });
};

export default fetchBtcData;
