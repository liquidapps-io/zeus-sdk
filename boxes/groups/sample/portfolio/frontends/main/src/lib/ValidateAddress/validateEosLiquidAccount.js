const validateEosLiquidAccount = (address) => {
  if (!address)
    return 'Please enter an account name';

  if (address.length > 12)
    return 'Account name must be less than 12 characters';

  if (!/^[a-z1-5.]+$/.test(address))
    return 'Account may only contain: . a-z 1-5';

  if (address.slice(-1) === '.')
    return 'Account cannot end with a "."';

  return 'none';
};

export default validateEosLiquidAccount;
