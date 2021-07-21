import { getClient } from "./client";

(async () => {
    const response = await (await getClient()).dappNetwork.get_table_packagext({ limit: 500 });
    for (const row of response.rows) {
        console.log(row);
    }
})().catch((e) => { console.log(e); });