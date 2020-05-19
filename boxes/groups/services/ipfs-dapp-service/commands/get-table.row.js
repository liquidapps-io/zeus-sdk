const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const fetch = require('node-fetch');

var cmd = 'get-table-row';

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
  description: 'fetches a row from a dapp::multi_index table \nkey type (optional): name, number, hex \nkey size (optional): 64 (uint64_t), 128 (uint128_t), 256 (uint256_t, eosio::checksum256)',
  builder: (yargs) => {
    yargs.option('endpoint', {
      describe: 'network to work on',
      default: 'http://localhost:13015'
    })
      .example(`$0 ${cmd} mycontract mytable myscope mykey mykeytype mykeysize`)
      .example(`$0 ${cmd} zeus get-table-row portfoliojng users portfoliojng micheck12 name 64 --endpoint https://jungle-dsp-2.liquidapps.io/`);
  },
  command: `${cmd} <contract> <table> <scope> <key> [keytype] [keysize]`,
  handler: async (args) => {
    var models = await loadModels('dapp-services');
    var service = models.find(a => a.name == 'ipfs').contract;
    const { contract, table, scope, key, keytype, keysize, endpoint } = args;
    const result = await postData(`${endpoint}/v1/dsp/${service}/get_table_row`, { contract, scope, table, key, keytype, keysize });
    console.log(JSON.stringify(result));
  }
};
