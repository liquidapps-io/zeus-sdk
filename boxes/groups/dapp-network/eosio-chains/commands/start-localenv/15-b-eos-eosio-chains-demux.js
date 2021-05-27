const { requireBox } = require('@liquidapps/box-utils');
const { loadModels } = requireBox('seed-models/tools/models');
const { testProvidersList } = requireBox('dapp-services/tools/eos/dapp-services');
const serviceRunner = requireBox('seed-microservices/helpers/service-runner');

module.exports = async (args) => {
    if (args.creator !== 'eosio') { return; } // only local
    if(args.singleChain) { return; } // don't run on command
    if(args.kill) {
        return;
    }
    // for each sidechain
    var sidechains = await loadModels('eosio-chains');
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
};
