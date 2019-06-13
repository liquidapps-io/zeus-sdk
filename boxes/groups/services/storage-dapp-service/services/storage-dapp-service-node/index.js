var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount, resolveProviderPackage } = require('../dapp-services-node/common');
const { getCreateKeys } = require('../../extensions/tools/eos/utils');
const { loadModels } = require("../../extensions/tools/models");


// todo: periodically call "usage" for hold and serve
// todo: periodically call proof of replication

nodeFactory('storage', {
  api: {
    unpin: async({ body }, res) => {
      // verify contract auth
    },
    pin: async({ body }, res) => {
      // verify contract auth
    },
    fetch: async({ body }, res) => {
      // todo: verify api key or ref domain
    },
    store: async({ body }, res) => {
      // verify contract auth
      try {

      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    }
  }
});
