const { createDir } = require('@liquidapps/box-utils');

module.exports = async (args, zeusbox) => {
  // move all eth contracts to single dir
  createDir('contracts/eth', 'contracts/eth');
}