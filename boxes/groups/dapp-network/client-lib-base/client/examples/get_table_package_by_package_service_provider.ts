import { getClient } from "./client";

(async () => {
    const response = await (await getClient()).dappNetwork.get_table_package_by_package_service_provider('package1', 'ipfsservice1', 'heliosselene', { limit: 500 });
    for (const row of response.rows) {
        console.log(row);
        // {
        //     id: 9,
        //     api_endpoint: 'https://kylin-dsp-2.liquidapps.io',
        //     package_json_uri: 'https://kylin-dsp-2.liquidapps.io/package1.dsp-package.json',
        //     package_id: 'package1',
        //     service: 'ipfsservice1',
        //     provider: 'heliosselene',
        //     quota: '1.0000 QUOTA',
        //     package_period: 86400,
        //     min_stake_quantity: '10.0000 DAPP',
        //     min_unstake_period: 3600,
        //     enabled: 1
        // }
    }
})().catch((e) => { console.log(e); });