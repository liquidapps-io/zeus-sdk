#!/usr/bin/env node

require('babel-core/register');
require('babel-polyfill');
const path = require('path');
const fs = require('fs');

global.enableExt = !(process.argv[2] == 'deploy' && process.argv[3] == 'box');
global.enableExt = global.enableExt && !(process.argv[3] == 'deploy' && process.argv[4] == 'box');

const homedir = require('os').homedir();
var currentYargs = require('yargs') // eslint-disable-line
  .usage('Usage: $0 <cmd> [options]')
  .option('storage-path', {
    describe: 'path for persistent storage',
    default: path.join(homedir, '.zeus')
  })
  .option('verbose', {
    alias: 'v',
    default: false
  }).commandDir('cmds').help('help')
  .showHelpOnFail(false, 'whoops, something went wrong! run with --help')
  .help('h').alias('h', 'help').demandCommand().completion().strict();

var extPath = path.join(path.resolve('.'), 'extensions/commands');
if (fs.existsSync(extPath) && global.enableExt) { currentYargs = currentYargs.commandDir(extPath); }

currentYargs.argv;
