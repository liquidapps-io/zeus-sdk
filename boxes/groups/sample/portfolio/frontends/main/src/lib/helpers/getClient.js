
import { createClient } from '@liquidapps/dapp-client';

export const getClient = async(network, endpoint) => {
    const client_network = network || "kylin";
    const client_endpoint = process.env.REACT_APP_EOS_HTTP_ENDPOINT || endpoint;
    return await createClient({ network: client_network, httpEndpoint: client_endpoint, fetch: window.fetch.bind(window) });
};