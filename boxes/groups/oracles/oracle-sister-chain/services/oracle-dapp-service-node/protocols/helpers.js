
const endpoints = {
    'mainnet': process.env.NODEOS_MAINNET_ENDPOINT || 'http://localhost:8888',
    'bos': 'https://api.bos.eostribe.io',
    'telos': 'https://api.telos.eostribe.io',
    'kylin': 'https://kylin.eosn.io',
    'worbli': 'https://api.worbli.eostribe.io',
    'jungle': 'https://junglehistory.cryptolions.io:4433',
    'meetone': 'https://fullnode.meet.one',
    'localmainnet': 'http://localhost:8888',
    'test1': 'http://localhost:2424',
};
const resolveHistoryEndpointForSisterChain = (chain) => {
    const endpoint = endpoints[chain];
    if (!endpoint) {
        throw new Error(`endpoint not found for ${chain}`);
    }
    return endpoint;
};
const extractPath = (item, field) => {
    const fieldPath = field.split('.');
    const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
    if (res) {
        return Buffer.from(res.toString(), 'utf8');
    }
};

module.exports = {
  endpoints,
  resolveHistoryEndpointForSisterChain,
  extractPath
}
