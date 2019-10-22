const fs = require("fs");
const path = require("path");
let networks = {
    'development': {
        chainId: '',
        host: '127.0.0.1',
        port: 8888,
        secured: false
    },
    'jungle': {
        chainId: '',
        host: '127.0.0.1',
        port: 8888,
        secured: false
    },
    'kylin': {
        chainId: '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191',
        host: 'api.kylin.eosbeijing.one',
        port: 80,
        secured: false
    },
    'mainnet': {
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        host: 'bp.cryptolions.io',
        port: 8888,
        secured: false
    }
};
if (fs.existsSync(path.resolve('../../../zeus-config.js'))) {
    const zeusConfig = require('../../../zeus-config');
    networks = zeusConfig.chains.eos.networks;
}

function getNetwork(args) {
    const selectedNetwork = networks[args.network];
    if (!selectedNetwork) { 
        throw new Error(`network not found (${args.network})`);
    }
    return selectedNetwork;
}

function getUrl(args) {
    if (args.NODEOS_SECURED && args.NODEOS_HOST && args.NODEOS_PORT) {
        return `http${args.NODEOS_SECURED === 'true' ? 's' : ''}://${args.NODEOS_HOST}:${args.NODEOS_PORT}`;
    }
    const selectedNetwork = getNetwork(args);
    return `http${selectedNetwork.secured ? 's' : ''}://${selectedNetwork.host}:${selectedNetwork.port}`;
}
module.exports = { getNetwork, getUrl };
