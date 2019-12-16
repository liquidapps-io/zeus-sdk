const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = require('../../tools/eos/dapp-services');
const { getEos } = require('../../tools/eos/utils');

const contractName = 'moonlight.co';
const mockContract = artifacts.require('./mockcontract/')

async function setUp() {
  const deployedContract = await deployer.deploy(mockContract, contractName);
  await genAllocateDAPPTokens(deployedContract, 'ipfs');
  const eos = await getEos('eosio');
  await eos.transact({
    actions: [
      {
        account: 'eosio',
        name: 'buyram',
        authorization: [{
          actor: 'eosio',
          permission: 'active',
        }],
        data: {
          payer: 'eosio',
          receiver: 'moonlight.co',
          quant: `10000.0000 SYS`,
        },
      }
    ]
  }, {
    blocksBehind: 3,
    expireSeconds: 30,
  });
}

module.exports = async (args) => {
  await setUp();
}