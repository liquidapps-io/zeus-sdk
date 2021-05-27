const path = require('path');
const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');
const kill = require('kill-port');

const ganachePath = path.resolve('./node_modules/ganache-cli/cli.js');
const mnemonic = 'either ostrich protect kingdom jump flat neck cabin sock they vast merit'
const port = 8546;

module.exports = async (args) => {
  await killIfRunning();
  if(args.kill) { return; }
  if(!args.multiEvm) return;
  const command = `nohup node ${ganachePath} -m \"${mnemonic}\" -b 1 -p ${port} >> logs/ganache-sidechain.log 2>&1 &`
  await execPromise(command);
}

const killIfRunning = async () => {
  try {
    await kill(port);
  }
  catch (e) { }
};
