const { execPromise } = require('../../helpers/_exec');
const fs = require('fs');
var path = require('path');

module.exports = async (args) => {
  // check if dapp-client already built
  if(!fs.existsSync(`${path.resolve('client')}/dist`)) { 
    await execPromise('cd client && npm run build');
  }
}