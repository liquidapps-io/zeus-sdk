import 'mocha';
const { getCreateKeys } = require('./utils');
const { loadModels } = require("../models");

const dappServicesContract = process.env.DAPPSERVICES_CONTRACT || 'dappservices';

function getContractAccountFor(model) {
    var envName = process.env[`DAPPSERVICES_CONTRACT_${model.name.toUpperCase()}`];
    return envName ? envName : model.contract;
}

async function genAllocateDAPPTokens(deployedContract, serviceName, provider = "pprovider1", selectedPackage = "default") {
    var key = await getCreateKeys(dappServicesContract);
    var model = (await loadModels("dapp-services")).find(m => m.name == serviceName);
    var service = getContractAccountFor(model);

    var contract = deployedContract.address;
    let servicesTokenContract = await deployedContract.eos.contract(dappServicesContract);

    await servicesTokenContract.issue({
        to: contract,
        quantity: "1000.0000 DAPP",
        memo: ""
    }, {
        authorization: `${dappServicesContract}@active`,
        broadcast: true,
        sign: true,
        keyProvider: [key.privateKey]
    });

    await servicesTokenContract.selectpkg({
        owner: contract,
        provider,
        service,
        "package": selectedPackage
    }, {
        authorization: `${contract}@active`,
        broadcast: true,
        sign: true
    });
    await servicesTokenContract.stake({
        from: contract,
        service,
        provider,
        quantity: "500.0000 DAPP"
    }, {
        authorization: `${contract}@active`,
        broadcast: true,
        sign: true
    });

    await deployedContract.eos.updateauth({
        account: contract,
        permission: 'dsp',
        parent: 'active',
        auth: {
            threshold: 1,
            keys: [],
            accounts: [{
                permission: { actor: provider, permission: 'active' },
                weight: 1
            }],
        }
    }, { authorization: `${contract}@active` });


}


module.exports = { genAllocateDAPPTokens, dappServicesContract, getContractAccountFor }
