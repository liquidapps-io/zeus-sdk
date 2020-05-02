const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const fetch = require('node-fetch');
var cmd = 'readfn';

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
module.exports = {
  description: 'calls a "read function"',
  builder: (yargs) => {
    yargs.option('endpoint', {
      describe: 'network to work on',
      default: 'http://localhost:13015'
    }).example(`$0 ${cmd} mycontract readtest '{"account1"}'`);
  },
  command: `${cmd} <contract> <method> <payload>`,
  handler: async (args) => {
    var models = await loadModels('dapp-services');
    var service = models.find(a => a.name == 'readfn').contract;
    const { contract, method, payload, endpoint, sidechain } = args;
    const result = await postData(`${endpoint}/v1/dsp/${service}/read`, { contract_code: contract, method, payload: JSON.parse(payload) });
    console.log(JSON.stringify(result));
  }
};
