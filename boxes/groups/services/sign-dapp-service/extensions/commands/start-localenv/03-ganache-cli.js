const { execPromise } = require('../../helpers/_exec');
const kill = require('kill-port');

const ganachePath = '../../../node_modules/ganache-cli/cli.js';

module.exports = async (args) => {
  await killIfRunning();
  await execPromise(`nohup node ${ganachePath} >/dev/null 2>&1`, { unref: true });
}

const killIfRunning = async() => {
  try {
    await kill(8545);
  }
  catch (e) {}
};