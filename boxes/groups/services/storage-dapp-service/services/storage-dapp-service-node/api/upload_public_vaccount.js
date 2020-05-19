const { requireBox } = require('@liquidapps/box-utils');
const ecc = require("eosjs-ecc");
const fetch = require("node-fetch");
const { JsonRpc } = require("eosjs");
const { BigNumber } = require(`bignumber.js`);
const { emitUsage, getLinkedAccount } = requireBox('dapp-services/services/dapp-services-node/common');

const {
  readVRAMData,
  getContractAccountFor,
  getEndpointForContract
} = requireBox('dapp-services/tools/eos/dapp-services')
const { unpack, saveDirToIPFS, saveToIPFS, hashData256 } = requireBox('storage-dapp-service/services/storage-dapp-service-node/common');
const logger = requireBox("log-extensions/helpers/logger");

const getOrCreateDailyLimits = ({ sidechain, state, contract }) => {
  const sidechainIdentifier = sidechain || `mainnet`;
  const dayIdentifier = Math.floor(
    new Date().getTime() / (1000 * 60 * 60 * 24)
  );
  if (!state.dailyLimits[dayIdentifier]) {
    // new day started, free memory by removing all old daily limits
    state.dailyLimits = { [dayIdentifier]: {} };
  }
  if (!state.dailyLimits[dayIdentifier][sidechainIdentifier]) {
    state.dailyLimits[dayIdentifier][sidechainIdentifier] = {};
  }
  if (!state.dailyLimits[dayIdentifier][sidechainIdentifier][contract]) {
    state.dailyLimits[dayIdentifier][sidechainIdentifier][contract] = {
      uploaded: new BigNumber(`0`),
      vaccounts: {}
    };
  }

  return state.dailyLimits[dayIdentifier][sidechainIdentifier][contract];
};

const updateLimits = ({ data, stateDailyLimits, vaccountName }) => {
  stateDailyLimits.uploaded = stateDailyLimits.uploaded.plus(data.byteLength);

  if (!stateDailyLimits.vaccounts[vaccountName]) {
    stateDailyLimits.vaccounts[vaccountName] = new BigNumber(`0`);
  }
  stateDailyLimits.vaccounts[vaccountName] = stateDailyLimits.vaccounts[
    vaccountName
  ].plus(data.byteLength);
};

const checkLimits = ({
  data,
  contractLimits,
  stateDailyLimits,
  vaccountName
}) => {
  const {
    max_file_size_in_bytes,
    global_upload_limit_per_day,
    vaccount_upload_limit_per_day
  } = contractLimits;

  if (max_file_size_in_bytes.isLessThan(data.byteLength))
    throw new Error(
      `max file size surpassed (${max_file_size_in_bytes} bytes)`
    );

  // current + new > limit <=> limit - new < current
  if (
    global_upload_limit_per_day
      .minus(data.byteLength)
      .isLessThan(stateDailyLimits.uploaded)
  ) {
    throw new Error(
      `max global daily uploads reached (${global_upload_limit_per_day} bytes)`
    );
  }

  const vaccountUploaded = stateDailyLimits.vaccounts[vaccountName] || new BigNumber(`0`);
  // current + new > limit <=> limit - new < current
  if (
    vaccount_upload_limit_per_day
      .minus(data.byteLength)
      .isLessThan(vaccountUploaded)
  ) {
    throw new Error(
      `max vaccount daily uploads reached (${vaccount_upload_limit_per_day} bytes)`
    );
  }
};

const checkSignatures = ({ data, hash, signature, publicKey }) => {
  const actualHash = hashData256(data);
  if (hash !== actualHash) throw new Error(`File hashes do not match`);

  const recoveredKey = signature.recoverHash(actualHash);
  if (recoveredKey.toString() !== publicKey.toString())
    throw new Error(
      `File hash signature not valid ${recoveredKey.toString()} ${publicKey.toString()}`
    );
};

const getVAccountPublicKey = async ({ vaccountName, contract, sidechain }) => {
  const vkeyResult = await readVRAMData({
    contract,
    table: `vkey`,
    scope: contract,
    key: vaccountName,
    keytype: `name`,
    sidechain
  });

  if (!vkeyResult || !vkeyResult.row)
    throw new Error(
      `vaccount "${vaccountName} not found on contract "${contract}"`
    );

  const pubKey = vkeyResult.row.pubkey;
  return ecc.PublicKey.fromStringOrThrow(pubKey);
};

const getStorageLimits = async ({ contract, sidechain }) => {
  const rpc = new JsonRpc(getEndpointForContract({ sidechain }), { fetch });
  const defaultLimits = {
    max_file_size_in_bytes: new BigNumber(10 * 1024 * 1024), // 10 MB
    global_upload_limit_per_day: new BigNumber(1024 * 1024 * 1024), // 1 GB
    vaccount_upload_limit_per_day: new BigNumber(10 * 1024 * 1024) // 10 MB
  };

  try {
    const table = await rpc.get_table_rows({
      json: true,
      code: contract,
      table: `storagecfg`,
      scope: contract
    });

    if (table.rows.length === 0) return defaultLimits;
    const limits = table.rows[0];
    Object.keys(limits).forEach(key => {
      limits[key] = new BigNumber(limits[key], 10);
    });
    return limits;
  } catch (error) {
    // if no storagecfg table defined, assume default limits
    if (/not specified in the ABI/i.test(error.message)) {
      return defaultLimits;
    }
    throw error;
  }
};

module.exports = async (body, res, model, state) => {
  let {
    data,
    archive,
    sidechain,
    hash,
    hashSignature,
    vaccountName,
    contract
  } = body;
  try {
    if (archive) throw new Error(`vaccount archive uploads not yet supported`);

    data = Buffer.from(data, `base64`);
    hashSignature = ecc.Signature.fromString(hashSignature);
    const vaccountPublicKey = await getVAccountPublicKey({
      vaccountName,
      contract,
      sidechain
    });
    checkSignatures({
      data,
      hash,
      signature: hashSignature,
      publicKey: vaccountPublicKey
    });

    const contractLimits = await getStorageLimits({ contract, sidechain });
    const stateDailyLimits = getOrCreateDailyLimits({ state, sidechain, contract });
    checkLimits({ data, contractLimits, stateDailyLimits, vaccountName });

    let uri;
    var length = data.byteLength;
    uri = await saveToIPFS(data);

    updateLimits({ data, stateDailyLimits, vaccountName });
    await emitUsage(sidechain ? await getLinkedAccount(null, null, contract, sidechain.name) : contract, getContractAccountFor(model), length, sidechain, {
      uri
    });

    return { uri };
  } catch (error) {
    logger.error(`upload_public_vaccount: ${error.stack}`);
    throw error;
  }
};