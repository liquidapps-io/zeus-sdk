var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount, resolveProviderPackage, pushTransaction } = require('../dapp-services-node/common');
const { loadModels } = require("../../extensions/tools/models");
const logger = require('../../extensions/helpers/logger');

nodeFactory('vaccounts', {
    api: {
        push_action: async({ body }, res) => {

            const { contract_code, public_key, payload, signature } = body;
            logger.info(`Received vaccount push_action request: account ${contract_code}, public key ${public_key}`);           
            const eosMain = await eosDSPGateway();
            var loadedExtensions = await loadModels("dapp-services");
            var service = loadedExtensions.find(a => a.name == "vaccounts").contract;
            var resolvedPackages = await resolveProviderPackage(contract_code, service, paccount);     
            let data = {
                current_provider: paccount,
                pubkey: public_key,
                "package": resolvedPackages,
                payload: payload,
                sig: signature
            };
            try {
                let result = await pushTransaction(eosMain,contract_code,paccount,"xvexec",data);
                logger.debug("Signed tx: %s", JSON.stringify(result));
                res.send(JSON.stringify({ result }));
            }
            catch (e) {
                console.error("error:", e);
                logger.error(`Error executing vaccount transaction: ${e.json ? JSON.stringify(e.json) : JSON.stringify(e)}`);
                var x = e;
                if (e.json)
                    x = e.json;
                res.status(500);
                res.send(JSON.stringify({
                    code: 500,
                    error: {
                        details: [{ message: JSON.stringify(x) }]
                    }
                }));
            }


        }




    }
});
