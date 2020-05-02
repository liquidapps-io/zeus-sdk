const fsExtra = require('fs-extra')
const path = require('path');

module.exports = async(args) => {
  if (args.creator !== 'eosio') { return; } // only local
  fsExtra.emptyDirSync(path.resolve('./zeus_boxes/dbs'));
};
