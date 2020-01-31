const { loadModels } = require('../../tools/models');
const { testProvidersList } = require('../../tools/eos/dapp-services');
const serviceRunner = require('../../helpers/service-runner');

module.exports = async(args) => {
    if (args.creator !== 'eosio') { return; } // only local
    // for each sidechain
    var sidechains = await loadModels('local-sidechains');
    for (var i = 0; i < sidechains.length; i++) {
        var sidechain = sidechains[i];
        if(sidechains[i].local === false) return;
        for (var pi = 0; pi < testProvidersList.length; pi++) {
            var testProvider = testProvidersList[pi];
            const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === testProvider);
            await serviceRunner(`/dummy/demux`, sidechain.demux_port * (pi + 1)).handler(args, {
                NODEOS_HOST: 'localhost',
                TEST_ENV: true,
                NODEOS_PORT: sidechain.nodeos_port,
                WEBHOOK_DAPP_PORT: 8813 * (pi + 1),
                NODEOS_WEBSOCKET_PORT: sidechain.nodeos_state_history_port,
                DSP_ACCOUNT: mapEntry.chain_account,
                SIDECHAIN: sidechain.name,
                LOGFILE_NAME: `${sidechain.name}-demux`
            });
        }
    }
};
