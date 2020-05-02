#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const camelcase = require('camelcase');

global.enableExt = !(process.argv[2] === 'deploy' && process.argv[3] === 'box');
global.enableExt = global.enableExt && !(process.argv[3] === 'deploy' && process.argv[4] === 'box');

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
  .middleware(argv => {
    // Load rc file if any or report rc ignore to user
    if (!argv['rc-ignore'] && fs.existsSync(argv['rc-file'])) {
      console.log(`loading options from rc file ${argv['rc-file']}`);
      let rc;
      // try and parse RC file, if fail, log unable to parse and continue with command
      try {
        rc = JSON.parse(fs.readFileSync(argv['rc-file']));
      } catch (e) {
        console.log(`Unable to parse RC file`);
        return;
      }
      const validKeys = Object.keys(rc).filter(key => key in argv);
      validKeys.map(key => {
        argv[key] = rc[key];
        const cam = camelcase(key);
        if (cam in argv) {
          argv[cam] = rc[key];
        }
      });
    } else if (argv['rc-ignore']) {
      console.log('ignoring rc file');
    }
    return argv;
  }, true)
  .option('verbose', {
    alias: 'v',
    default: false
  }).commandDir('lib/cmds').help('help')
  .showHelpOnFail(false, 'whoops, something went wrong! run with --help')
  .help('h').alias('h', 'help').demandCommand().completion().strict();


if (global.enableExt) {
  var extPath = path.join(path.resolve('.'), 'commands');
  if (fs.existsSync(extPath)) {
    try {
      currentYargs = currentYargs.commandDir(extPath);
    } catch (e) {
      // If box-utils package is not available this may catch an error.
      // We can ignore the error and assume they are using built-in commands
    }
  }

  if (fs.existsSync(path.resolve('.', 'zeus_boxes'))) {
    var list = fs.readdirSync(path.resolve('.', 'zeus_boxes'), { withFileTypes: true });
    list.forEach(function (dirent) {
      if (dirent.isDirectory()) {
        extPath = path.join(path.resolve('.', 'zeus_boxes', dirent.name, 'commands'));
        if (fs.existsSync(extPath)) { currentYargs = currentYargs.commandDir(extPath); }
      }
    });
  }
}

currentYargs.argv;