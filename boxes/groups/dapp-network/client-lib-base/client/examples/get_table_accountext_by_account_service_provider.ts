import { getClient } from "./client";

(async () => {
    const response = await (await getClient()).dappNetwork.get_table_accountext_by_account_service_provider('cardgame1112', 'ipfsservice1','heliosselene');
    for (const row of response.rows) {
        console.log(row);
        // {
        //     id: 144,
        //     account: 'mailcontract',
        //     service: 'ipfsservice1',
        //     provider: 'heliosselene',
        //     quota: '9.9907 QUOTA',
        //     balance: '10.0000 DAPP',
        //     last_usage: '1564112241500',
        //     last_reward: '1564112241500',
        //     package: 'ipfs1',
        //     pending_package: 'ipfs1',
        //     package_started: '1564112241500',
        //     package_end: '1564112301500'
        // }
    }
})().catch((e) => { console.log(e); });