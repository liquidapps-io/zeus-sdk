const WAValidator = require('wallet-address-validator');

const validateEth = async(address) => {
  return WAValidator.validate(address, 'ETH');
};

export default validateEth;
