var path = require('path');
var os = require('os');
var fs = require('fs');
const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');

// move to global extension when supported

module.exports = {
  description: 'installs the latest version of zeus',
  builder: (yargs) => {
    yargs.example('$0 upgrade');
  },
  command: 'upgrade',
  handler: async (args) => {
    var stdout = await execPromise(`${process.env.NPM || 'npm'} update -g @liquidapps/zeus-cmd`);
    await execPromise(`${process.env.NPM || 'npm'} update @liquidapps/zeus-cmd`);
    console.log(stdout);
  }
};
