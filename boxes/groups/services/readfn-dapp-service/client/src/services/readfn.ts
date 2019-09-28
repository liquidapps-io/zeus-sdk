// import {DSPServiceClient} from '../dsp-service-client';
// import * as readfn from "../types/dsp/readfn";
// import * as common from "../dapp-common";
// const serviceContract = "readfndspsvc"

// export const V1_DSP_PUSH_READDFN_ACTION = `/v1/dsp/${serviceContract}/read`;

// export default class ReadFNService extends DSPServiceClient {

//     /**
//      * [POST /v1/dsp/readfndspsvc/read](https://docs.liquidapps.io/en/stable/services/readfn-service.html)
//      *
//      * Push Readfn Transaction - creates and pushes ReadFN transaction
//      *
//      * @param {string} contract contract account
//      * @param {string} method contract method
//      * @param {readfn.Payload} payload transaction payload
//      * @example
//      *
//      * let response = await push_readfn_transaction(
//      *  "1pointeight1",
//      *  "readtest",
//      *  {
//      *    testnum: 123
//      *  },
//      *  "kylin",
//      * );
//      *
//      * console.log( response );
//      * // {
//      * //   result: 'hello-123'
//      * // }
//      */
//     public push_readfn_transaction = async (
//         contract: string,
//         method: string,
//         payload: readfn.Payload,
//     ) => {
//         const req_data = {
//             contract_code: contract,
//             method,
//             payload,
//         };
//         return await this.post( V1_DSP_PUSH_READDFN_ACTION, req_data, { contract } );
//     }
// }