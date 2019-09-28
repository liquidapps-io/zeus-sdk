import { getClient } from "./client";

(async () => {
    const response = await (await getClient()).dappNetwork.get_package_info( "cardgame1112" );
    console.log(response);
    // {
    //     api: 'https://kylin-dsp-2.liquidapps.io',
    //     package_json_uri: 'https://kylin-dsp-2.liquidapps.io/liquidaccts2.dsp-package.json',
    //     package_id: 'liquidaccts2',
    //     service: 'accountless1',
    //     provider: 'heliosselene',
    //     quota: '10.0000 QUOTA',
    //     package_period: 60,
    //     min_stake_quantity: '10.0000 DAPP',
    //     min_unstake_period: 3600,
    //     enabled: 0
    // }
})().catch((e) => { console.log(e); });