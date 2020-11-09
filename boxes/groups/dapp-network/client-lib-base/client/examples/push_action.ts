/*

    Command to build and test:
    mkdir dapp-client; cd dapp-client; zeus box create; zeus unbox client-lib-base
    cd zeus_boxes/client-lib-base/client && npm install && npm run build; cd ../../../; node zeus_boxes/client-lib-base/client/dist/examples/push_action.js

*/

import { getClient } from "./client";

(async () => {
    const endpoint = 'http://kylin-dsp-2.liquidapps.io';
    const account = 'dappservices';
    const actor = 'vacctstst123';
    const action = 'transfer';
    const data = {
        from: 'vacctstst123',
        to: 'natdeveloper',
        quantity: '1.0000 DAPP',
        memo: ''
    };
    const private_key = '5JMUyaQ4qw6Zt816B1kWJjgRA5cdEE6PhCb2BW45rU8GBEDa1RC';
    const response = await (await getClient()).dappNetwork.push_action(endpoint, account, actor, action, data, private_key, {
        push_guarantee: 'in-block'
        // push_guarantee: 'handoffs:1'
        // push_guarantee: 'handoffs:2'
        // push_guarantee: 'handoffs:3'
        // push_guarantee: 'irreversible'
    });
    console.log(response);
})().catch((e) => { console.log(e); });