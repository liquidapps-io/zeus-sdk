var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { getCreateKeys } = require('../../extensions/helpers/key-utils');
const { eosDSPGateway, paccount, resolveProviderPackage, paccountPermission } = require('../dapp-services-node/common');
const { loadModels } = require("../../extensions/tools/models");


// todo: periodically call "usage" for hold and serve
nodeFactory('readfn', {
  api: {
    read: async({ body }, res) => {
      // todo: verify api key or ref domain

      try {
        const { contract_code, method, payload } = body;
        var contract = await eosDSPGateway.contract(contract_code);
        let key = {};
        if (!process.env.DSP_PRIVATE_KEY)
          key = await getCreateKeys(paccount);

        var loadedExtensions = await loadModels("dapp-services");
        var service = loadedExtensions.find(a => a.name == "readfn").contract;

        var resolvedPackages = await resolveProviderPackage(contract_code, service, paccount);

        if (method.indexOf("read") !== 0)
          throw new Error("readfn can only invoke actions named 'read*'");
        try {
          await contract[method](payload, {
            authorization: `${paccount}@${paccountPermission}`,
            broadcast: true,
            sign: true,
            keyProvider: [process.env.DSP_PRIVATE_KEY || key.active.privateKey]
          });
        }
        catch (expectedError) {
          if (typeof expectedError === "string") {
            expectedError = JSON.parse(expectedError);
          }
          var resMsg = expectedError.error.details[0].message;

          if (typeof(resMsg) === 'object') {
            resMsg = resMsg.response.error.details
          }

          var parsedMsg = resMsg.split("assertion failure with message: rfn:", 2);
          if (parsedMsg.length != 2)
            throw new Error(resMsg);
          var result = parsedMsg[1];
          res.send(JSON.stringify({ result }));
          return;
        }
        throw new Error("'read functions' must complete with READFN_RETURN(result)");
        // should have failed with an error.

      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    }
  }
});
