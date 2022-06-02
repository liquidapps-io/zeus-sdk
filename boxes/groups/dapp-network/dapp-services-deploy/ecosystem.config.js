const path = require("path");
const fs = require("fs");
const os = require("os");
var toml = require('toml');
const { getBoxName, getBoxesDir, requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const disabledServices = ["log", "history"];
var configPath = process.env.DSP_CONFIG_FILE || path.join(os.homedir(), '.dsp', "config.toml");
if (!fs.existsSync(configPath))
  throw new Error(`Config file missing. please copy sample-config.toml to ${configPath}`);

var tomlString = fs.readFileSync(configPath).toString();
var configData;
try {
  configData = toml.parse(tomlString);
}
catch (e) {
  console.error("Parsing error on line " + e.line + ", column " + e.column +
    ": " + e.message);
  throw new Error(`config parse error at ${configPath}`);
}
var globalEnv = {};

const sidechains = configData.sidechains;
// generate nodeos_endpoint in obj
Object.keys(sidechains).forEach(k => {
  const port = sidechains[k].nodeos_port ? ':' + sidechains[k].nodeos_port : '';
  const host = sidechains[k].nodeos_host;
  const prefix = `http${sidechains[k].nodeos_secured ? 's' : ''}://`
  sidechains[k].nodeos_endpoint = prefix + host + port;
})
function createSidechainModels(data) {
  const liquidxMappingsDir = path.resolve(getBoxesDir(), `liquidx/models/liquidx-mappings/`);
  const localSidechainsDir = path.resolve(getBoxesDir(), `liquidx/models/eosio-chains/`);
  let sidechains = data.sidechains;
  if (!sidechains) { return; }
  Object.keys(sidechains).forEach(k => {
    let sidechain = sidechains[k];
    let mapping = sidechain.mapping;
    mapping.split(',').forEach(map => {
      let [m1, m2] = map.split(':');
      const mapObj = {
        sidechain_name: sidechain.name,
        mainnet_account: m1,
        chain_account: m2
      }
      if (!fs.existsSync(liquidxMappingsDir)){
        fs.mkdirSync(liquidxMappingsDir);
      }
      fs.writeFileSync(
        `${liquidxMappingsDir}/${sidechain.name}.${m1}.json`,
        JSON.stringify(mapObj, null, 2)
      )
    })
    delete sidechain['mapping'];
    if (!fs.existsSync(localSidechainsDir)){
      fs.mkdirSync(localSidechainsDir);
    }
    // to not pass sensitive information from toml, need to use edited object
    const editedSidechainObj = {
        "dsp_port":sidechain.dsp_port,
        "nodeos_endpoint":sidechain.nodeos_endpoint,
        "name":sidechain.name
    }
    fs.writeFileSync(
      path.resolve(`${localSidechainsDir}/${sidechain.name}.json`),
      JSON.stringify(editedSidechainObj, null, 2)
    );
  })
}

function parseConfig(data) {
  Object.keys(data).forEach(k => {
    Object.keys(data[k]).forEach(k2 => {
      var envKey = `${k}_${k2}`.toUpperCase();
      globalEnv[envKey] = data[k][k2];
    });
  });
}
createSidechainModels(configData);
parseConfig(configData);
globalEnv = { ...globalEnv, ...process.env };

// Require .env
if (!globalEnv.DSP_ACCOUNT) throw new Error("DSP_ACCOUNT is required");
if (!globalEnv.DSP_PRIVATE_KEY) throw new Error("DSP_PRIVATE_KEY is required");
if (!globalEnv.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (globalEnv.DFUSE_ENABLE && !globalEnv.DFUSE_API_KEY) throw new Error("DFUSE_API_KEY is required if DFUSE_ENABLE true");
const DSP_ACCOUNT = globalEnv.DSP_ACCOUNT;
const DSP_PRIVATE_KEY = globalEnv.DSP_PRIVATE_KEY;
const DATABASE_URL = globalEnv.DATABASE_URL;
const DSP_ACCOUNT_PERMISSIONS = globalEnv.DSP_ACCOUNT_PERMISSIONS || 'active';
const DSP_VERBOSE_LOGS = globalEnv.DSP_VERBOSE_LOGS || false;
const DSP_ALLOW_API_NON_BROADCAST = globalEnv.DSP_ALLOW_API_NON_BROADCAST || false;
const DSP_CRON_SCHEDULE_RETRY_ON_FAILURE = globalEnv.DSP_CRON_SCHEDULE_RETRY_ON_FAILURE || false;
const DSP_MAX_REQUEST_RETRIES = globalEnv.DSP_MAX_REQUEST_RETRIES || 10;
const DSP_EOSIO_TRANSACTION_EXPIRATION = globalEnv.DSP_EOSIO_TRANSACTION_EXPIRATION || 180;
const DSP_AWS_KMS_ENABLED = globalEnv.DSP_AWS_KMS_ENABLED || false;
const DSP_AWS_KMS_ADDRESS = globalEnv.DSP_AWS_KMS_ADDRESS || '';
const DSP_AWS_KMS_ACCESS_KEY_ID = globalEnv.DSP_AWS_KMS_ACCESS_KEY_ID || '';
const DSP_AWS_KMS_SECRET_ACCESS_KEY = globalEnv.DSP_AWS_KMS_SECRET_ACCESS_KEY || '';
const DSP_AWS_KMS_REGION = globalEnv.DSP_AWS_KMS_REGION || '';
const DSP_AWS_KMS_KEY_ID = globalEnv.DSP_AWS_KMS_KEY_ID || '';
const DATABASE_NODE_ENV = globalEnv.DATABASE_NODE_ENV || 'production';
const DATABASE_TIMEOUT = globalEnv.DATABASE_TIMEOUT || 10000;

// Configure .env
const DSP_PORT = globalEnv.DSP_PORT || 3115;
const DSP_CONSUMER_PAYS = globalEnv.DSP_CONSUMER_PAYS || false;
const IPFS_HOST = globalEnv.IPFS_HOST || 'localhost';
const NODEOS_HOST = globalEnv.NODEOS_HOST || 'localhost';
const NODEOS_PORT = globalEnv.NODEOS_PORT || 8888;
const NODEOS_SECURED = globalEnv.NODEOS_SECURED || false;
const NODEOS_LATEST = globalEnv.NODEOS_LATEST || true;

// Liquidstorage
const DSP_LIQUIDSTORAGE_UPLOAD_LIMIT = globalEnv.DSP_LIQUIDSTORAGE_UPLOAD_LIMIT || "10mb";

// Optional .env
const WEBHOOK_DAPP_PORT = globalEnv.WEBHOOK_DAPP_PORT || 8812;
const DEMUX_BACKEND = globalEnv.DEMUX_BACKEND || 'state_history_plugin';
const DEMUX_HEAD_BLOCK = globalEnv.DEMUX_HEAD_BLOCK || 0;
const DEMUX_BYPASS_DATABASE_HEAD_BLOCK = globalEnv.DEMUX_BYPASS_DATABASE_HEAD_BLOCK || false;
const DEMUX_MAX_PENDING_MESSAGES = globalEnv.DEMUX_MAX_PENDING_MESSAGES || 5000;
const DEMUX_PROCESS_BLOCK_CHECKPOINT = globalEnv.DEMUX_PROCESS_BLOCK_CHECKPOINT || 1000;
const DEMUX_MAX_MEMORY_MB = globalEnv.DEMUX_MAX_MEMORY_MB || 8196;

const WEBHOOK_DEMUX_PORT = globalEnv.WEBHOOK_DEMUX_PORT || 3195;
const SOCKET_MODE = globalEnv.DEMUX_SOCKET_MODE || 'sub';
const IPFS_PORT = globalEnv.IPFS_PORT || 5001;
const IPFS_PROTOCOL = globalEnv.IPFS_PROTOCOL || 'http';
const NODEOS_CHAINID = globalEnv.NODEOS_CHAINID || 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
const NODEOS_WEBSOCKET_PORT = globalEnv.NODEOS_WEBSOCKET_PORT || 8887;
const DSP_LIQUIDX_CONTRACT = globalEnv.DSP_LIQUIDX_CONTRACT || 'liquidx.dsp';
const DSP_PUSH_GUARANTEE = globalEnv.DSP_PUSH_GUARANTEE || 'in-block';
const DSP_PUSH_GUARANTEE_PER_SERVICE = globalEnv.DSP_PUSH_GUARANTEE_PER_SERVICE || '';
const DSP_READ_RETRIES = globalEnv.DSP_READ_RETRIES || 10;
const DSP_PUSH_RETRIES = globalEnv.DSP_PUSH_RETRIES || 3;
const DSP_BACKOFF_EXPONENT = globalEnv.DSP_BACKOFF_EXPONENT || 1.1;
const DSP_BACKOFF = globalEnv.DSP_BACKOFF || 500;
const DSP_BROADCAST_EVENT_TIMEOUT = globalEnv.DSP_BROADCAST_EVENT_TIMEOUT || 10000;
const DFUSE_PUSH_ENABLE = globalEnv.DFUSE_PUSH_ENABLE || false;
const DFUSE_PUSH_GUARANTEE = globalEnv.DFUSE_PUSH_GUARANTEE || 'in-block';
const DFUSE_ENABLE = globalEnv.DFUSE_ENABLE || false;
const DFUSE_API_KEY = globalEnv.DFUSE_API_KEY;
const DFUSE_NETWORK = globalEnv.DFUSE_NETWORK || 'mainnet';
const DFUSE_AUTHORIZATION = globalEnv.DFUSE_AUTHORIZATION || false;
const EVM_ETHEREUM_PRIVATE_KEY = globalEnv.EVM_ETHEREUM_PRIVATE_KEY || '';
const EVM_ETHEREUM_ENDPOINT = globalEnv.EVM_ETHEREUM_ENDPOINT || '';
const EVM_ETHEREUM_GAS_PRICE = globalEnv.EVM_ETHEREUM_GAS_PRICE || '2000000';
const EVM_ETHEREUM_GAS_LIMIT = globalEnv.EVM_ETHEREUM_GAS_LIMIT || '500000';
const EVM_ETHEREUM_MAX_PRIORITY_FEE_PER_GAS = globalEnv.EVM_ETHEREUM_MAX_PRIORITY_FEE_PER_GAS || '500000';
const EVM_ETHEREUM_MAX_FEE_PER_GAS = globalEnv.EVM_ETHEREUM_MAX_FEE_PER_GAS || '500000';
const EVM_ETHEREUM_KEYS_PER_CONSUMER = globalEnv.EVM_ETHEREUM_KEYS_PER_CONSUMER || '';
const EVM_ETHEREUM_GAS_PRICE_MULT = Number(globalEnv.EVM_ETHEREUM_GAS_PRICE_MULT) || 1.2;
const EVM_ROPSTEN_PRIVATE_KEY = globalEnv.EVM_ROPSTEN_PRIVATE_KEY || '';
const EVM_ROPSTEN_ENDPOINT = globalEnv.EVM_ROPSTEN_ENDPOINT || '';
const EVM_ROPSTEN_GAS_PRICE = globalEnv.EVM_ROPSTEN_GAS_PRICE || '2000000';
const EVM_ROPSTEN_GAS_LIMIT = globalEnv.EVM_ROPSTEN_GAS_LIMIT || '500000';
const EVM_ROPSTEN_MAX_PRIORITY_FEE_PER_GAS = globalEnv.EVM_ROPSTEN_MAX_PRIORITY_FEE_PER_GAS || '';
const EVM_ROPSTEN_MAX_FEE_PER_GAS = globalEnv.EVM_ROPSTEN_MAX_FEE_PER_GAS || '';
const EVM_ROPSTEN_KEYS_PER_CONSUMER = globalEnv.EVM_ROPSTEN_KEYS_PER_CONSUMER || '';
const EVM_ROPSTEN_GAS_PRICE_MULT = Number(globalEnv.EVM_ROPSTEN_GAS_PRICE_MULT) || 1.2;
const EVM_RINKEBY_PRIVATE_KEY = globalEnv.EVM_RINKEBY_PRIVATE_KEY || '';
const EVM_RINKEBY_ENDPOINT = globalEnv.EVM_RINKEBY_ENDPOINT || '';
const EVM_RINKEBY_GAS_PRICE = globalEnv.EVM_RINKEBY_GAS_PRICE || '2000000';
const EVM_RINKEBY_GAS_LIMIT = globalEnv.EVM_RINKEBY_GAS_LIMIT || '500000';
const EVM_RINKEBY_MAX_PRIORITY_FEE_PER_GAS = globalEnv.EVM_RINKEBY_MAX_PRIORITY_FEE_PER_GAS || '';
const EVM_RINKEBY_MAX_FEE_PER_GAS = globalEnv.EVM_RINKEBY_MAX_FEE_PER_GAS || '';
const EVM_RINKEBY_KEYS_PER_CONSUMER = globalEnv.EVM_RINKEBY_KEYS_PER_CONSUMER || '';
const EVM_RINKEBY_GAS_PRICE_MULT = Number(globalEnv.EVM_RINKEBY_GAS_PRICE_MULT) || 1.2;
const EVM_MATIC_PRIVATE_KEY = globalEnv.EVM_MATIC_PRIVATE_KEY || '';
const EVM_MATIC_ENDPOINT = globalEnv.EVM_MATIC_ENDPOINT || '';
const EVM_MATIC_GAS_PRICE = globalEnv.EVM_MATIC_GAS_PRICE || '2000000';
const EVM_MATIC_GAS_LIMIT = globalEnv.EVM_MATIC_GAS_LIMIT || '500000';
const EVM_MATIC_MAX_PRIORITY_FEE_PER_GAS = globalEnv.EVM_MATIC_MAX_PRIORITY_FEE_PER_GAS || '';
const EVM_MATIC_MAX_FEE_PER_GAS = globalEnv.EVM_MATIC_MAX_FEE_PER_GAS || '';
const EVM_MATIC_KEYS_PER_CONSUMER = globalEnv.EVM_MATIC_KEYS_PER_CONSUMER || '';
const EVM_MATIC_GAS_PRICE_MULT = Number(globalEnv.EVM_MATIC_GAS_PRICE_MULT) || 1.2;
const EVM_MUMBAI_PRIVATE_KEY = globalEnv.EVM_MUMBAI_PRIVATE_KEY || '';
const EVM_MUMBAI_ENDPOINT = globalEnv.EVM_MUMBAI_ENDPOINT || '';
const EVM_MUMBAI_GAS_PRICE = globalEnv.EVM_MUMBAI_GAS_PRICE || '2000000';
const EVM_MUMBAI_GAS_LIMIT = globalEnv.EVM_MUMBAI_GAS_LIMIT || '500000';
const EVM_MUMBAI_MAX_PRIORITY_FEE_PER_GAS = globalEnv.EVM_MUMBAI_MAX_PRIORITY_FEE_PER_GAS || '';
const EVM_MUMBAI_MAX_FEE_PER_GAS = globalEnv.EVM_MUMBAI_MAX_FEE_PER_GAS || '';
const EVM_MUMBAI_KEYS_PER_CONSUMER = globalEnv.EVM_MUMBAI_KEYS_PER_CONSUMER || '';
const EVM_MUMBAI_GAS_PRICE_MULT = Number(globalEnv.EVM_MUMBAI_GAS_PRICE_MULT) || 1.2;
const EVM_BINANCE_PRIVATE_KEY = globalEnv.EVM_BINANCE_PRIVATE_KEY || '';
const EVM_BINANCE_ENDPOINT = globalEnv.EVM_BINANCE_ENDPOINT || '';
const EVM_BINANCE_GAS_PRICE = globalEnv.EVM_BINANCE_GAS_PRICE || '2000000';
const EVM_BINANCE_GAS_LIMIT = globalEnv.EVM_BINANCE_GAS_LIMIT || '500000';
const EVM_BINANCE_MAX_PRIORITY_FEE_PER_GAS = globalEnv.EVM_BINANCE_MAX_PRIORITY_FEE_PER_GAS || '';
const EVM_BINANCE_MAX_FEE_PER_GAS = globalEnv.EVM_BINANCE_MAX_FEE_PER_GAS || '';
const EVM_BINANCE_KEYS_PER_CONSUMER = globalEnv.EVM_BINANCE_KEYS_PER_CONSUMER || '';
const EVM_BINANCE_GAS_PRICE_MULT = Number(globalEnv.EVM_BINANCE_GAS_PRICE_MULT) || 1.2;
const EVM_BSCTEST_PRIVATE_KEY = globalEnv.EVM_BSCTEST_PRIVATE_KEY || '';
const EVM_BSCTEST_ENDPOINT = globalEnv.EVM_BSCTEST_ENDPOINT || '';
const EVM_BSCTEST_GAS_PRICE = globalEnv.EVM_BSCTEST_GAS_PRICE || '2000000';
const EVM_BSCTEST_GAS_LIMIT = globalEnv.EVM_BSCTEST_GAS_LIMIT || '500000';
const EVM_BSCTEST_MAX_PRIORITY_FEE_PER_GAS = globalEnv.EVM_BSCTEST_MAX_PRIORITY_FEE_PER_GAS || '';
const EVM_BSCTEST_MAX_FEE_PER_GAS = globalEnv.EVM_BSCTEST_MAX_FEE_PER_GAS || '';
const EVM_BSCTEST_KEYS_PER_CONSUMER = globalEnv.EVM_BSCTEST_KEYS_PER_CONSUMER || '';
const EVM_BSCTEST_GAS_PRICE_MULT = Number(globalEnv.EVM_BSCTEST_GAS_PRICE_MULT) || 1.2;
const EVM_TRANSACTION_POLLING_TIMEOUT = Number(globalEnv.EVM_TRANSACTION_POLLING_TIMEOUT) || 750;
const EVM_PRIVATE_KEY = globalEnv.EVM_PRIVATE_KEY || '';
const EVM_ENDPOINT = globalEnv.EVM_ENDPOINT || '';
const EVM_GAS_PRICE = globalEnv.EVM_GAS_PRICE || '';
const EVM_GAS_LIMIT = globalEnv.EVM_GAS_LIMIT || '500000';
const EVM_MAX_PRIORITY_FEE_PER_GAS = globalEnv.EVM_MAX_PRIORITY_FEE_PER_GAS || '';
const EVM_MAX_FEE_PER_GAS = globalEnv.EVM_MAX_FEE_PER_GAS || '';
const EVM_KEYS_PER_CONSUMER = globalEnv.EVM_KEYS_PER_CONSUMER || '';
const EVM_GAS_PRICE_MULT = Number(globalEnv.EVM_GAS_PRICE_MULT) || 1.2;
const ORACLES_PREFIXES = globalEnv.ORACLES_PREFIXES || '';

// Assert .env
if (['state_history_plugin'].indexOf(DEMUX_BACKEND) === -1) throw new Error("DEMUX_BACKEND must be 'state_history_plugin'");
if (['http', 'https'].indexOf(IPFS_PROTOCOL) === -1) throw new Error("IPFS_PROTOCOL must be either 'http' or 'https'");
if ([true, false].indexOf(NODEOS_SECURED) === -1) throw new Error("NODEOS_SECURED must be either true or false");

const { lstatSync, readdirSync } = fs;
const { join } = require('path');
const isFile = source => !lstatSync(source).isDirectory();

const serviceNames = (loadModels('dapp-services')).map(file => file.name).filter(s => !disabledServices.includes(s));

const DSP_SERVICES_ENABLED = globalEnv.DSP_SERVICES_ENABLED || serviceNames.join(',');
const services = DSP_SERVICES_ENABLED.split(',');

if (services.includes('link') && !globalEnv.EVM_PRIVATE_KEY && !globalEnv.EVM_ETHEREUM_PRIVATE_KEY && !globalEnv.EVM_BINANCE_PRIVATE_KEY) throw new Error("EVM_PRIVATE_KEY is required to run link service");
if (services.includes('link') && !globalEnv.EVM_ENDPOINT && !globalEnv.EVM_ETHEREUM_ENDPOINT && !globalEnv.EVM_BINANCE_ENDPOINT) throw new Error("EVM_ENDPOINT is required to run link service");

const port = NODEOS_PORT ? ':' + NODEOS_PORT : '';
const host = NODEOS_HOST ? NODEOS_HOST : '';
const prefix = `http${ NODEOS_SECURED ? 's' : ''}://`
const NODEOS_MAINNET_ENDPOINT = prefix + host + port;
// liquidx gateways needs to run in same machine as mainnet gateway atm
const DSP_GATEWAY_MAINNET_ENDPOINT = `http://localhost:${DSP_PORT}`; // mainnet gateway

let commonEnv = {
  NODEOS_MAINNET_ENDPOINT,
  DSP_GATEWAY_MAINNET_ENDPOINT,
  NODEOS_CHAINID,
  NODEOS_HOST,
  NODEOS_PORT,
  NODEOS_SECURED,
  NODEOS_LATEST,
  IPFS_HOST,
  IPFS_PORT,
  IPFS_PROTOCOL,
  DSP_ACCOUNT,
  DSP_ACCOUNT_PERMISSIONS,
  DSP_VERBOSE_LOGS,
  DSP_ALLOW_API_NON_BROADCAST,
  DSP_CRON_SCHEDULE_RETRY_ON_FAILURE,
  DSP_MAX_REQUEST_RETRIES,
  DSP_EOSIO_TRANSACTION_EXPIRATION,
  DSP_AWS_KMS_ENABLED,
  DSP_AWS_KMS_ADDRESS,
  DSP_AWS_KMS_ACCESS_KEY_ID,
  DSP_AWS_KMS_SECRET_ACCESS_KEY,
  DSP_AWS_KMS_REGION,
  DSP_AWS_KMS_KEY_ID,
  DSP_PRIVATE_KEY,
  DSP_PORT,
  DSP_CONSUMER_PAYS,
  DSP_LIQUIDSTORAGE_UPLOAD_LIMIT,
  DSP_PUSH_GUARANTEE,
  DSP_READ_RETRIES,
  DSP_PUSH_RETRIES,
  DSP_BACKOFF_EXPONENT, 
  DSP_BACKOFF,
  DSP_BROADCAST_EVENT_TIMEOUT,
  DATABASE_URL,
  DATABASE_NODE_ENV,
  DATABASE_TIMEOUT,
  DSP_LIQUIDX_CONTRACT,
  DFUSE_PUSH_ENABLE,
  DFUSE_PUSH_GUARANTEE,
  DFUSE_API_KEY,
  DFUSE_NETWORK,
  DFUSE_AUTHORIZATION,
  DEBUG: globalEnv.DFUSE_DEBUG ? "dfuse:*" : "",
  EVM_ETHEREUM_PRIVATE_KEY,
  EVM_ETHEREUM_ENDPOINT,
  EVM_ETHEREUM_GAS_PRICE,
  EVM_ETHEREUM_GAS_LIMIT,
  EVM_ETHEREUM_KEYS_PER_CONSUMER,
  EVM_ETHEREUM_GAS_PRICE_MULT,
  EVM_BINANCE_PRIVATE_KEY,
  EVM_BINANCE_ENDPOINT,
  EVM_BINANCE_GAS_PRICE,
  EVM_BINANCE_GAS_LIMIT,
  EVM_BINANCE_KEYS_PER_CONSUMER,
  EVM_BINANCE_GAS_PRICE_MULT,
  EVM_BSCTEST_PRIVATE_KEY,
  EVM_BSCTEST_ENDPOINT,
  EVM_BSCTEST_GAS_PRICE,
  EVM_BSCTEST_GAS_LIMIT,
  EVM_BSCTEST_KEYS_PER_CONSUMER,
  EVM_BSCTEST_GAS_PRICE_MULT,
  EVM_TRANSACTION_POLLING_TIMEOUT,
  EVM_PRIVATE_KEY,
  EVM_ENDPOINT,
  EVM_GAS_PRICE,
  EVM_GAS_LIMIT,
  EVM_KEYS_PER_CONSUMER,
  EVM_GAS_PRICE_MULT,
  EVM_ETHEREUM_MAX_PRIORITY_FEE_PER_GAS,
  EVM_ETHEREUM_MAX_FEE_PER_GAS,
  EVM_BINANCE_MAX_PRIORITY_FEE_PER_GAS,
  EVM_BINANCE_MAX_FEE_PER_GAS,
  EVM_BSCTEST_MAX_PRIORITY_FEE_PER_GAS,
  EVM_BSCTEST_MAX_FEE_PER_GAS,
  EVM_MAX_PRIORITY_FEE_PER_GAS,
  EVM_MAX_FEE_PER_GAS,
  EVM_ROPSTEN_PRIVATE_KEY,
  EVM_ROPSTEN_ENDPOINT,
  EVM_ROPSTEN_GAS_PRICE,
  EVM_ROPSTEN_GAS_LIMIT,
  EVM_ROPSTEN_MAX_PRIORITY_FEE_PER_GAS,
  EVM_ROPSTEN_MAX_FEE_PER_GAS,
  EVM_ROPSTEN_KEYS_PER_CONSUMER,
  EVM_ROPSTEN_GAS_PRICE_MULT,
  EVM_RINKEBY_PRIVATE_KEY,
  EVM_RINKEBY_ENDPOINT,
  EVM_RINKEBY_GAS_PRICE,
  EVM_RINKEBY_GAS_LIMIT,
  EVM_RINKEBY_MAX_PRIORITY_FEE_PER_GAS,
  EVM_RINKEBY_MAX_FEE_PER_GAS,
  EVM_RINKEBY_KEYS_PER_CONSUMER,
  EVM_RINKEBY_GAS_PRICE_MULT,
  EVM_MATIC_PRIVATE_KEY,
  EVM_MATIC_ENDPOINT,
  EVM_MATIC_GAS_PRICE,
  EVM_MATIC_GAS_LIMIT,
  EVM_MATIC_MAX_PRIORITY_FEE_PER_GAS,
  EVM_MATIC_MAX_FEE_PER_GAS,
  EVM_MATIC_KEYS_PER_CONSUMER,
  EVM_MATIC_GAS_PRICE_MULT,
  EVM_MUMBAI_PRIVATE_KEY,
  EVM_MUMBAI_ENDPOINT,
  EVM_MUMBAI_GAS_PRICE,
  EVM_MUMBAI_GAS_LIMIT,
  EVM_MUMBAI_MAX_PRIORITY_FEE_PER_GAS,
  EVM_MUMBAI_MAX_FEE_PER_GAS,
  EVM_MUMBAI_KEYS_PER_CONSUMER,
  EVM_MUMBAI_GAS_PRICE_MULT
};

const guaranteeLevels = [];

if(DSP_PUSH_GUARANTEE_PER_SERVICE) {
  DSP_PUSH_GUARANTEE_PER_SERVICE.split('|').forEach(item => {
    guaranteeLevels.push(JSON.parse(item));
  })
}

if(ORACLES_PREFIXES) {
  ORACLES_PREFIXES.split('|').forEach(item => {
    item = JSON.parse(item);
    Object.assign(commonEnv, {[`ORACLE_PREFIX_${item.payer.toUpperCase()}_${item.name.toUpperCase()}`]: item.fullAddress});
  })
}

if(EVM_BINANCE_KEYS_PER_CONSUMER) {
  EVM_BINANCE_KEYS_PER_CONSUMER.split(',').forEach(item => {
    Object.assign(commonEnv, JSON.parse(item));
  })
}

if(EVM_ETHEREUM_KEYS_PER_CONSUMER) {
  EVM_ETHEREUM_KEYS_PER_CONSUMER.split(',').forEach(item => {
    Object.assign(commonEnv, JSON.parse(item));
  })
}

const createDSPSidechainServices = (sidechain) => {
  // Assert .env
  const reqFields = ['dsp_account', 'nodeos_chainid', 'name'];
  for (const field of reqFields) {
    if (!sidechain[field]) throw new Error(`sidechain ${field} required`);
  }
  const dfuseFields = ['dfuse_api_key', 'dfuse_network'];
  for (const field of dfuseFields) {
    if ((sidechain.dfuse_enable || sidechain.dfuse_push_enabl) && !sidechain[field]) throw new Error(`sidechain ${field} required`);
  }
  commonEnv = {
    ...commonEnv,
    [`DSP_PRIVATE_KEY_${sidechain.name.toUpperCase()}`]: sidechain.dsp_private_key,
    [`DFUSE_PUSH_ENABLE_${sidechain.name.toUpperCase()}`]: sidechain.dfuse_push_enable || false,
    [`DFUSE_PUSH_GUARANTEE_${sidechain.name.toUpperCase()}`]: sidechain.dfuse_push_guarantee || 'in-block',
    [`DFUSE_NETWORK_${sidechain.name.toUpperCase()}`]: sidechain.dfuse_network
  }
  const sidechainCommonEnv = {
    NODEOS_HOST: sidechain.nodeos_host || 'localhost',
    NODEOS_PORT: sidechain.nodeos_port || 8888,
    NODEOS_SECURED: sidechain.nodeos_secured || false,
    NODEOS_LATEST: sidechain.nodeos_latest || true,
    NODEOS_CHAINID: sidechain.nodeos_chainid,
    DSP_PORT: sidechain.dsp_port || 3116,
    DSP_ACCOUNT_PERMISSIONS: sidechain.dsp_account_permissions || 'active',
    WEBHOOK_DAPP_PORT: sidechain.webhook_dapp_port || 8813,
    SIDECHAIN: sidechain.name
  }
  return [
    {
      name: `${sidechain.name}-dapp-services-node`,
      script: path.join(getBoxesDir(), getBoxName(`services/dapp-services-node/index.js`),  'services', 'dapp-services-node', 'index.js'),
      autorestart: true,
      cwd: __dirname,
      log_date_format: "YYYY-MM-DDTHH:mm:ss",
      env: {
        ...commonEnv,
        ...sidechainCommonEnv,
        PORT: sidechain.dsp_port || 3116,
        LOGFILE_NAME:`${sidechain.name}-dapp-services-node`
      }
    },
    sidechain.dfuse_enable ?  
      {
        name: `${sidechain.name}-dfuse`,
        script: path.join(getBoxesDir(), 'dfuse', `dist`, 'services', 'dfuse', 'index.js'),
        autorestart: true,
        cwd: __dirname,
        log_date_format: "YYYY-MM-DDTHH:mm:ss",
        env: {
          ...commonEnv,
          ...sidechainCommonEnv,
          WEBHOOK_DAPP_PORT,
          PORT: WEBHOOK_DEMUX_PORT,
          LOGFILE_NAME: `${sidechain.name}-dfuse`,
          DFUSE_API_KEY: sidechain.dfuse_api_key,
          DFUSE_NETWORK: sidechain.dfuse_network
        }
      }
    :
      {
        name: `${sidechain.name}-demux`,
        script: path.join(getBoxesDir(), 'demux',  'services', 'demux', 'index.js'),
        autorestart: true,
        cwd: __dirname,
        log_date_format: "YYYY-MM-DDTHH:mm:ss",
        env: {
          ...commonEnv,
          ...sidechainCommonEnv,
          PORT: sidechain.demux_webhook_port || 3196,
          NODEOS_WEBSOCKET_PORT: sidechain.nodeos_websocket_port || 8887,
          DEMUX_BACKEND: sidechain.demux_backend || 'state_history_plugin',
          DEMUX_HEAD_BLOCK: sidechain.demux_head_block || 0,
          DEMUX_BYPASS_DATABASE_HEAD_BLOCK: sidechain.demux_bypass_database_head_block || false,
          DEMUX_MAX_PENDING_MESSAGES: sidechain.demux_max_pending_messages || 5000,
          DEMUX_PROCESS_BLOCK_CHECKPOINT: sidechain.demux_process_block_checkpoint || 1000,
          SOCKET_MODE: sidechain.demux_socket_mode || 'sub',
          LOGFILE_NAME: `${sidechain.name}-demux`
        },  
        "node_args": [
          `--max_old_space_size=${sidechain.demux_max_memory_mb || 8196}`
        ]
      }
  ] 
}

const createDSPServiceApp = (name) => {
  const guaranteeConfig = guaranteeLevels.find(i => i.name == name);
  return {
    name: `${name}-dapp-service-node`,
    script: path.join(getBoxesDir(), getBoxName(`services/${name}-dapp-service-node/index.js`),  'services', `${name}-dapp-service-node`, 'index.js'),
    autorestart: true,
    cwd: __dirname,
    log_date_format: "YYYY-MM-DDTHH:mm:ss",
    env: {
      ...commonEnv,
      LOGFILE_NAME:`${name}-dapp-service-node`,
      DSP_PUSH_GUARANTEE: guaranteeConfig ? guaranteeConfig.push_guarantee : DSP_PUSH_GUARANTEE,
      DSP_READ_RETRIES: guaranteeConfig ? guaranteeConfig.read_retries : DSP_READ_RETRIES,
      DSP_PUSH_RETRIES: guaranteeConfig ? guaranteeConfig.push_retries : DSP_PUSH_RETRIES,
      DSP_BACKOFF_EXPONENT: guaranteeConfig ? guaranteeConfig.backoff_exponent : DSP_BACKOFF_EXPONENT,
      DSP_BACKOFF: guaranteeConfig ? guaranteeConfig.backoff : DSP_BACKOFF
    }
  };
}

// map and flatten
const sidechainServicesApps = Array.prototype.concat.apply(
  [],
  Object.keys(sidechains).map(chain => {
    return createDSPSidechainServices(sidechains[chain])
  })
);

const servicesApps = services.map(createDSPServiceApp);
const apps = [
  {
    name: 'dapp-services-node',
    script: path.join(getBoxesDir(), getBoxName(`services/dapp-services-node/index.js`),  'services', `dapp-services-node`, 'index.js'),
    autorestart: true,
    cwd: __dirname,
    log_date_format: "YYYY-MM-DDTHH:mm:ss",
    env: {
      PORT: DSP_PORT,
      WEBHOOK_DAPP_PORT,
      ...commonEnv,
      LOGFILE_NAME: 'dapp-services-node' 
    }
  },
  ...servicesApps,
  ...sidechainServicesApps
]
if(DFUSE_ENABLE) {
  apps.push(
    {
      name: 'dfuse',
      script: path.join(getBoxesDir(), 'dfuse', `dist`, 'services', 'dfuse', 'index.js'),
      autorestart: true,
      cwd: __dirname,
      log_date_format: "YYYY-MM-DDTHH:mm:ss",
      env: {
        ...commonEnv,
        WEBHOOK_DAPP_PORT,
        PORT: WEBHOOK_DEMUX_PORT,
        LOGFILE_NAME: 'dfuse'
      }
    })
} else {
  apps.push({
    name: 'demux',
    script: path.join(getBoxesDir(), 'demux',  'services', `demux`, 'index.js'),
    autorestart: true,
    cwd: __dirname,
    log_date_format: "YYYY-MM-DDTHH:mm:ss",
    env: {
      ...commonEnv,
      NODEOS_WEBSOCKET_PORT,
      SOCKET_MODE,
      DEMUX_BACKEND,
      DEMUX_HEAD_BLOCK,
      DEMUX_BYPASS_DATABASE_HEAD_BLOCK,
      DEMUX_MAX_PENDING_MESSAGES,
      DEMUX_PROCESS_BLOCK_CHECKPOINT,
      WEBHOOK_DAPP_PORT,
      PORT: WEBHOOK_DEMUX_PORT,
      LOGFILE_NAME: 'demux' 
    },  
    "node_args": [
      `--max_old_space_size=${DEMUX_MAX_MEMORY_MB}`
    ]
  })
}

module.exports = {
  force: true,
  apps
};