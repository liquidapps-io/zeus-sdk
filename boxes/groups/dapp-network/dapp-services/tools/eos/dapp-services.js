const { requireBox } = require('@liquidapps/box-utils');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getEos } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');
const fetch = require('node-fetch');
const logger = requireBox('log-extensions/helpers/logger');
const dappServicesContract = process.env.DAPPSERVICES_CONTRACT || 'dappservices';
const dappRewardsContract = process.env.DAPP_REWARDS_CONTRACT || 'dappsplitter';
const dappServicesLiquidXContract = process.env.DSP_LIQUIDX_CONTRACT || 'liquidx';
// accounts 8,9 based on mnemonic provide 03-a/b
const testProvidersList = [
  {
    account: 'pprovider1',
    key:'0x50e66efcac83baba59c8021ae49c54d7c65fba897a1cb6038878f15f89009ad6',
    sidechain_key:'0x4d3dcab00d3d780b6acc8481d72f263fde4c6d9627e3227be7c30873d17a54bd'
  },
  {
    account: 'pprovider2',
    key:'0xb5da36d79df92e18c85ca54bcbb3cfae4899bb41674163d98d95c4b35ae5ceb4',
    sidechain_key:'0x3b58e1ca05f04201bfa0ad114f3667295613576869e923fce4d37322287f542d'
  }
];

// return service account name given a service model, if sidechain, return sidechain service account
// TODO: does not assert if one way mapping not found for account link
function getContractAccountFor(model, sidechain = null) {
  if (sidechain) {
    const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === model.contract);
    if (mapEntry)
      return mapEntry.chain_account;
  }
  var envName = process.env[`DAPPSERVICES_CONTRACT_${model.name.toUpperCase()}`];
  return envName || model.contract;
}

async function genAllocateDAPPTokens(deployedContract, serviceName, provider = '', selectedPackage = 'default', sidechain = null, updConsumerAuth = true) {
  var providers = testProvidersList;
  if (provider !== '') {
    providers = {account:provider};
    providers = [providers];
  }
  for (var i = 0; i < providers.length; i++) {
    var currentProvider = providers[i].account;
    await genAllocateDAPPTokensInner(deployedContract, serviceName, provider = currentProvider, (currentProvider == "pprovider2" && selectedPackage == 'default') ? 'foobar' : selectedPackage, sidechain, providers, updConsumerAuth);
  }
}

async function genAllocateDAPPTokensInner(deployedContract, serviceName, provider = 'pprovider1', selectedPackage = 'default', sidechain = null, providers = testProvidersList[0], updConsumerAuth) {
  var key = await getCreateKeys(dappServicesContract, null, false, sidechain);
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = getContractAccountFor(model);
  var contract = deployedContract.address;
  var eos = await getEos(contract, null, sidechain);
  let servicesTokenContract = await eos.contract(dappServicesContract);
  await servicesTokenContract.issue({
    to: contract,
    quantity: '1000.0000 DAPP',
    memo: `${provider}`
  }, {
    authorization: `${dappServicesContract}@active`,
    keyProvider: [key.active.privateKey]
  });
  await servicesTokenContract.selectpkg({
    owner: contract,
    provider,
    service,
    'package': selectedPackage
  }, {
    authorization: `${contract}@active`,
  });
  await servicesTokenContract.stake({
    from: contract,
    service,
    provider,
    quantity: '500.0000 DAPP'
  }, {
    authorization: `${contract}@active`,
  });
  // for testing backwards compatibility
  if (!updConsumerAuth) { return; }
  let auth = providers.map(p => {
    return {
      permission: { actor: p.account, permission: 'active' },
      weight: 1,
    }
  });
  await (await eos.contract('eosio')).updateauth({
    account: contract,
    permission: 'dsp',
    parent: 'active',
    auth: {
      threshold: 1,
      keys: [],
      accounts: auth,
      waits: []
    }
  }, { authorization: `${contract}@active` });
  try {
    var commandNames = Object.keys(model.commands);
    await Promise.all(commandNames.map(async (command) => {
      await (await eos.contract('eosio')).linkauth({
        account: contract,
        code: contract,
        type: `x${command}`,
        requirement: 'dsp'
      }, { authorization: `${contract}@active` });
    }));
  } catch (e) { }
}

function postData(url = ``, data = {}) {
  // Default options are marked with *
  return fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, cors, *same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      // "Content-Type": "application/json",
      // "Content-Type": "application/x-www-form-urlencoded",
    },
    redirect: 'follow', // manual, *follow, error
    referrer: 'no-referrer', // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  })
    .then(response => response.json()); // parses response to JSON
}

const getEndpointForContract = ({
  payer,
  service,
  sidechain
}) => {
  if (sidechain) {
    // resolve sidechain
    return `http://localhost:${sidechain.dsp_port}`;
  }
  // if DSP_PORT set, use port, if not 13015 for zeus tests
  return `http://localhost:${process.env.DSP_PORT || 13015}`;
};

const readVRAMData = async ({
  contract,
  key,
  table,
  scope,
  keytype,
  keysize,
  sidechain
}) => {
  const service = "ipfsservice1";
  const endpoint = getEndpointForContract({ payer: contract, service, sidechain });
  const result = await postData(`${endpoint}/v1/dsp/${service}/get_table_row`, {
    contract,
    scope,
    table,
    key,
    keytype,
    keysize
  });
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

const readIPFSData = async ({
  contract,
  uri,
  sidechain
}) => {
  const service = "ipfsservice1";
  const endpoint = getEndpointForContract({ payer: contract, service, sidechain });
  const result = await postData(`${endpoint}/v1/dsp/${service}/get_uri`, { uri });
  // if (result.error) {
  //   throw new Error(result.error);
  // }
  return result;
};

const createLiquidXMapping = async (sidechain_name, mainnet_account, chain_account, oneway) => {
  const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain_name && m.mainnet_account === "dappservices");
  if (!mapEntry)
    throw new Error('mapping not found')
  const dappservicex = mapEntry.chain_account;
  var sidechain = (await loadModels('eosio-chains')).find(m => m.name == sidechain_name);
  const eos = await getEos(chain_account, null, sidechain);
  let sisterChainDappServices = await eos.contract(dappservicex);
  await sisterChainDappServices.setlink({
    owner: chain_account,
    mainnet_owner: mainnet_account,
  }, { authorization: `${chain_account}@active` });
  if (!oneway) {
    var eosMain = await getEos(mainnet_account);
    let liquidXInstance = await eosMain.contract(dappServicesLiquidXContract);
    await liquidXInstance.addaccount({
      owner: mainnet_account,
      chain_account,
      chain_name: sidechain_name
    }, { authorization: `${mainnet_account}@active` });
  }
}
module.exports = {
  genAllocateDAPPTokens,
  dappServicesContract,
  getContractAccountFor,
  readVRAMData,
  readIPFSData,
  getEndpointForContract,
  testProvidersList,
  dappServicesLiquidXContract,
  createLiquidXMapping,
  dappRewardsContract
};
