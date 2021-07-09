const { requireBox } = require('@liquidapps/box-utils');
const { createAccount, uploadSystemContract, getEos, enableEosioFeatures, preactiveChain, setPriv, initContract } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');

var sleep = require('sleep-promise');

module.exports = async (args) => {
  if (args.creator !== 'eosio') { 
    return;
  } // only local
  if(args.kill) {
    return;
  }
  if(args.singleChain) { return; } // don't run on command
  var sidechains = await loadModels('eosio-chains');
  // for each sidechain
  for (var i = 0; i < sidechains.length; i++) {
    if (sidechains[i].local === false) return;
    var sidechain = sidechains[i];
    var args = { ...args, sidechain: sidechain }

    var wallet = args.wallet;
    var creator = args.creator;
    var systemToken = (args.creator !== 'eosio') ? 'EOS' : 'SYS';

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
        await uploadSystemContract(args, 'eosio', 'old_eosio.bios', sidechain);
        break;
      }
      catch (e) {
        await sleep(500);
      }
    }
    if(tries == 0) throw new Error('unable to startup chain')
    await Promise.all(systemAccountList.map(s => createAccount(wallet, creator, s, args, sidechain)));
    await uploadSystemContract(args, 'eosio.token', null, sidechain)
    await uploadSystemContract(args, 'eosio.msig', null, sidechain)
    let eos = await getEos('eosio.token', args, sidechain)
    let contract = await eos.contract('eosio.token');
    await contract.create('eosio', `10000000000.0000 ${systemToken}`, {
      authorization: [`eosio.token@active`]
    });
    eos = await getEos('eosio', args, sidechain);
    contract = await eos.contract('eosio.token');
    await contract.issue('eosio', `1000000000.0000 ${systemToken}`, 'bootstrap', { authorization: [`eosio@active`] })
    if(args.enableFeatures) {
      await preactiveChain(sidechain);
      await uploadSystemContract(args, 'eosio', 'eosio.boot', sidechain);
      await enableEosioFeatures(args, 'eosio', sidechain);
      await uploadSystemContract(args, 'eosio', 'eosio.system', sidechain)	
      await setPriv(args, sidechain);
    } else {
      await uploadSystemContract(args, 'eosio', 'old_eosio.system', sidechain)	
    }
  }
};
