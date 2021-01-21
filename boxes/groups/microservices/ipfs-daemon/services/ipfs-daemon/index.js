#!/usr/bin/env node

if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }
const kill = require('kill-port');

const { promisify } = require('util');
const fs = require('fs');
const Ctl = require('ipfsd-ctl')

function error(e) {
  console.error(e);
  fs.writeFileSync('.out.txt', e);
  process.exit(1);
}

async function run() {
  try { await kill(5001); }
  catch (e) {}
  try { await kill(4002); }
  catch (e) {}
  
  const ipfsd = await Ctl.createController({
      ipfsHttpModule: require('ipfs-http-client'),
      ipfsBin: require('go-ipfs').path()
  })
  ipfsd.initAsync = promisify(ipfsd.init);
  ipfsd.startAsync = promisify(ipfsd.start);
  if (!ipfsd.initialized) { await ipfsd.initAsync(); }
  if (!ipfsd.started) { await ipfsd.startAsync(); }
  ipfsd.api.idAsync = promisify(ipfsd.api.id);
  const id = await ipfsd.api.id()
  const appWebHookListener = genApp();
  fs.writeFileSync('.out.txt', JSON.stringify(ipfsd));
  appWebHookListener.listen(process.env.PORT || 3199, () => console.log(`ipfs daemon controller listening on port ${process.env.PORT || 3199}!`));
}

run().catch(error);

const express = require('express');
const genApp = () => {
  return express();
};
