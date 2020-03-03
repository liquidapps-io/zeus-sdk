const { emitUsage } = require('../../dapp-services-node/common');
const { getContractAccountFor } = require('../../../extensions/tools/eos/dapp-services');
const { unpack, saveDirToIPFS, saveToIPFS } = require('../common')
const logger = require('../../../extensions/helpers/logger');

module.exports = async(body, state, model, { account, permission, clientCode }) => {
    let { data, archive, sidechain, contract } = body;

    if (account !== contract) throw new Error('not allowed');
    let uri;
    var length = 0;
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
        uri = await saveToIPFS(data);
        length = data.byteLength;
    }
    await emitUsage(contract, getContractAccountFor(model), length, sidechain, { uri })

    return { uri };
}
