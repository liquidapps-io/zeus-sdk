import fetchBtcData from 'lib/FetchBlockchainData/fetchBtcData';
import fetchEthData from 'lib/FetchBlockchainData/fetchEthData';
import fetchEosData from 'lib/FetchBlockchainData/fetchEosData';
import fetchOracle from 'lib/FetchBlockchainData/fetchOracle';

const fetchAllData = async (btcAddressArr, ethAddressArr, eosAddressArr, thisObject, removeAccount) => {
  try {
    await fetchOracle(thisObject);
    await fetchBtcData(btcAddressArr, thisObject);
    await fetchEthData(ethAddressArr, thisObject);
    await fetchEosData(eosAddressArr, thisObject);
  } catch (e) {
    removeAccount();
    thisObject.setState({ addAccountErr: `There was an issue fetching the account info, please refresh the page: ${e.message}`, loginError: `Error fetching data, try again: ${e.toString()}`, isSigningIn: false })
  }
};

export default fetchAllData;
