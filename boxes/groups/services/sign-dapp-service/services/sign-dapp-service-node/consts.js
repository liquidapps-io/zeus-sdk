if (process.env.PRODUCTION) {
  // assert certain env vars are defined, don't want DSP's
  // falling back to invalid keys/accounts
}

module.exports = {
  // eos stuff
  eosSignerAccount: process.env.EOS_SIGNER_ACCOUNT || 'eosio',
  eosNonceHolderAccount: process.env.EOS_NONCE_HOLDER_ACCOUNT || 'nonceholder1',
  eosNonceHandlerAccount: process.env.EOS_NONCE_HANDLER_ACCOUNT || process.env.EOS_SIGNER_ACCOUNT || 'eosio',
  eosSignerKey: process.env.EOS_SIGNER_KEY || '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD35KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
  eosNonceHandlerKey: process.env.EOS_NONCE_HANDLER_KEY || process.env.EOS_SIGNER_KEY || '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD35KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
  eosChainId: process.env.EOS_CHAIN_ID || 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f',
  nodeosPort: process.env.NODEOS_PORT || '8888',
  nodeosUrl: process.env.NODEOS_URL || 'http://127.0.0.1',
  // eth stuff
  web3Provider: process.env.WEB3_PROVIDER || 'http://localhost:8545',
  ethCreatorKey: process.env.ETH_CREATOR_KEY || '0xa966a4df8f4ad2c5938fce96b46391e45ab6eade06848608020a50938b5dc3a2',
  ethPrivateKey: process.env.ETH_PRIVATE_KEY || '0xa966a4df8f4ad2c5938fce96b46391e45ab6eade06848608020a50938b5dc3a2',
  ethAddress: process.env.ETH_ADDRESS || '0x69ddf61ebae5d5917565f9ae2ae7c4d6bba2944f',
  newEthAccountFundAmount: process.env.ETH_FUND_AMOUNT || '1000000000000000000',
  ethGasPrice: process.env.ETH_GAS_PRICE || '1000000',
  ethGasLimit: process.env.ETH_GAS_LIMIT || '5000000',
}
