import { getClient } from "./client";

(async () => {
    const service = await (await getClient()).service('storage', "5jqee4kl1ns1");
    const data = Buffer.from("a great success", "utf8");
    const key = "5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK";
    const permission = "active";
    const response = await service.upload_public_file(
        data,
        key,
        permission
    );
    console.log(`uri: ${response.uri}`);
})().catch((e) => { console.log(e); });