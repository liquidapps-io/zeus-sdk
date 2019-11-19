import { getClient } from "./client";

(async () => {
    const service = await (await getClient()).service('vaccounts', "someaccount");

    const response = await service.upload_public_file(
        Buffer.from("test1234"),
        "5JMUyaQ4qw6Zt816B1kWJjgRA5cdEE6PhCb2BW45rU8GBEDa1RC",
    );
    console.log(response);
})().catch((e) => { console.log(e); });