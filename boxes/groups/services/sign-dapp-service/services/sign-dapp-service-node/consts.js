if (process.env.PRODUCTION) {
  if (!process.env.WEB3_PROVIDER)
    throw new Error('web3 provider must be defined');

  if (!process.env.EOS_PRIVATE_KEY) {
    throw new Error('eos private key must be defined');
  }
}

module.exports = {
  web3Provider: process.env.WEB3_PROVIDER || 'http://localhost:8545',
  eosCreatorKey: process.env.EOS_CREATOR_KEY || '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD35KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
  eosPrivateKey: process.env.EOS_PRIVATE_KEY || '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD35KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
  eosCreatorAccount: process.env.EOS_CREATOR_ACCOUNT || 'eosio',
  ethCreatorKey: process.env.ETH_CREATOR_KEY || '0xa966a4df8f4ad2c5938fce96b46391e45ab6eade06848608020a50938b5dc3a2',
  ethPrivateKey: process.env.ETH_PRIVATE_KEY || '0xa966a4df8f4ad2c5938fce96b46391e45ab6eade06848608020a50938b5dc3a2',
  ethAddress: process.env.ETH_ADDRESS || '0x69ddf61ebae5d5917565f9ae2ae7c4d6bba2944f',
  newEthAccountFundAmount: process.env.ETH_FUND_AMOUNT || '1000000000000000000',
  ethGasPrice: process.env.ETH_GAS_PRICE || '1000000',
  ethGasLimit: process.env.ETH_GAS_LIMIT || '5000000'
}
