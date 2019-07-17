module.exports = {
  web3Provider: process.env.WEB3_PROVIDER || 'http://localhost:8545',
  eosCreatorKey: process.env.EOS_CREATOR_KEY || '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD35KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
  eosCreatorAccount: process.env.EOS_CREATOR_ACCOUNT || 'eosio',
  ethCreatorKey: process.env.ETH_CREATOR_KEY || '0xa966a4df8f4ad2c5938fce96b46391e45ab6eade06848608020a50938b5dc3a2',
  newEthAccountFundAmount: process.env.ETH_FUND_AMOUNT || '1000000000000000000',
  ethGasPrice: process.env.ETH_GAS_PRICE || '10000000000',
  ethGasLimit: process.env.ETH_GAS_LIMIT || '1000000'
}
