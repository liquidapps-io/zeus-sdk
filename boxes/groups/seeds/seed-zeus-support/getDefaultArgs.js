const os = require('os');
const path = require('path');
const fs = require('fs');

function getDefaultArgs() {
  const defaultArgs = {
    network: 'development',
    storagePath: path.resolve(os.homedir(), '.zeus'),
    stake: '300.0000',
    transfer: '1000.0000',
    creator: 'eosio',
    wallet: 'zeus',
    creatorKey: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
    ...process.env // allows overiding default args with an .env file
  };
  var currentArgs = defaultArgs;
  if (fs.existsSync(path.resolve('../../zeus-config.js'))) {
    const zeusConfig = require('../../zeus-config');
    if (zeusConfig.defaultArgs) { currentArgs = { ...currentArgs, ...zeusConfig.defaultArgs }; }
  }

  if (process.env.ZEUS_ARGS) {
    global.yargsArgs = JSON.parse(process.env.ZEUS_ARGS);
  }
  if (global.yargsArgs) {
    currentArgs = { ...currentArgs, ...global.yargsArgs };
  }
  return currentArgs;
}

module.exports = getDefaultArgs;
