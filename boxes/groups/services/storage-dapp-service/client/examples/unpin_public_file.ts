import { getClient } from "./client";

(async () => {
    const service = await (await getClient()).service('storage', "5jqee4kl1ns1");
    const key = "5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK";
    const uri = "ipfs://zb2rhga33kcyDrMLZDacqR7wLwcBRVgo6sSvLbzE7XSw1fswH";
    const permission = "active";
    const result = await service.unpin(
      uri,
      key,
      permission,
    );
    console.log(`result: ${JSON.stringify(result)}`);
})().catch((e) => { console.log(e); });