import fetchBtcData from 'lib/FetchBlockchainData/fetchBtcData';
import fetchEthData from 'lib/FetchBlockchainData/fetchEthData';
import fetchEosData from 'lib/FetchBlockchainData/fetchEosData';
import fetchOracle from 'lib/FetchBlockchainData/fetchOracle';

const fetchAllData = async (btcAddressArr, ethAddressArr, eosAddressArr, thisObject) => {
  await fetchOracle(thisObject);
  await fetchBtcData(btcAddressArr, thisObject);
  await fetchEthData(ethAddressArr, thisObject);
  await fetchEosData(eosAddressArr, thisObject);
};

export default fetchAllData;
