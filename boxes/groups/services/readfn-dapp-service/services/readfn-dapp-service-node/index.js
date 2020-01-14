var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { getCreateKeys } = require('../../extensions/helpers/key-utils');
const { emitUsage, eosDSPGateway, getEosForSidechain, paccount, getLinkedAccount, paccountPermission } = require('../dapp-services-node/common');
const { loadModels } = require("../../extensions/tools/models");
const logger = require('../../extensions/helpers/logger');

// todo: periodically call "usage" for hold and serve
nodeFactory('readfn', {
  api: {
    read: async({ body }, res) => {
      // todo: verify api key or ref domain

      try {
        const { contract_code, method, payload, sidechain } = body;
        logger.debug("ReadFN Request: %j", body);

        let gateway = await eosDSPGateway();
        let mainnet_account = contract_code;
        let loadedExtensions = await loadModels("dapp-services");
        let service = loadedExtensions.find(a => a.name == "readfn").contract;
        let provider = paccount;
        let env = process.env.DSP_PRIVATE_KEY
        let key = {};
        if (!env && !sidechain)
          key = (await getCreateKeys(paccount)).active.privateKey;

        if(sidechain) {
          let sidechains = await loadModels('local-sidechains');
          let sidechainObj = sidechains.find(a => a.name === sidechain);
          const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechainObj.name && m.mainnet_account === provider);
          if (!mapEntry)
            throw new Error('mapping not found')
          provider = mapEntry.chain_account;
          mainnet_account = await getLinkedAccount(null, null, contract_code, sidechainObj.name);
          gateway = await getEosForSidechain(sidechainObj,provider,true);
          env = process.env[`DSP_PRIVATE_KEY_${sidechainObj.name}`]; 
          if(!env)
            key = (await getCreateKeys(provider, null, false, sidechainObj)).active.privateKey; 
        }
        let contract = await gateway.contract(contract_code);
        
        if (method.indexOf("read") !== 0)
          throw new Error("readfn can only invoke actions named 'read*'");

        await emitUsage(mainnet_account, service);

        try {
          let tx = await contract[method](payload, {
            authorization: `${provider}@${paccountPermission}`,
            broadcast: true,
            sign: true,
            keyProvider: [env || key]
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
