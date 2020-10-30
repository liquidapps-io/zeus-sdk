const { requireBox } = require('@liquidapps/box-utils');
const { createClient } = require('@liquidapps/dapp-client');
const logger = requireBox('log-extensions/helpers/logger');
const fetch = require('isomorphic-fetch');

export const getDappClient = async() => {
    return await createClient({ 
        network: process.env.DFUSE_NETWORK, 
        httpEndpoint: process.env.NODEOS_MAINNET_ENDPOINT, 
        fetch
    });
};