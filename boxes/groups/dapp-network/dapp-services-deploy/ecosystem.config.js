var readlineSync = require('readline-sync');
const dotenv = require('dotenv')
const fs = require('fs');

if (fs.existsSync(__dirname + "/.env"))
    dotenv.config({ path: __dirname + "/.env" });


const modifyEnv = (key, value) => {
    let envConfig = {};
    if (fs.existsSync(__dirname + "/.env"))
        envConfig = dotenv.parse(fs.readFileSync(__dirname + '/.env'))
    envConfig[key] = value;
    fs.writeFileSync(__dirname + "/.env", Object.keys(envConfig).map(k => `${k}=${envConfig[k]}`).join('\n'));
}

const _getParam = (name, description, defaultValue, options) => {
    if (process.env[name])
        return process.env[name];
    // prompt
    var prompt = `${name} - ${description}${defaultValue ? ` (${defaultValue})` : ''}: `;
    if (options) {
        var index = readlineSync.keyInSelect(options, prompt);
        return options[index];
    }
    const readFromUser = readlineSync.question(prompt);
    if (readFromUser == "")
        return defaultValue;
}
const getParam = (name, description, defaultValue, options) => {
    var res = _getParam(name, description, defaultValue, options)
    modifyEnv(name, res);
    return res;
}
const demuxBackend = getParam("DEMUX_BACKEND", "backend for demux", "zmq_plugin", ['zmq_plugin', 'state_history_plugin']);
const ipfsHost = getParam("IPFS_HOST", "ipfs hostname", "localhost");
const ipfsPort = getParam("IPFS_PORT", "ipfs port", "5001");
const ipfsProto = getParam("IPFS_PROTOCOL", "ipfs protocol", "http", ['https', 'http']);
const chainId = getParam("NODEOS_CHAINID", "chain id", "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906");
const dspAccount = getParam("DSP_ACCOUNT", "dsp account name");
const dspKey = getParam("DSP_PRIVATE_KEY", "dsp private key");
const nodeosHost = getParam("NODEOS_HOST", "nodeos hostname", 'localhost');
const nodePort = getParam("NODEOS_PORT", "nodeos api port", 8888);
const nodeSecured = getParam("NODEOS_SECURED", "nodeos secured", "false", ['false', 'true']);
let nodeosZmqPort = 5557;
let nodeosWebSocketPort = 8887;
switch (demuxBackend) {
    case 'zmq_plugin':
        nodeosZmqPort = getParam("NODEOS_ZMQ_PORT", "nodeos zeromq plugin port", 5557);
        // code
        break;
    case 'state_history_plugin':
        nodeosWebSocketPort = getParam("NODEOS_WEBSOCKET_PORT", "nodeos websocket plugin port", 8887);
        break;
    default:
        throw new Error('unknown backend');
        // code
}

module.exports = {
    force: true,
    apps: [{
            name: 'dapp-services-node',
            script: __dirname + '/services/dapp-services-node/index.js',
            autorestart: true,
            cwd: __dirname,
            env: {
                NODEOS_CHAINID: chainId,
                NODEOS_HOST: nodeosHost,
                NODEOS_PORT: nodePort,
                NODEOS_SECURED: nodeSecured,
                DSP_ACCOUNT: dspAccount,
                DSP_PRIVATE_KEY: dspKey,
            }
        },
        {
            name: 'demux',
            script: __dirname + '/services/demux/index.js',
            autorestart: true,
            cwd: __dirname,
            env: {
                NODEOS_CHAINID: chainId,
                NODEOS_HOST: nodeosHost,
                NODEOS_PORT: nodePort,
                NODEOS_SECURED: nodeSecured,
                NODEOS_ZMQ_PORT: nodeosZmqPort,
                NODEOS_WEBSOCKET_PORT: nodeosWebSocketPort,
                SOCKET_MODE: 'sub',
                DEMUX_BACKEND: demuxBackend
            }
        },
        {
            name: 'ipfs-dapp-service-node',
            script: __dirname + '/services/ipfs-dapp-service-node/index.js',
            autorestart: true,
            cwd: __dirname,
            env: {
                NODEOS_CHAINID: chainId,
                NODEOS_HOST: nodeosHost,
                NODEOS_PORT: nodePort,
                NODEOS_SECURED: nodeSecured,
                IPFS_HOST: ipfsHost,
                IPFS_PORT: ipfsPort,
                IPFS_PROTOCOL: ipfsProto,
                DSP_ACCOUNT: dspAccount,
                DSP_PRIVATE_KEY: dspKey,
            }
        },
        {
            name: 'cron-dapp-service-node',
            script: __dirname + '/services/cron-dapp-service-node/index.js',
            autorestart: true,
            cwd: __dirname,
            env: {
                NODEOS_CHAINID: chainId,
                NODEOS_HOST: nodeosHost,
                NODEOS_PORT: nodePort,
                NODEOS_SECURED: nodeSecured,
                DSP_ACCOUNT: dspAccount,
                DSP_PRIVATE_KEY: dspKey,
            }
        },
        {
            name: 'oracle-dapp-service-node',
            script: __dirname + '/services/oracle-dapp-service-node/index.js',
            autorestart: true,
            cwd: __dirname,
            env: {
                NODEOS_CHAINID: chainId,
                NODEOS_HOST: nodeosHost,
                NODEOS_PORT: nodePort,
                NODEOS_SECURED: nodeSecured,
                DSP_ACCOUNT: dspAccount,
                DSP_PRIVATE_KEY: dspKey,
            }
        },
        {
            name: 'vaccounts-dapp-service-node',
            script: __dirname + '/services/vaccounts-dapp-service-node/index.js',
            autorestart: true,
            cwd: __dirname,
            env: {
                NODEOS_CHAINID: chainId,
                NODEOS_HOST: nodeosHost,
                NODEOS_PORT: nodePort,
                NODEOS_SECURED: nodeSecured,
                DSP_ACCOUNT: dspAccount,
                DSP_PRIVATE_KEY: dspKey,
            }
        }
    ]
};
