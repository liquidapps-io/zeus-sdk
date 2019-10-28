var path = require('path');
var os = require('os');
var fs = require('fs');
var exec = require('child_process').exec;
var { execPromise, emojMap } = require('../helpers/_exec');
const { loadModels } = require('../tools/models');
const fetch = require('node-fetch');

var cmd = 'get-table-row';

function postData (url = ``, data = {}) {
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
  description: 'fetches a row from a dapp::multi_index table',
  builder: (yargs) => {
    yargs.option('endpoint', {
      describe: 'network to work on',
      default: 'http://localhost:13015'
    }).example(`$0 ${cmd} mycontract mytable myscope mykey mykeytype`);
  },
  command: `${cmd} <contract> <table> <scope> <key> <keytype>`,
  handler: async (args) => {
    var models = await loadModels('dapp-services');
    var service = models.find(a => a.name == 'ipfs').contract;
    const { contract, table, scope, key, keytype, endpoint } = args;
    const result = await postData(`${endpoint}/v1/dsp/${service}/get_table_row`, { contract, scope, table, key, keytype });
    console.log(JSON.stringify(result));
  }
};
