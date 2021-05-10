const { requireBox } = require('@liquidapps/box-utils');
const { emojMap } = requireBox('seed-zeus-support/_exec');
const kill = require('kill-port');


const killIfRunning = async (port) => {
  try {
    await kill(port);
  }
  catch (e) { }
};
module.exports = async (args) => {
  if (args.creator !== 'eosio' || process.env.SKIP_IPFS_BOOT) { return; } // only local
  if(args.kill) {
    await killIfRunning(5001);
    await killIfRunning(4002);
    await killIfRunning(3199);
  }
  if(args.services){
    let found = false;
    for(const el of args.services) {
      if(el === "ipfs") found = true;
    }
    if(found) {
      return requireBox('ipfs-daemon/commands/run/ipfs-daemon').handler(args);
    }
    if(!found) {
      console.log(`${emojMap.ok}not running IPFS`);
    }
  } else {
    return requireBox('ipfs-daemon/commands/run/ipfs-daemon').handler(args);
  }
};
