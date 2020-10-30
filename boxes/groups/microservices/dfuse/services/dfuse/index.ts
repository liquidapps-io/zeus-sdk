#!/usr/bin/env node

if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }

var backend = process.env.DFUSE_BACKEND || 'dfuse';
const express = require('express');

require(`./backends/${backend}`);

const genApp = () => {
  return express();
};

const appWebHookListener = genApp();
appWebHookListener.listen(process.env.PORT || 3195, () => console.log(`dfuse listening on port ${process.env.PORT || 3195}!`));
