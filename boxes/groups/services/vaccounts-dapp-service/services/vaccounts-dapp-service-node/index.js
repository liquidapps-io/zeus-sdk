var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount } = require('../dapp-services-node/common');
const { getCreateKeys } = require('../../extensions/tools/eos/utils');

nodeFactory('vaccounts', {
  api: {
    push_action: async ({ body }, res) => {
      const { contract_code, vaccount, payload, signature } = body;
      var contract = await eosDSPGateway.contract(contract_code);
      let key = {};
      if (!process.env.DSP_PRIVATE_KEY) { key = await getCreateKeys(paccount); }
      await contract.vexec({
        current_provider: paccount,
        vaccount,
        payload,
        signature
      }, {
        authorization: `${paccount}@active`,
        broadcast: true,
        sign: true,
        keyProvider: [process.env.DSP_PRIVATE_KEY || key.privateKey]
      });
    }
  }
});
