#!/usr/bin/env node

require('babel-core/register');
require('babel-polyfill');
const path = require('path');
const fs = require('fs');

global.enableExt = !(process.argv[2] == 'deploy' && process.argv[3] == 'box');
global.enableExt = global.enableExt && !(process.argv[3] == 'deploy' && process.argv[4] == 'box');

const homedir = require('os').homedir();
const storagePath = path.join(homedir, '.zeus');
const rcFile = path.join(storagePath, 'zeusrc.json');
var currentYargs = require('yargs') // eslint-disable-line
  .usage('Usage: $0 <cmd> [options]')
  .option('storage-path', {
    describe: 'path for persistent storage',
    default: storagePath
  })
  .option('rc-file', {
    describe: 'use rc file to load options from',
    default: rcFile
  })
  .option('rc-ignore', {
    describe: 'ignore rc file',
    default: false
  })
  .option('verbose', {
    alias: 'v',
    default: false
  }).commandDir('cmds').help('help')
  .showHelpOnFail(false, 'whoops, something went wrong! run with --help')
  .help('h').alias('h', 'help').demandCommand().completion().strict();

// Load rc file if any or report rc ignore to user
if (!currentYargs.argv.rcIgnore && fs.existsSync(currentYargs.argv.rcFile)) {
  console.log(`loading options from rc file ${currentYargs.argv.rcFile}`);
  const config = JSON.parse(fs.readFileSync(currentYargs.argv.rcFile));
  currentYargs = currentYargs.config(config);
} else if (currentYargs.argv.rcIgnore) {
  console.log('ignoring rc file');
}

var extPath = path.join(path.resolve('.'), 'extensions/commands');
if (fs.existsSync(extPath) && global.enableExt) { currentYargs = currentYargs.commandDir(extPath); }

currentYargs.argv;
