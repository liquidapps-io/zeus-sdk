const { uploadContract, getCreateAccount, getUrl, getNetwork } = require('./utils');
const Eos = require('eosjs');
const getDefaultArgs = require('../../helpers/getDefaultArgs');

async function setContractPermissions (args, account, keys) {
  var selectedNetwork = getNetwork(args);
  var config = {
    expireInSeconds: 120,
    sign: true,
    keyProvider: keys.active.privateKey,
    chainId: selectedNetwork.chainId
  };
  var endpoint = getUrl(args);
  if (endpoint.toLocaleLowerCase().startsWith('https')) {
    config.httpsEndpoint = endpoint;
  } else {
    config.httpEndpoint = endpoint;
  }

  const eos = new Eos(config);
  await eos.updateauth({
    account: account,
    permission: 'active',
    parent: 'owner',
    auth: { threshold: 1,
      keys: [ { key: keys.active.publicKey, weight: 1 } ],
      accounts:
                        [ { permission: { actor: account, permission: 'eosio.code' },
                          weight: 1 }]
    } }, { authorization: `${account}@owner` });
}

async function deploy (contract, account, args = getDefaultArgs()) {
  if (!account) {
    account = contract.name;
  }
  const keys = await getCreateAccount(account, args);

  // create account
  // console.log(`deploying contract:${contract.name}.wasm to account:${account}`);
  // contract - add address
  await uploadContract(args, account, contract.binaryPath);
  contract.address = account;
  var selectedNetwork = getNetwork(args);
  var config = {
    expireInSeconds: 120,
    sign: true,
    keyProvider: keys.active.privateKey,
    chainId: selectedNetwork.chainId
  };
  var endpoint = getUrl(args);
  if (endpoint.toLocaleLowerCase().startsWith('https')) {
    config.httpsEndpoint = endpoint;
  } else {
    config.httpEndpoint = endpoint;
  }

  await setContractPermissions(args, account, keys);

  const eos = new Eos(config);
  const contractInstance = await eos.contract(account);

  return {
    contractInstance, // ready to go with permissions
    contract: {
      ...contract,
      address: account,
      account
    },
    account,
    address: account,
    eos,
    keys
  };
}
function createDeployer (args) {
  return {
    deploy: (contract, account) => deploy(contract, account, args)
  };
}

module.exports = {
  deploy,
  createDeployer
};
