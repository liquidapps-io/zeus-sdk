const path = require('path');
const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');
const kill = require('kill-port');

const ganachePath = path.resolve('./node_modules/ganache-cli/cli.js');
const mnemonic = 'either ostrich protect jump kingdom flat neck cabin sock they vast merit'

module.exports = async (args) => {
  await killIfRunning();
  if(args.kill) {
    return;
  }
  if(args.singleChain) { return; } // don't run on command
  const command = `nohup node ${ganachePath} -m \"${mnemonic}\" -b 1 >> logs/ganache.log 2>&1 &`
  await execPromise(command);
}

const killIfRunning = async () => {
  try {
    await kill(8545);
  }
  catch (e) { }
};
