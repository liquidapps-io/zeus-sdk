var path = require('path');
var os = require('os');
var fs = require('fs');
var { execPromise } = require('../helpers/_exec');

// move to global extension when supported

module.exports = {
  description: 'installs the latest version of zeus',
  builder: (yargs) => {
    yargs.example('$0 upgrade');
  },
  command: 'upgrade',
  handler: async (args) => {
    var stdout = await execPromise(`${process.env.NPM || 'npm'} update -g zeus`);
    await execPromise(`${process.env.NPM || 'npm'} update zeus`);
    console.log(stdout);
  }
};
