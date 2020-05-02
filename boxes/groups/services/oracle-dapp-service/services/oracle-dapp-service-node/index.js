const { requireBox, createDir } = require('@liquidapps/box-utils');
const { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
const handlers = {};
const logger = requireBox('log-extensions/helpers/logger');

createDir('protocols', 'services/oracle-dapp-service-node/protocols');

nodeFactory('oracle', {
  geturi: async ({ event, rollback }, { uri }) => {
    if (rollback) {
      event.action = 'orcclean';
      console.log('orcclean after failed transaction', uri);
      return {
        size: 0,
        uri
      };
    }
    const payloadStr = Buffer.from(uri, 'hex').toString('utf8');
    const { payer, packageid, current_provider, sidechain } = event;
    const payloadParts = payloadStr.split('://', 4);
    let partIdx = 0;
    const trxId = payloadParts[partIdx++];
    const tapos = payloadParts[partIdx++];
    const proto = payloadParts[partIdx++];
    const address = payloadParts[partIdx++];
    let handler = handlers[proto];
    logger.debug(`req ${trxId} ${tapos} ${proto} ${address}`);
    try {
      if (!handler) {

        handler = requireBox(`protocols/${proto}`);
        if (!handler)
          throw new Error(`unsupported protocol ${proto}`);
        handlers[proto] = handler;
      }
      let data = await handler({ proto, address, sidechain, contract: payer });
      return {
        uri,
        data: data,
        size: data.length
      };
    }
    catch (e) {
      logger.error(e.toString());
      throw e;
    }
  }
});
