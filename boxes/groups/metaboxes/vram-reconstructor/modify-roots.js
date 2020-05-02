require("dotenv").config();
const fs = require('fs');
const { requireBox } = require('@liquidapps/box-utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');

const table = process.env.TABLE || "claiminfo114";
const batchSize = parseInt(process.env.BATCH_SIZE || "10");
const account = "moonlight.co";
//const httpEndpoint = "https://eos.greymass.com:443";
const httpEndpoint = "http://localhost:8888";

let eos, roots;

async function modifyBatch(size) {
  const batch = roots.splice(0, size);
  const actions = batch.map(uri => ({
    account,
    name: 'modroots1', // temp hardcode?
    authorization: [{
      actor: account, // needs to be changes... special permissions
      permission: 'active'
    }],
    data: { ...uri }
  }))
  await eos.transact({
    actions
  }, {
    expireSeconds: 120,
    sign: true,
    broadcast: true,
    blocksBehind: 10
  });
}


async function run() {
  const keys = await getCreateKeys(account);
  eos = getEosWrapper({ httpEndpoint, keyProvider: keys.active.privateKey });
  roots = JSON.parse(fs.readFileSync(`./${account}-${table}-roots.json`));

  while (roots.length) {
    await modifyBatch(batchSize);
    console.log(`${roots.length} left`);
  }
}

run().catch(console.log);
