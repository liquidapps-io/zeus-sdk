const path = require('path');
const { execPromise } = require('../../helpers/_exec');
const kill = require('kill-port');

const ganachePath = path.resolve('./node_modules/ganache-cli/cli.js');
const mnemonic = 'either ostrich protect jump kingdom flat neck cabin sock they vast merit'

module.exports = async (args) => {
  await killIfRunning();
  const command = `nohup node ${ganachePath} -m \"${mnemonic}\" >/dev/null 2>&1 &`
  await execPromise(command);
}

const killIfRunning = async() => {
  try {
    await kill(8545);
  }
  catch (e) {}
};