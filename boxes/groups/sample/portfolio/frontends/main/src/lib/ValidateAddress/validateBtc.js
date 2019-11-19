var WAValidator = require('wallet-address-validator');

const validateBtc = (address) => {
  return WAValidator.validate(address, 'BTC');
};

export default validateBtc;
