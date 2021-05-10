const { PrivateKey } = require('eosjs-ecc');
const { requireBox } = require('@liquidapps/box-utils');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { execPromise } = requireBox('seed-zeus-support/_exec');
const fs = require('fs');
const safe = require('./safe');
const path = require('path');

async function createKeys(args = getDefaultArgs()) {
  var key = await PrivateKey.randomKey();
  return {
    owner: {
      privateKey: key.toWif(),
      publicKey: key.toPublic().toString()
    },
    active: {
      privateKey: key.toWif(),
      publicKey: key.toPublic().toString()
    }
  };
}

async function getCreateKeys(account, args = getDefaultArgs(), dontCreateIfHaveKeys, sidechain) {
  if (!args)
    args = getDefaultArgs();
  const { wallet, storagePath, network } = args;
  // check if private key exists.
  var accountDir = path.resolve(storagePath, 'networks', sidechain ? sidechain.name : network, 'accounts');
  var accountPath = path.join(accountDir, `${account}.json`);
  if (!fs.existsSync(accountDir)) { await execPromise(`mkdir -p ${accountDir}`); }
  var existingKeys = await loadKeys(accountPath);
  if (existingKeys && existingKeys.privateKey) {
    // backwards compatibility
    existingKeys = {
      owner: {
        privateKey: existingKeys.privateKey,
        publicKey: existingKeys.publicKey
      },
      active: {
        privateKey: existingKeys.privateKey,
        publicKey: existingKeys.publicKey
      }
    };
  }
  if (existingKeys && dontCreateIfHaveKeys) {
    return existingKeys;
  }
  existingKeys = existingKeys || await saveKeys(accountPath, await createKeys(args));
  // backwards compatibility
  return existingKeys;
}

async function saveKeys(fullPath, keys) {
  // generate
  // console.log("fullPath",fullPath,keys);
  fs.writeFileSync(fullPath, JSON.stringify(keys));
  return keys;
}

async function loadKeys(fullPath) {
  // check if file exists
  if (fs.existsSync(fullPath)) {
    return JSON.parse(fs.readFileSync(fullPath).toString());
  }
}

function getEncryptedKey(account, password, args = getDefaultArgs(), sidechain) {
  const keyPath = `${args.storagePath}/networks/${args.network}/encrypted-accounts/${account}.json`;
  const key = safe.decryptData(keyPath, password);
  return key;
}

module.exports = {
  createKeys,
  getCreateKeys,
  getEncryptedKey
}
