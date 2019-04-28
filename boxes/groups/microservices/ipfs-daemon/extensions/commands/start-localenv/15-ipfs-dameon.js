module.exports = (args) => {
  if (args.creator !== 'eosio' || process.env.SKIP_IPFS_BOOT) { return; } // only local
  return require('../run/ipfs-daemon').handler(args);
};
