import axios from 'axios';

const validateEos = async(address, thisObject) => {
  if (!/^[a-z1-5.]+$/.test(address))
    return 'EOS: Contains an invalid character';

  if (!address.indexOf('.') && address.length !== 12){
    return 'EOS: Non premium name must be 12 characters';
  }

  if (address.slice(-1) === '.')
    return 'EOS: Premium name cannot end with "."';

  try {
    await axios.post(`${thisObject.state.eosBalanceApiUrl}`, JSON.stringify({ account_name: address }));
  }
  catch (e) {
    return 'EOS: Unable to find EOS account';
  }
  return 'valid';
};

export default validateEos;
