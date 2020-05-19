const fs = require('fs');
const path = require('path');

function _require(f) {
  const base = path.parse(f).base;
  const abiPath = `./zeus_boxes/contracts/eos/${base}/${base}.abi`;
  const abi = fs.readFileSync(abiPath).toString();
  return { name: base, abi, abiPath, binaryPath: `./zeus_boxes/contracts/eos/${f}` };
}

module.exports = {
  require: _require
};
