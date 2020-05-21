const { createDir } = require('@liquidapps/box-utils');

module.exports = async (args) => {
  createDir('client-lib-base/client/src/types/dsp', 'client/src/types/dsp');
  createDir('client-lib-base/client/src/services', 'client/src/services');
}