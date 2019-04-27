#!/usr/bin/env node

require('babel-core/register');
require('babel-polyfill');
if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }

var backend = process.env.DEMUX_BACKEND || 'state_history_plugin';
const express = require('express');

require(`./backends/${backend}`);

const genApp = () => {
  return express();
};

const appWebHookListener = genApp();
appWebHookListener.listen(process.env.PORT || 3195, () => console.log(`demux listening on port ${process.env.PORT || 3195}!`));
