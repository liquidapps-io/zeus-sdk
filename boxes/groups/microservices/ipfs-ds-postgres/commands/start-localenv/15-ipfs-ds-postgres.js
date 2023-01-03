const { requireBox } = require("@liquidapps/box-utils");
const { emojMap, execPromise } = requireBox("seed-zeus-support/_exec");
const kill = require("kill-port");
const fs = require("fs");

const killIfRunning = async (port) => {
  try {
    await kill(port);
  } catch (e) {}
};
module.exports = async (args) => {
  if (args.creator !== "eosio" || process.env.SKIP_IPFS_BOOT) {
    return;
  } // only local
  if (args.kill) {
    await killIfRunning(process.env.IPFS_POSTGRESQL_PORT || 8090);
  }
  if (
    !fs.existsSync("./go.mod") &&
    fs.existsSync(
      "zeus_boxes/ipfs-ds-postgres/services/ipfs-ds-postgres/go.mod"
    )
  ) {
    fs.renameSync(
      "zeus_boxes/ipfs-ds-postgres/services/ipfs-ds-postgres/go.mod",
      "./go.mod"
    );
  }
  if (
    !fs.existsSync("./go.sum") &&
    fs.existsSync(
      "zeus_boxes/ipfs-ds-postgres/services/ipfs-ds-postgres/go.sum"
    )
  ) {
    fs.renameSync(
      "zeus_boxes/ipfs-ds-postgres/services/ipfs-ds-postgres/go.sum",
      "./go.sum"
    );
  }
  if (args.services && args.ipfsPostgres) {
    let found = false;
    for (const el of args.services) {
      if (el === "ipfs") found = true;
    }
    if (found) {
      await execPromise(
        "nohup go run ./zeus_boxes/ipfs-ds-postgres/services/ipfs-ds-postgres/main.go >> ./logs/ipfs-ds-postgres.log 2>&1 &",
        { unref: true }
      );
    }
    if (!found) {
      console.log(`${emojMap.ok}not running IPFS PostgreSQL service`);
    }
  } else if (args.ipfsPostgres) {
    console.log(`${emojMap.ok}running IPFS PostgreSQL service`);
    await execPromise(
      "nohup go run ./zeus_boxes/ipfs-ds-postgres/services/ipfs-ds-postgres/main.go >> ./logs/ipfs-ds-postgres.log 2>&1 &",
      { unref: true }
    );
  }
};
