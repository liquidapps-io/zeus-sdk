const { requireBox } = require('@liquidapps/box-utils');
const { createAccount, uploadSystemContract, getEos, enableEosioFeatures, preactiveChain, setPriv, initContract } = requireBox('seed-eos/tools/eos/utils');
var sleep = require('sleep-promise');

module.exports = async (args) => {
  if (args.creator !== 'eosio') { 
    return;
  } // only local
  if(args.kill) {
    return;
  }
  var wallet = args.wallet;
  var creator = args.creator;
  var systemToken = args.customToken?args.customToken:(args.creator !== 'eosio') ? 'EOS' : 'SYS';
  var precision = args.customTokenPrecision ? args.customTokenPrecision :4

  const systemAccountList = [
    'eosio.bpay',
    'eosio.names',
    'eosio.token',
    'eosio.ram',
    'eosio.ramfee',
    'eosio.saving',
    'eosio.msig',
    'eosio.stake',
    'eosio.vpay',
    'eosio.rex'
  ];

  let tries = 20;
  while (tries--) {
    try {
      // await uploadSystemContract(args, 'eosio', 'eosio.bios');
      await uploadSystemContract(args, 'eosio', 'old_eosio.bios');
      // await uploadSystemContract(args, 'eosio', 'eosio.boot');
      break;
    }
    catch (e) {
      await sleep(500);
    }
  }
  if(tries == 0) throw new Error('unable to startup chain')

  tries = 20;
  while (tries--) {
    try {
      await Promise.all(systemAccountList.map(s => createAccount(wallet, creator, s, args)));
      break;
    }
    catch (e) {
      await sleep(500);
    }
  }
  await uploadSystemContract(args, 'eosio.token')
  await uploadSystemContract(args, 'eosio.msig')
  let eos = await getEos('eosio.token', args)
  let contract = await eos.contract('eosio.token');
  let precisionString = '';
  for(let i = 0; i < precision; i++) {
    precisionString += '0';
  }
  await contract.create('eosio', `10000000000.${precisionString} ${systemToken}`, {
    authorization: [`eosio.token@active`]
  });
  eos = await getEos('eosio', args);
  contract = await eos.contract('eosio.token');
  await contract.issue('eosio', `1000000000.${precisionString} ${systemToken}`, 'bootstrap', { authorization: [`eosio@active`] })
  if(args.enableFeatures) {
    await preactiveChain();
    await uploadSystemContract(args, 'eosio', 'eosio.boot')
    await enableEosioFeatures(args, 'eosio');
    await uploadSystemContract(args, 'eosio', 'eosio.system')
    await setPriv(args);
  } else {
    await uploadSystemContract(args, 'eosio', 'old_eosio.system')
  }
};