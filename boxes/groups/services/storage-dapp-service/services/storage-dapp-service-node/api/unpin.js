const { requireBox } = require('@liquidapps/box-utils');
var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
const { emitUsage, getLinkedAccount } = requireBox('dapp-services/services/dapp-services-node/common');
const { getContractAccountFor } = requireBox('dapp-services/tools/eos/dapp-services');


BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }); // equivalent

var ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });


module.exports = async (body, state, model, { account, permission, clientCode }) => {
    let { uri, sidechain, contract } = body;
    if (account !== contract) throw new Error('not allowed');

    // unpin uri
    const hash = uri.split('ipfs://', 2)[1];

    const pinset = await ipfs.pin.rm(hash, { recursive: true });


    await emitUsage(sidechain ? await getLinkedAccount(null, null, contract, sidechain.name) : contract, getContractAccountFor(model), 0, sidechain, { uri });

    return { pinset };

}
