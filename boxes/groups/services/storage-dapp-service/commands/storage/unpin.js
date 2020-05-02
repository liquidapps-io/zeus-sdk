const { requireBox } = require('@liquidapps/box-utils');
const { createClient } = requireBox("client-lib-base/client/dist/src/dapp-client-lib");
const { emojMap } = requireBox('seed-zeus-support/_exec');
const fetch = require('isomorphic-fetch');

module.exports = {
  description: 'Unpin a URI from LiquidStorage IPFS',
  builder: (yargs) => {
    yargs
      .option('dsp-url', {
        describe: 'DAPP Service Provider endpoint',
        alias: 'u',
        default: 'http://127.0.0.1:13015'
      })
      .option('permission', {
        describe: 'permission to upload file',
        alias: 'p',
        default: 'active'
      })
      .example(`$0 storage unpin 5jqee4kl1ns1 zb2rhX28fttoDTUhpmHBgQa2PzjL1N3XUDaL9rZvx8dLZseji 5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK`)
      .example(`$0 storage unpin 5jqee4kl1ns1 zb2rhX28fttoDTUhpmHBgQa2PzjL1N3XUDaL9rZvx8dLZseji 5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK --dsp-url http://kylin-dsp-2.liquidapps.io/`)
  },
  command: 'unpin <contract> <uri> <key>',

  handler: async (args) => {
    let response, uri;
    // check if uri already has 'ipfs://'
    if (args.uri.includes('ipfs://')) {
      uri = args.uri;
    } else {
      uri = `ipfs://${args.uri}`;
    }
    const endpoint = args.dspUrl;
    const getClient = () => createClient({ httpEndpoint: endpoint, fetch });
    const service = await (await getClient()).service('storage', args.contract);
    const key = args.key;
    const permission = args.permission;
    // unpin
    try {
      response = await service.unpin(
        uri,
        key,
        permission,
      );
    } catch (e) {
      console.log(`${emojMap.white_frowning_face} IPFS Unpin failed\n`);
      // check if json comes back from error
      if (e.json) {
        throw (e.json.error);
      } else {
        throw (e);
      }
    }
    // sometimes pinset and unpinned URI are different, return both
    console.log(emojMap.ok + 'Unpinned: ' + uri + '\npinset hash: ' + response.pinset[0].hash);
  }
};
