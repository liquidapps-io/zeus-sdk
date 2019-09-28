import { getClient } from "./client";

(async () => {
    const service = await (await getClient()).service('vaccounts', "vacctstst123");
    const response = await service.push_liquid_account_transaction(
        "vacctstst123",
        "5JMUyaQ4qw6Zt816B1kWJjgRA5cdEE6PhCb2BW45rU8GBEDa1RC",
        "regaccount",
        {
            vaccount: 'testing126' // increment to new account if fails
        }
    );
    console.log(response);
    // { result:
    //     { broadcast: true,
    //       transaction:
    //        { compression: 'none',
    //          transaction: [Object],
    //          signatures: [Array] },
    //       transaction_id:
    //        'ef90712d7bfe7da325a5eb5545b13f1bb05ba1360753463645be96dce18858c2',
    //       processed:
    //        { id:
    //           'ef90712d7bfe7da325a5eb5545b13f1bb05ba1360753463645be96dce18858c2',
    //          block_num: 60942620,
    //          block_time: '2019-08-07T14:12:47.500',
    //          producer_block_id: null,
    //          receipt: [Object],
    //          elapsed: 4414,
    //          net_usage: 400,
    //          scheduled: false,
    //          action_traces: [Array],
    //          account_ram_delta: null,
    //          except: null,
    //          error_code: null } } }
})().catch((e) => { console.log(e); });