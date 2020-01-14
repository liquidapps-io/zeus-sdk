const { createAccount, uploadSystemContract, getEos } = require('../../tools/eos/utils');
const { loadModels } = require('../../tools/models');

var sleep = require('sleep-promise');

module.exports = async(gargs) => {
  if (gargs.creator !== 'eosio') { return; } // only local
  var sidechains = await loadModels('local-sidechains');
  // for each sidechain
  for (var i = 0; i < sidechains.length; i++) {
    var sidechain = sidechains[i];
    var args = { ...gargs, sidechain: sidechain }

    var wallet = args.wallet;
    var creator = args.creator;
    var systemToken = (args.creator !== 'eosio') ? 'EOS' : 'SYS';

    var tries = 20;
    while (tries--) {
      try {
        await uploadSystemContract(args, 'eosio', 'eosio.bios', sidechain);
      }
      catch (e) {
        await sleep(5000);
      }
    }

    const systemAccountList = ['eosio.bpay',
      'eosio.names',
      'eosio.token',
      'eosio.ram',
      'eosio.ramfee',
      'eosio.saving',
      'eosio.msig',
      'eosio.stake',
      'eosio.vpay'
    ];
    await Promise.all(systemAccountList.map(s => createAccount(wallet, creator, s, args, sidechain)));

    await uploadSystemContract(args, 'eosio.token', null, sidechain);
    var eos = await getEos('eosio.token', args, sidechain);
    var contract = await eos.contract('eosio.token');
    await contract.create('eosio', `10000000000.0000 ${systemToken}`, {
      authorization: [`eosio.token@active`]
    });

    eos = await getEos('eosio', args, sidechain);
    contract = await eos.contract('eosio.token');

    await Promise.all([uploadSystemContract(args, 'eosio.msig', null, sidechain), uploadSystemContract(args, 'eosio', 'eosio.system', sidechain), contract.issue('eosio', `1000000000.0000 ${systemToken}`, 'bootstrap', {
      authorization: [`eosio@active`]
    })]);

  }
};
