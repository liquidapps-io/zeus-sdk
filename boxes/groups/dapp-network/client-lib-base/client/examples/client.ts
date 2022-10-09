import { createClient } from "../src/dapp-client-lib";
import fetch from 'isomorphic-fetch'
const endpoint = "https://kylin-dsp-1.liquidapps.io";
// add comment
export const getClient = () => createClient( { network:"kylin", httpEndpoint: endpoint, fetch });