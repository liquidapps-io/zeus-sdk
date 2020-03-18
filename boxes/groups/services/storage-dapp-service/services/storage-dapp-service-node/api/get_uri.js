const logger = require('../../../extensions/helpers/logger');
const { readFromIPFS } = require('../common');

module.exports = async(body, res) => {
    const { uri } = body;
    const encoding = body.encoding ? body.encoding : 'base64';
    logger.debug("get_uri: %s", uri);      
    try {        
        const raw = await readFromIPFS(uri);
        const data = raw.toString(encoding);

        logger.debug("get_uri: %s retrieved data %s", uri, data);    
        return { uri, data };
    }
    catch (e) {
        logger.error(`error: ${e.toString()}`);
        throw e;
    }
}
