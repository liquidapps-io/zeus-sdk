/*eslint default-case: "off"*/
import axios from 'axios';
import { getClient } from '../helpers/getClient';

const contract = process.env.REACT_APP_EOS_CONTRACT_NAME;

const updatePrice = async () => {
    const btc = Buffer.from(`https+json://BTC.USD/min-api.cryptocompare.com/data/pricemulti?fsyms=BTC&tsyms=USD&api_key=ea73728d4525392fa859c21cfb2791bcfbdf6f6492372c1fac4d48f953b4275e`, 'utf8');
    const eth = Buffer.from(`https+json://ETH.USD/min-api.cryptocompare.com/data/pricemulti?fsyms=ETH&tsyms=USD&api_key=ea73728d4525392fa859c21cfb2791bcfbdf6f6492372c1fac4d48f953b4275e`, 'utf8');
    const eos = Buffer.from(`https+json://EOS.USD/min-api.cryptocompare.com/data/pricemulti?fsyms=EOS&tsyms=USD&api_key=ea73728d4525392fa859c21cfb2791bcfbdf6f6492372c1fac4d48f953b4275e`, 'utf8');
    const service = await (await getClient()).service('vaccounts', contract);
    var vaccount = localStorage.getItem('user_account');
    const privateKey = localStorage.getItem('user_key');
    if(vaccount == null) return;
    console.log('updating')
    return await service.push_liquid_account_transaction(contract,
      privateKey,
      'updateoracle', {
        vaccount,
        btc,
        eth,
        eos
      });
}

const fetchOracle = async(thisObject) => {
    let btc; let eth; let eos;
    await updatePrice();
    btc = await axios.post(process.env.REACT_APP_EOS_KYLIN_RAM_ENDPOINT, { code: contract, table: 'btcprice', scope: 'BTC', json: true,});
    btc = btc.data.rows[0].price;
    eth = await axios.post(process.env.REACT_APP_EOS_KYLIN_RAM_ENDPOINT, { code: contract, table: 'ethprice', scope: 'ETH', json: true,});
    eth = eth.data.rows[0].price;
    eos = await axios.post(process.env.REACT_APP_EOS_KYLIN_RAM_ENDPOINT, { code: contract, table: 'eosprice', scope: 'EOS', json: true,});
    eos = eos.data.rows[0].price;
    await thisObject.setState({ btcPrice: btc, ethPrice: eth, eosPrice: eos });
};

export default fetchOracle;
