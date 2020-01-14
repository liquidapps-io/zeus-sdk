const { loadModels } = require('../../tools/models');
var serviceRun = require('../../helpers/service-runner');

module.exports = async(args) => {
    if (args.creator !== 'eosio') { return; } // only local

    // for each sidechain
    var sidechains = await loadModels('local-sidechains');
    for (var i = 0; i < sidechains.length; i++) {
        var sidechain = sidechains[i];
        var res = await serviceRun('../run/demux', sidechain.demux_port).handler(args, {
            NODEOS_HOST: 'localhost',
            NODEOS_PORT: sidechain.nodeos_port,
            NODEOS_WEBSOCKET_PORT: sidechain.nodeos_state_history_port,
            SIDECHAIN: sidechain.name,
            LOGFILE_NAME: `${sidechain.name}-demux`
        });
    }
};
