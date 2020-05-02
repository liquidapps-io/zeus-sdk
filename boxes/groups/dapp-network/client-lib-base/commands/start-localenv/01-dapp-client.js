const { requireBox, createDir } = require('@liquidapps/box-utils');
const fs = require('fs');
const { execPromise } = requireBox('seed-zeus-support/_exec');

module.exports = async (args) => {
  createDir('client-lib-base/client/src/types/dsp', 'client/src/types/dsp');
  createDir('client-lib-base/client/src/services', 'client/src/services');
  if (!fs.existsSync(`zeus_boxes/client-lib-base/client/dist`)) {
    await execPromise('cd zeus_boxes/client-lib-base/client && npm install && npm run build');
  }
}