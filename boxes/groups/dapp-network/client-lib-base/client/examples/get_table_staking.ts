import { getClient } from "./client";

(async () => {
    const response = await (await getClient()).dappNetwork.get_table_staking('cardgame1112');
    for (const row of response.rows) {
        console.log(row);
        // {
        //     id: 0,
        //     account: 'cardgame1112',
        //     balance: '10.0000 DAPP',
        //     provider: 'uuddlrlrbass',
        //     service: 'accountless1'
        // }
    }
})().catch((e) => { console.log(e); });