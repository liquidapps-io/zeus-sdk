/*eslint no-loop-func: "off"*/
import axios from 'axios';
let totalTokenBalance = 0; let totalEosBalance = 0;

const addBalance = (res) => {
  let balance = 0;
  if(res.data.core_liquid_balance){
    balance = Number(res.data.core_liquid_balance.slice(0, -4))
  }
  if(res.data.self_delegated_bandwidth) {
    balance += Number(res.data.self_delegated_bandwidth.cpu_weight.slice(0, -4))
    balance += Number(res.data.self_delegated_bandwidth.net_weight.slice(0, -4))
  }
  totalEosBalance += balance;
  return balance;
}

const fetchEosTokenData = async (balanceArr, thisObject) => {
  totalTokenBalance = 0;
  const tokenBalanceArr = [...balanceArr]; let eosTokenApiUrl = '';
  for (let i = 0; i < balanceArr.length; i++) {
    eosTokenApiUrl = `${thisObject.state.eosTokenPrefixApiUrl}${balanceArr[i].address}${thisObject.state.eosTokenSuffixApiUrl}`;
    const res = await axios.get(eosTokenApiUrl);
    res.data.tokens.forEach(el => {
      tokenBalanceArr[i].tokens.push({ symbol: el.currency, totalTokenValue: el.usd_value, balance: el.amount });
      totalTokenBalance += el.usd_value;
    });
  };
  return tokenBalanceArr;
};

const fetchEosData = async(address, thisObject) => {
  if (address.length < 1) return;
  const balanceArr = []; let tokenBalanceArr = []; let res;
  for (let i = 0; i < address.length; i++) {
    res = await axios.post(`${thisObject.state.eosBalanceApiUrl}`, JSON.stringify({ account_name: address[i] }));
    balanceArr.push({
      address: res.data.account_name,
      balance: addBalance(res) ,
      tokens: []
    });
  }
  tokenBalanceArr = await fetchEosTokenData(balanceArr, thisObject);
  await thisObject.setState({ eosBalanceArr: tokenBalanceArr, eosTotalBalance: totalEosBalance * thisObject.state.eosPrice, eosTotalTokenBalance: totalTokenBalance });
};

export default fetchEosData;
