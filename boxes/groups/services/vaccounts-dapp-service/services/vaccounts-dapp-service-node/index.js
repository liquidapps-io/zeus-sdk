var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { getCreateKeys } = require('../../extensions/helpers/key-utils');
const { eosDSPGateway, paccount, resolveProviderPackage, paccountPermission } = require('../dapp-services-node/common');
const { loadModels } = require("../../extensions/tools/models");
const { dappServicesContract, getContractAccountFor } = require("../../extensions/tools/eos/dapp-services")

nodeFactory('vaccounts', {
    api: {
        push_action: async({ body }, res) => {

            const { contract_code, public_key, payload, signature } = body;
            console.log("invoking", contract_code, public_key, payload, signature);
            var contract = await eosDSPGateway.contract(contract_code);
            let key = {};
            if (!process.env.DSP_PRIVATE_KEY)
                key = await getCreateKeys(paccount);

            var loadedExtensions = await loadModels("dapp-services");
            var service = loadedExtensions.find(a => a.name == "vaccounts").contract;

            var resolvedPackages = await resolveProviderPackage(contract_code, service, paccount);

            try {

                var result = await contract.xvexec({
                    current_provider: paccount,
                    pubkey: public_key,
                    "package": resolvedPackages,
                    payload: payload,
                    sig: signature
                }, {
                    authorization: `${paccount}@${paccountPermission}`,
                    keyProvider: [process.env.DSP_PRIVATE_KEY || key.active.privateKey]
                });
                res.send(JSON.stringify({ result }));
            }
            catch (e) {
                console.error("error:", e);
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
