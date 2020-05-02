var path = require('path');
var os = require('os');
var fs = require('fs');
var exec = require('child_process').exec;
const { generateBackup } = require('../utils/ipfs-service/backup');

var cmd = 'backup-table';

module.exports = {
  description: 'fetches a row from a dapp::multi_index table',
  builder: (yargs) => {
    yargs.option('endpoint', {
      describe: 'network to work on',
      default: 'http://localhost:13015'
    }).example(`$0 ${cmd} mycontract mytable`);
    yargs.option('output', {
      describe: 'backed up manifest output file',
    }).example(`$0 ${cmd} mycontract mytable --output manifest.json`);
  },
  command: `${cmd} <contract> <table>`,
  handler: async (args) => {
    const { contract, table, endpoint, output } = args;
    await generateBackup(contract, table, endpoint, output);
  }
};
