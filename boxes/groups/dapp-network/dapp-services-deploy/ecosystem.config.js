const path = require("path");
const fs = require("fs");
const os = require("os");
var toml = require('toml');

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

function parseConfig(data) {
  Object.keys(data).forEach(k => {
    Object.keys(data[k]).forEach(k2 => {
      var envKey = `${k}_${k2}`.toUpperCase();
      globalEnv[envKey] = data[k][k2];
    });
  });
}
parseConfig(configData);
globalEnv = { ...globalEnv, ...process.env };

// Require .env
if (!globalEnv.DSP_ACCOUNT) throw new Error("DSP_ACCOUNT is required");
if (!globalEnv.DSP_PRIVATE_KEY) throw new Error("DSP_PRIVATE_KEY is required");
const DSP_ACCOUNT = globalEnv.DSP_ACCOUNT;
const DSP_PRIVATE_KEY = globalEnv.DSP_PRIVATE_KEY;
const DSP_ACCOUNT_PERMISSIONS = globalEnv.DSP_ACCOUNT_PERMISSIONS || 'active';

// Configure .env
const DSP_PORT = globalEnv.DSP_PORT || 3115;
const IPFS_HOST = globalEnv.IPFS_HOST || 'localhost';
const NODEOS_HOST = globalEnv.NODEOS_HOST || 'localhost';
const NODEOS_PORT = globalEnv.NODEOS_PORT || 8888;
const NODEOS_SECURED = globalEnv.NODEOS_SECURED || 'false'

// Optional .env
const WEBHOOK_DAPP_PORT = globalEnv.WEBHOOK_DAPP_PORT || 8812;
const DEMUX_BACKEND = globalEnv.DEMUX_BACKEND || 'zmq_plugin';
const WEBHOOK_DEMUX_PORT = globalEnv.WEBHOOK_DEMUX_PORT || 3195;
const SOCKET_MODE = globalEnv.DEMUX_SOCKET_MODE || 'sub';
const IPFS_PORT = globalEnv.IPFS_PORT || 5001;
const IPFS_PROTOCOL = globalEnv.IPFS_PROTOCOL || 'http';
const NODEOS_CHAINID = globalEnv.NODEOS_CHAINID || 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
const NODEOS_ZMQ_PORT = globalEnv.NODEOS_ZMQ_PORT || 5557;
const NODEOS_WEBSOCKET_PORT = globalEnv.NODEOS_WEBSOCKET_PORT || 8887;

const NODEOS_HOST_DSP = globalEnv.NODEOS_HOST_DSP;
const NODEOS_HOST_DSP_PORT = globalEnv.NODEOS_HOST_DSP_PORT;

// Assert .env
if (['zmq_plugin', 'state_history_plugin'].indexOf(DEMUX_BACKEND) === -1) throw new Error("DEMUX_BACKEND must be either 'zmq_plugin' or 'state_history_plugin'");
if (['http', 'https'].indexOf(IPFS_PROTOCOL) === -1) throw new Error("IPFS_PROTOCOL must be either 'http' or 'https'");
if (['true', 'false'].indexOf(NODEOS_SECURED) === -1) throw new Error("NODEOS_SECURED must be either 'true' or 'false'");

const { lstatSync, readdirSync } = fs;
const { join } = require('path');
const isFile = source => !lstatSync(source).isDirectory();

const getFiles = (source, ext) =>
  readdirSync(source).map(name => join(source, name)).filter(isFile).filter(a => a.endsWith(ext)).sort();

const serviceNames = getFiles(path.resolve(__dirname, `./models/dapp-services`), '.json').map(file =>
  JSON.parse(fs.readFileSync(file).toString()).name);

const DSP_SERVICES_ENABLED = globalEnv.DSP_SERVICES_ENABLED || serviceNames.join(',');
const services = DSP_SERVICES_ENABLED.split(',');

const commonEnv = {
  NODEOS_CHAINID,
  NODEOS_HOST,
  NODEOS_PORT,
  NODEOS_SECURED,
  NODEOS_HOST_DSP,
  NODEOS_HOST_DSP_PORT,
  IPFS_HOST,
  IPFS_PORT,
  IPFS_PROTOCOL,
  DSP_ACCOUNT,
  DSP_ACCOUNT_PERMISSIONS,
  DSP_PRIVATE_KEY,
  DSP_PORT
};

const createDSPServiceApp = (name) => ({
  name: `${name}-dapp-service-node`,
  script: path.join(__dirname, 'services', `${name}-dapp-service-node`, 'index.js'),
  autorestart: true,
  cwd: __dirname,
  log_date_format: "YYYY-MM-DDTHH:mm:ss",
  env: commonEnv
});

const servicesApps = services.map(createDSPServiceApp);
module.exports = {
  force: true,
  apps: [{
      name: 'dapp-services-node',
      script: path.join(__dirname, 'services', 'dapp-services-node', 'index.js'),
      autorestart: true,
      cwd: __dirname,
      log_date_format: "YYYY-MM-DDTHH:mm:ss",
      env: {
        PORT: DSP_PORT,
        WEBHOOK_DAPP_PORT,
        ...commonEnv
      }
    },
    {
      name: 'demux',
      script: path.join(__dirname, 'services', 'demux', 'index.js'),
      autorestart: true,
      cwd: __dirname,
      log_date_format: "YYYY-MM-DDTHH:mm:ss",
      env: {
        ...commonEnv,
        NODEOS_ZMQ_PORT,
        NODEOS_WEBSOCKET_PORT,
        SOCKET_MODE,
        DEMUX_BACKEND,
        PORT: WEBHOOK_DEMUX_PORT
      }
    },
    ...servicesApps
  ]
};
