import { getClient } from "./client";
const fs = require("fs");

(async () => {
    const service = await (await getClient()).service('storage', "5jqee4kl1ns1");
    const key = "5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK";
    const permission = "active";
    const path = __dirname + "/../../../test/utils/YourTarBall.tar";
    console.log(path);
    const content = fs.readFileSync(path);
    const result = await service.upload_public_archive(
      content,
      key,
      permission
    );
    console.log(`uri: ${result.uri}`);
})().catch((e) => { console.log(e); });