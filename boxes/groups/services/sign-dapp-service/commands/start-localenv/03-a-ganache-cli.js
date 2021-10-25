const path = require('path');
const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');
const kill = require('kill-port');

const ganachePath = path.resolve('./node_modules/ganache-cli/cli.js');
const mnemonic = 'either ostrich protect jump kingdom flat neck cabin sock they vast merit'
const pot = 

module.exports = async (args) => {
  await killIfRunning(args.evmPort);
  if(args.kill) { return; }
  const command = `nohup node ${ganachePath} -h ${args.evmHost} -m \"${mnemonic}\" -b 1 -p ${args.evmPort} >> logs/ganache.log 2>&1 &`
  await execPromise(command);
}

const killIfRunning = async (port) => {
  try {
    await kill(port);
  }
  catch (e) { }
};
