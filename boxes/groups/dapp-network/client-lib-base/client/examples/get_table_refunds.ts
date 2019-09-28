import { getClient } from "./client";

(async () => {
    const response = await (await getClient()).dappNetwork.get_table_refunds('heliosselene');
    for (const row of response.rows) {
        console.log(row);
        // {
        //     id: 0,
        //     account: 'heliosselene',
        //     amount: '10.0000 DAPP',
        //     unstake_time: 12345678
        //     provider: 'heliosselene',
        //     service: 'ipfsservice1'
        // }
    }
})().catch((e) => { console.log(e); });