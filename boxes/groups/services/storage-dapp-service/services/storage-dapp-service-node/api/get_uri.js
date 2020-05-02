const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
const { readFromIPFS } = requireBox('storage-dapp-service/services/storage-dapp-service-node/common');

module.exports = async (body, res) => {
    const { uri } = body;
    const encoding = body.encoding ? body.encoding : 'base64';
    logger.info("get_uri: %s", uri);
    try {
        const raw = await readFromIPFS(uri);
        const data = raw.toString(encoding);

        logger.info("get_uri: %s retrieved data %s", uri, data);
        return { uri, data };
    }
    catch (e) {
        logger.error(`error: ${e.toString()}`);
        throw e;
    }
}
