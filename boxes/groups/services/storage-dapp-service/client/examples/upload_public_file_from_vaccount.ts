import { getClient } from "./client";
const ecc = require("eosjs-ecc");

(async () => {
    const service = await (await getClient()).service('storage', "5jqee4kl1ns1");
    const data = Buffer.from("a great LiquidAccount success", "utf8");
    const vAccount1 = `vaccount1`;
    const privateKeyWif = "5HzXLtjFr34BCBYzjYeMgKGyvZJ41VqhcCAwUb5mKhtdDmQwnEB";
    const response = await service.upload_public_file_from_vaccount(
      data, 
      {
        name: vAccount1,
        key: privateKeyWif
      }
    );
    console.log(`uri: ${response.uri}`);
})().catch((e) => { console.log(e); });