module.exports = {
  chains: {
    eos: {
      networks: {
        'development': {
          chainId: '',
          host: '127.0.0.1',
          port: 8888,
          secured: false
        },
        'jungle': {
          chainId: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
          host: 'jungle2.cryptolions.io',
          port: 443,
          secured: true
        },
        'jungle3': {
          chainId: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
          host: 'jungle3.cryptolions.io',
          port: 443,
          secured: true
        },
        'kylin': {
          chainId: '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191',
          host: 'api.kylin.eosbeijing.one',
          port: 80,
          secured: false
        },
        'mainnet': {
          chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
          host: 'mainnet.eosn.io',
          port: 443,
          secured: true
        }
      }
    }
  }
};
