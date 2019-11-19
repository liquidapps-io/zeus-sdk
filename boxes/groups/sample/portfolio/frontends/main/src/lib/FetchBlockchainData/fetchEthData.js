/*eslint no-loop-func: "off"*/
import axios from 'axios';
let totalTokenBalance = 0;

const fetchEthTokenData = async(balanceArr, thisObject) => {
  const tokenBalanceArr = [...balanceArr]; let ethTokenApiUrl = '';
  for(let i = 0; i < balanceArr.length; i++){
    ethTokenApiUrl = `${thisObject.state.ethTokenPrefixApiUrl}${balanceArr[i].address}${thisObject.state.ethTokenSuffixApiUrl}`;
    const res = await axios.get(ethTokenApiUrl);
    if (res.data.tokens) {
      res.data.tokens.forEach(el => {
        tokenBalanceArr[i].tokens.push({ symbol: el.tokenInfo.symbol, pricePerToken: el.tokenInfo.price.rate ? el.tokenInfo.price.rate : 0, balance: el.balance / (Math.pow(10, el.tokenInfo.decimals)) });
        totalTokenBalance += (el.tokenInfo.price.rate ? Number(el.tokenInfo.price.rate) : 0) * Number(el.balance / (Math.pow(10, el.tokenInfo.decimals)));
      });
    }
  };
  return tokenBalanceArr;
};

const fetchEthData = async(address, thisObject) => {
  if (address.length < 1) return;
  let ethBalanceApiUrl; let balanceData; let balanceArr = []; let queryAddress = ''; let tokenBalanceArr = []; let totalEthBalance = 0;
  if (address.length > 1) {
    for (let i = 0; i < address.length; i++) {
      if (i === address.length - 1) {
        queryAddress += `${address[i]}`;
        break;
      }
      queryAddress += `${address[i]},`;
    }
    ethBalanceApiUrl = `${thisObject.state.ethMultiBalancePrefixApiUrl}${queryAddress}${thisObject.state.ethBalanceSuffixApiUrl}${process.env.REACT_APP_ETHERSCAN_API_KEY}`;
    balanceData = await axios.get(ethBalanceApiUrl);
    balanceData.data.result.forEach(el => {
      balanceArr.push({
        address: el.account,
        balance: el.balance / 1000000000000000000,
        tokens: []
      });
      totalEthBalance += Number(el.balance / 1000000000000000000);
    });
  }
  else {
    queryAddress = address[0];
    ethBalanceApiUrl = `${thisObject.state.ethBalancePrefixApiUrl}${queryAddress}${thisObject.state.ethBalanceSuffixApiUrl}${process.env.REACT_APP_ETHERSCAN_API_KEY}`;
    balanceData = await axios.get(ethBalanceApiUrl);
    balanceArr = [{
      address: queryAddress,
      balance: balanceData.data.result / 1000000000000000000,
      tokens: []
    }];
    totalEthBalance += Number(balanceData.data.result / 1000000000000000000);
  }
  tokenBalanceArr = await fetchEthTokenData(balanceArr, thisObject);
  await thisObject.setState({ ethBalanceArr: tokenBalanceArr, ethTotalBalance: totalEthBalance * thisObject.state.ethPrice, ethTotalTokenBalance: totalTokenBalance });
};

export default fetchEthData;
