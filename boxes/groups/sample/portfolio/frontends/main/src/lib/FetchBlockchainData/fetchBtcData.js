import axios from 'axios';

const fetchBtcData = async(address, thisObject) => {
  if (address.length < 1) return;
  let btcBalanceApiUrl; let balanceData; let balanceArr = []; let queryAddress = ''; let totalBalance = 0;
  for(let i = 0; i < address.length; i++) {
    queryAddress = address[0];
    btcBalanceApiUrl = `${thisObject.state.btcBalanceApiUrl}${queryAddress}`;
    balanceData = await axios.get(btcBalanceApiUrl)
    balanceData = balanceData.data[queryAddress].final_balance
    console.log(balanceData)
    balanceArr = [{
      address: queryAddress,
      balance: balanceData / 100000000
    }];
    totalBalance += balanceData / 100000000;
  }
  await thisObject.setState({ btcBalanceArr: balanceArr, btcTotalBalance: totalBalance * thisObject.state.btcPrice });
};

export default fetchBtcData;
