import { getClient } from "./client";

(async () => {
    const response = await (await getClient()).dappNetwork.get_table_packagext_by_package_service_provider('package1', 'ipfsservice1', 'heliosselene', { limit: 500 });
    for (const row of response.rows) {
        console.log(row);
    }
})().catch((e) => { console.log(e); });