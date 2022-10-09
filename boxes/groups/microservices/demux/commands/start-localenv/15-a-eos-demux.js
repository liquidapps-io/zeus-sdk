const { requireBox } = require('@liquidapps/box-utils');
const { testProvidersList } = requireBox('dapp-services/tools/eos/dapp-services');
const serviceRunner = requireBox('seed-microservices/helpers/service-runner');
const { emojMap } = requireBox('seed-zeus-support/_exec');

const delay = ms => new Promise(res => setTimeout(res, ms));
const firehoseDelay = process.env.FIREHOSE_DELAY || 10000;

module.exports = async (args) => {
    if (args.creator !== 'eosio') { 
    return;
  } // only local
    if(args.kill) {
        return;
    }
    if(args.backend == 'firehose') {
        for (var pi = 0; pi < testProvidersList.length; pi++) {
            var testProvider = testProvidersList[pi];
            await serviceRunner(`/dummy/firehose`, 3195 * (pi + 1)).handler(args, {
                NODEOS_HOST: 'localhost',
                TEST_ENV: true,
                NODEOS_PORT: 8888,
                WEBHOOK_DAPP_PORT: 8812 * (pi + 1),
                FIREHOSE_GRPC_ADDRESS: 'localhost',
                FIREHOSE_GRPC_SECURED: false,
                FIREHOSE_GRPC_PORT: 13035,
                DSP_ACCOUNT: testProvider.account
            });
        }
        if(args.singleChain) {
            console.log(`${emojMap.ok}waiting ${firehoseDelay}ms for firehose to catch up`);
            await delay(firehoseDelay)
        }
    } else if(args.backend == 'state_history_plugin') {
        for (var pi = 0; pi < testProvidersList.length; pi++) {
            var testProvider = testProvidersList[pi];
            await serviceRunner(`/dummy/demux`, 3195 * (pi + 1)).handler(args, {
                NODEOS_HOST: 'localhost',
                TEST_ENV: true,
                NODEOS_PORT: 8888,
                WEBHOOK_DAPP_PORT: 8812 * (pi + 1),
                NODEOS_WEBSOCKET_PORT: 8887,
                DSP_ACCOUNT: testProvider.account
            });
        }
    } else {
        throw new Error('no soup for you, flavors available: firehose or state_history_plugin');
    }
};
