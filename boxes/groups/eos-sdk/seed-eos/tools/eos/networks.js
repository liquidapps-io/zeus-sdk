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
        chainId: 'e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473',
        host: 'jungle.eosphere.io',
        port: 443,
        secured: true
    },
    'jungle3': {
        chainId: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
        host: 'jungle3.cryptolions.io',
        port: 443,
        secured: true
    },
    'waxtest': {
        chainId: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
        host: 'testnet.waxsweden.org',
        port: 443,
        secured: true
    },
    'wax': {
        chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4',
        host: 'wax.pink.gg',
        port: 443,
        secured: true
    },
    'kylin': {
        chainId: '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191',
        host: 'kylin.eosn.io',
        port: 443,
        secured: true
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

function getNetwork(args, sidechain) {
    if (sidechain) {
        return {
            host: sidechain.nodeos_host || "localhost",
            port: sidechain.nodeos_port,
            secured: sidechain.secured
        };
    }
    const selectedNetwork = networks[args.network];
    if (!selectedNetwork) {
        throw new Error(`network not found (${args.network})`);
    }
    return selectedNetwork;
}

function getUrl(args, sidechain) {
    if (sidechain) {
        return sidechain.nodeos_endpoint;
    }
    if (args.NODEOS_SECURED && args.NODEOS_HOST && args.NODEOS_PORT) {
        const NODEOS_SECURED = args.NODEOS_SECURED === 'true' || args.NODEOS_SECURED === true ? true : false;
        return `http${NODEOS_SECURED ? 's' : ''}://${args.NODEOS_HOST}:${args.NODEOS_PORT}`;
    }
    const selectedNetwork = getNetwork(args, sidechain);
    return `http${selectedNetwork.secured ? 's' : ''}://${selectedNetwork.host}:${selectedNetwork.port}`;
}
module.exports = { getNetwork, getUrl };
