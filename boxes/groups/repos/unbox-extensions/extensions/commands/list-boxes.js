var path = require('path');
var fs = require('fs');
var { loadPackages } = require('../tools/packages');

const handler = async (args) => {
  if (!global.mapping) {
    global.mapping = await loadPackages(args);
  }
  var mapping = global.mapping;

  console.log(Object.keys(mapping).join('\n'));
};
module.exports = {
  description: 'list canned boxes',
  builder: (yargs) => {
    yargs.example('$0 list-boxes');
  },
  command: 'list-boxes',
  handler
};
