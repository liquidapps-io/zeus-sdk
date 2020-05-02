const { requireBox } = require('@liquidapps/box-utils');
const { createAccount, uploadSystemContract, getEos } = requireBox('seed-eos/tools/eos/utils');
var sleep = require('sleep-promise');

module.exports = async (args) => {
  if (args.creator !== 'eosio') { return; } // only local

  var wallet = args.wallet;
  var creator = args.creator;
  var systemToken = (args.creator !== 'eosio') ? 'EOS' : 'SYS';

  var tries = 20;
  await sleep(3000);
  while (tries--) {
    try {
      await uploadSystemContract(args, 'eosio', 'eosio.bios');
      break;
    }
    catch (e) {
      await sleep(500);
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
  await Promise.all(systemAccountList.map(s => createAccount(wallet, creator, s, args)));

  await uploadSystemContract(args, 'eosio.token');
  var eos = await getEos('eosio.token', args);
  var contract = await eos.contract('eosio.token');
  await contract.create('eosio', `10000000000.0000 ${systemToken}`, {
    authorization: [`eosio.token@active`]
  });

  eos = await getEos('eosio', args);
  contract = await eos.contract('eosio.token');

  await Promise.all([uploadSystemContract(args, 'eosio.msig'), uploadSystemContract(args, 'eosio', 'eosio.system'), contract.issue('eosio', `1000000000.0000 ${systemToken}`, 'bootstrap', {
    authorization: [`eosio@active`]
  })]);
};
