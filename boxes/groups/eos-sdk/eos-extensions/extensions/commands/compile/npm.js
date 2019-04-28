var path = require('path');
var fs = require('fs');
var { execPromise } = require('../../helpers/_exec');

module.exports = async (args) => {
  var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
  if (!packageJson.scripts || !packageJson.scripts.compile) { return; }
  let stdout = await execPromise(`${process.env.NPM || 'npm'} run compile`, {
    cwd: path.resolve('./contracts/eos')
  });
};
