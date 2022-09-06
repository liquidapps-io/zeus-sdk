const { requireBox } = require('@liquidapps/box-utils');
const { emitUsage, getLinkedAccount } = requireBox('dapp-services/services/dapp-services-node/common');
const { getContractAccountFor } = requireBox('dapp-services/tools/eos/dapp-services');
const { unpack, saveDirToIPFS, saveToIPFS } = requireBox('storage-dapp-service/services/storage-dapp-service-node/common');
const logger = requireBox('log-extensions/helpers/logger');

module.exports = async (body, state, model, { account, permission }) => {
    let { data, archive, sidechain, contract, options } = body;

    if (account !== contract) throw new Error('not allowed');
    let uri;
    var length = 0;
    const rawLeaves = options.rawLeaves;
    if (archive) {
        // unpack
        var archiveData = Buffer.from(archive.data, `base64`);
        var format = archive.format || 'tar';
        // upload files
        var files = await unpack(archiveData, format);
        length = archiveData.byteLength;
        uri = await saveDirToIPFS(files);
    }
    else {
        data = Buffer.from(data, `base64`);
        uri = await saveToIPFS(data, rawLeaves);
        length = data.byteLength;
    }
    await emitUsage(
        sidechain ? 
            await getLinkedAccount(null, null, contract, sidechain.name) 
            : 
            contract, 
        getContractAccountFor(model), 
        length, 
        { uri }
    )

    return { uri };
}