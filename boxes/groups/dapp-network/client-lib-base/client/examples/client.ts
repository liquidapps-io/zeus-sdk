import { createClient } from "../src/dapp-client-lib";
import fetch from 'isomorphic-fetch'
const endpoint = "https://kylin-dsp-2.liquidapps.io";

export const getClient = () => createClient( { network:"kylin", httpEndpoint: endpoint, fetch });