const { requireBox } = require('@liquidapps/box-utils');
module.exports = (args) => {
  if (args.creator !== 'eosio' || process.env.SKIP_IPFS_BOOT) { return; } // only local
  return requireBox('ipfs-daemon/commands/run/ipfs-daemon').handler(args);
};
