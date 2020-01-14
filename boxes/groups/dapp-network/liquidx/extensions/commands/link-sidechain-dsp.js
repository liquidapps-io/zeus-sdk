const { getEosWrapper } = require('../tools/eos/eos-wrapper');
const { loadModels } = require('../tools/models');
const { getNetwork } = require('../tools/eos/utils');
const { getCreateKeys } = require('../helpers/key-utils');
const getDefaultArgs = require('../helpers/getDefaultArgs');

module.exports = {
    description: 'link sidechain dspp',
    builder: (yargs) => {
        yargs
            .example('$0 link-sidechain-dsp ');
    },
    command: 'link-sidechain-dsp <sidechain> <sister-code> <dsp>',
    handler: async (args) => {
        var sidechains = await loadModels('local-sidechains');
        var sidechain = sidechains.find(a => a.name === args.sidechain);

        const mapEntry = (loadModels('liquidx-mappings')).find(m => m.sidechain_name === sidechain.name && m.mainnet_account === 'dappservices');
        if (!mapEntry)
            throw new Error('mapping not found')
        const dappservicex = mapEntry.chain_account;

        // create token
        var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);
        var config = {
            expireInSeconds: 120,
            sign: true,
            chainId: selectedNetwork.chainId
        };

        var keys = await getCreateKeys(sister_code, getDefaultArgs(), false, sidechain);
        config.keyProvider = keys.active.privateKey;

        eosconsumer = deployedContract.eos;
        config.httpEndpoint = `http://localhost:${sidechain.dsp_port}`;
        eosconsumer = getEosWrapper(config);

        const dappservicexInstance = await eosconsumer.contract(dappservicex);

        try {

            await dappservicexInstance.adddsp({ owner: args.sisterCode, dsp: dsp }, {
                authorization: `${args.sisterCode}@active`,
            });
        }
        catch (e) {
            console.log(e);
        }
    }
};
