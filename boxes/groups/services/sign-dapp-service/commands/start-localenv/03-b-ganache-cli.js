const path = require('path');
const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');
const kill = require('kill-port');

const ganachePath = path.resolve('./node_modules/ganache-cli/cli.js');
const mnemonic = 'either ostrich protect kingdom jump flat neck cabin sock they vast merit'

module.exports = async (args) => {
  await killIfRunning(args.evmSisterPort);
  if(args.kill) { return; }
  if(!args.multiEvm) return;
  if(args.singleChain) { return; } // don't run on command
  if(args.chain === "eos") { return; }
  const command = `nohup node ${ganachePath} -h ${args.evmSisterHost} -m \"${mnemonic}\" -b 1 -p ${args.evmSisterPort} >> logs/ganache-sidechain.log 2>&1 &`
  await execPromise(command);
}

const killIfRunning = async (port) => {
  try {
    await kill(port);
  }
  catch (e) { }
};
