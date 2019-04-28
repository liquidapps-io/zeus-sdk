var path = require('path');
var os = require('os');
var fs = require('fs');
var compileCommand = require('../compile');

var cmd = 'contract';

module.exports = {
  description: 'build a contract',
  builder: (yargs) => {
    yargs.example(`$0 ${cmd}`);
  },
  command: `${cmd} [contract]`,
  handler: async (args) => {
    return compileCommand.handler(args);
  }
};
