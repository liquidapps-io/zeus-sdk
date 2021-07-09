const { requireBox, getBoxesDir } = require('@liquidapps/box-utils');
const { execPromise, emojMap } = requireBox('seed-zeus-support/_exec');
const truffleConfig = require('./truffle/truffle-config')
const fs = require('fs');

module.exports = async (args) => {
  console.log(`\n${emojMap.zap} ETH CONTRACT COMPILING\n`)
    const file = fs.readFileSync(`${__dirname}/truffle/truffle-config.js`, function (err, data) {
      if (err) {
         return console.error(err);
      }
      return data;
   });
    if(!fs.existsSync(`${getBoxesDir()}../truffle-config.js`)) {
        fs.writeFileSync(`${getBoxesDir()}../truffle-config.js`,file)
    }
    await execPromise('npx truffle compile', {
        printOutStream: process.stdout,
        printErrStream: process.stderr
      });
}