var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount, resolveProvider,resolveProviderPackage,resolveProviderData, pushTransaction, getLinkedAccount, getEosForSidechain, emitUsage } = require('../dapp-services-node/common');
const { dappServicesContract, dappServicesLiquidXContract, getContractAccountFor } = require('../../extensions/tools/eos/dapp-services');
const { loadModels } = require("../../extensions/tools/models");
const fetch = require('node-fetch');
const logger = require('../../extensions/helpers/logger');

nodeFactory('vaccounts', {
    api: {
        push_action: async(req, res) => {
            const { contract_code, public_key, payload, signature, sidechain } = req.body;
            logger.info(`Received vaccount push_action request: account ${contract_code}, public key ${public_key}`);
            var gateway = await eosDSPGateway();
            var loadedExtensions = await loadModels("dapp-services");
            var service = loadedExtensions.find(a => a.name == "vaccounts").contract;
            var provider = await resolveProvider(contract_code,service,'',sidechain);
            if(provider !== paccount) {
                //forward the request
                logger.info(`Attempting to forward request to provider: ${provider}`);
                const package = await resolveProviderPackage(contract_code,service,provider,sidechain);
                const providerData = await resolveProviderData(service,provider,package);
                const r = await fetch(providerData.endpoint + req.originalUrl, { method: 'POST', body: JSON.stringify(req.body) });
                const resText = await r.text();
                res.status(r.status);
                res.send(resText);
            }
            var mainnet_account = contract_code;
            var dapp = dappServicesContract;
            if(sidechain) {
                const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === provider);
                if (!mapEntry)
                  throw new Error('mapping not found')
                provider = mapEntry.chain_account;
                mainnet_account = await getLinkedAccount(null, null, contract_code, sidechain.name);
                gateway = await getEosForSidechain(sidechain,provider,true);
                dapp = await getLinkedAccount(null, null, dappServicesContract, sidechain.name);
            }
            var resolvedPackages = await resolveProviderPackage(mainnet_account, service, paccount);     
            let data = {
                current_provider: provider,
                pubkey: public_key,
                "package": resolvedPackages,
                payload: payload,
                sig: signature
            };
            try {
                let result = await pushTransaction(gateway,dapp,contract_code,provider,"xvexec",data);
                logger.debug("Signed tx: %s", JSON.stringify(result));
                if(sidechain) await emitUsage(mainnet_account, service);
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
