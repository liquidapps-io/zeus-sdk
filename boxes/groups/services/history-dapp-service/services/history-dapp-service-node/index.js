const { requireBox } = require('@liquidapps/box-utils');
var { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount, resolveProviderPackage } = requireBox('dapp-services/services/dapp-services-node/common');
const { loadModels } = requireBox('seed-models/tools/models');


// todo: periodically call "usage" for hold and serve

// todo: call store for active contracts
nodeFactory('history', {
  hstreg: async ({ rollback, replay, exception }, { query }) => {
    if (rollback) {
      return;

    }
    var size = 0;
    // repopulate if needed. ++size


    if (process.env.PASSIVE_DSP_NODE == 'true' || replay || exception) {
      return;
    }
    return {
      size
    };
  },
  api: {
    fetch: async ({ body }, res) => {
      // verify api key or ref domain

    }
  }
});
