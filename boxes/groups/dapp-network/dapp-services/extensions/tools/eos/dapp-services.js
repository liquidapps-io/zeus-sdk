const { getCreateKeys } = require('../../helpers/key-utils');
const { getEos } = require('./utils');

const { loadModels } = require('../models');
const fetch = require('node-fetch');

const dappServicesContract = process.env.DAPPSERVICES_CONTRACT || 'dappservices';
const testProvidersList = ['pprovider1', 'pprovider2'];

function getContractAccountFor(model) {
  var envName = process.env[`DAPPSERVICES_CONTRACT_${model.name.toUpperCase()}`];
  return envName || model.contract;
}
async function genAllocateDAPPTokens(deployedContract, serviceName, provider = '', selectedPackage = 'default') {
  var providers = testProvidersList;
  if (provider !== '') {
    providers = [provider];
  }
  for (var i = 0; i < providers.length; i++) {
    var currentProvider = providers[i];

    await genAllocateDAPPTokensInner(deployedContract, serviceName, provider = currentProvider, (currentProvider == "pprovider2" && selectedPackage == 'default') ? 'foobar' : selectedPackage);
  }

}

async function genAllocateDAPPTokensInner(deployedContract, serviceName, provider = 'pprovider1', selectedPackage = 'default') {
  var key = await getCreateKeys(dappServicesContract);
  var model = (await loadModels('dapp-services')).find(m => m.name == serviceName);
  var service = getContractAccountFor(model);

  var contract = deployedContract.address;
  var eos = await getEos(contract);
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

  await (await deployedContract.eos.contract('eosio')).updateauth({
    account: contract,
    permission: 'dsp',
    parent: 'active',
    auth: {
      threshold: 1,
      keys: [],
      accounts: [{
        permission: { actor: provider, permission: 'active' },
        weight: 1,
      }],
      waits: []
    }
  }, { authorization: `${contract}@active` });
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
  service
}) => {
  return "http://localhost:13015";
};

const readVRAMData = async({
  contract,
  key,
  table,
  scope,
  keytype
}) => {
  const service = "ipfsservice1";
  const endpoint = getEndpointForContract({ payer: contract, service });
  const result = await postData(`${endpoint}/v1/dsp/${service}/get_table_row`, {
    contract,
    scope,
    table,
    key,
    keytype
  });
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

module.exports = { genAllocateDAPPTokens, dappServicesContract, getContractAccountFor, readVRAMData, getEndpointForContract, testProvidersList };
