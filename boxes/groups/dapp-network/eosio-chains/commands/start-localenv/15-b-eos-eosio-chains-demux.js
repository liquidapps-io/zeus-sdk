const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const { testProvidersList } = requireBox('dapp-services/tools/eos/dapp-services');
const serviceRunner = requireBox('seed-microservices/helpers/service-runner');
const { emojMap } = requireBox('seed-zeus-support/_exec');

const delay = ms => new Promise(res => setTimeout(res, ms));
const firehoseDelay = process.env.FIREHOSE_DELAY || 10000;

module.exports = async (args) => {
    if (args.creator !== 'eosio') { 
    return;
  } // only local
    if(args.singleChain) { return; } // don't run on command
    if(args.kill) {
        return;
    }
    // for each sidechain
    var sidechains = await loadModels('eosio-chains');
    if(args.backend == 'firehose') {
        for (var i = 0; i < sidechains.length; i++) {
            var sidechain = sidechains[i];
            if (sidechains[i].local === false) return;
            for (var pi = 0; pi < testProvidersList.length; pi++) {
                var testProvider = testProvidersList[pi];
                const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === testProvider.account);
                await serviceRunner(`/dummy/firehose`, sidechain.demux_port * (pi + 1)).handler(args, {
                    NODEOS_HOST: 'localhost',
                    TEST_ENV: true,
                    NODEOS_PORT: sidechain.nodeos_port,
                    WEBHOOK_DAPP_PORT: 8813 * (pi + 1),
                    FIREHOSE_GRPC_ADDRESS: 'localhost',
                    FIREHOSE_GRPC_SECURED: false,
                    FIREHOSE_GRPC_PORT: sidechain.firehose_grpc_port,
                    DSP_ACCOUNT: mapEntry.chain_account,
                    SIDECHAIN: sidechain.name,
                    LOGFILE_NAME: `${sidechain.name}-firehose`,
                    DATABASE_URL: false
                });
            }
        }
        console.log(`${emojMap.ok}waiting ${firehoseDelay}ms for firehose to catch up`);
        await delay(firehoseDelay)
    } else if(args.backend == 'state_history_plugin') {
        for (var i = 0; i < sidechains.length; i++) {
            var sidechain = sidechains[i];
            if (sidechains[i].local === false) return;
            for (var pi = 0; pi < testProvidersList.length; pi++) {
                var testProvider = testProvidersList[pi];
                const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === testProvider.account);
                await serviceRunner(`/dummy/demux`, sidechain.demux_port * (pi + 1)).handler(args, {
                    NODEOS_HOST: 'localhost',
                    TEST_ENV: true,
                    NODEOS_PORT: sidechain.nodeos_port,
                    WEBHOOK_DAPP_PORT: 8813 * (pi + 1),
                    NODEOS_WEBSOCKET_PORT: sidechain.nodeos_state_history_port,
                    DSP_ACCOUNT: mapEntry.chain_account,
                    SIDECHAIN: sidechain.name,
                    LOGFILE_NAME: `${sidechain.name}-demux`,
                    DATABASE_URL: false
                });
            }
        }
    } else {
        throw new Error('no soup for you, flavors available: firehose or state_history_plugin');
    }
};
