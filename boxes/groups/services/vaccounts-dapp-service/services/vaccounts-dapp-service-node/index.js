var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount, resolveProviderPackage } = require('../dapp-services-node/common');
const { getCreateKeys } = require('../../extensions/tools/eos/utils');
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
            var result = await contract.xvexec({
                current_provider: paccount,
                pubkey: public_key,
                "package": resolvedPackages,
                payload,
                sig: signature
            }, {
                authorization: `${paccount}@active`,
                broadcast: true,
                sign: true,
                keyProvider: [process.env.DSP_PRIVATE_KEY || key.privateKey]
            });

            res.send(JSON.stringify({ result }));
        }
    }
});
