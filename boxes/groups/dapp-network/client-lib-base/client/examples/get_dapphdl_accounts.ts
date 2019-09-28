import { getClient } from "./client";

(async () => {
    const response = await (await getClient()).airhodl.get_dapphdl_accounts('natdeveloper');
    for (const row of response.rows) {
        console.log(row);
        // {
        //     balance: '0.0033 DAPPHDL',
        //     allocation: '0.0199 DAPPHDL',
        //     staked: '0.0000 DAPPHDL',
        //     claimed: 1
        // }
    }
})().catch((e) => { console.log(e); });