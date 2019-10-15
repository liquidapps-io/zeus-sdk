import {DSPServiceClient} from '../dsp-service-client';
import * as common from "../dapp-common";
const {toBound} = common;
import * as liquidaccount from "../types/dsp/liquid-account";
const serviceContract = "accountless1";
export const V1_DSP_PUSH_LIQUIDACCOUNT_ACTION = `/v1/dsp/${serviceContract}/push_action`;
const Long = require('long');
const ecc = require( "eosjs-ecc" );
import { Api, JsonRpc,Serialize } from 'eosjs';

const { PrivateKey } = ecc;
const { BigNumber } = require( "bignumber.js" );
const { endpoints } = require( "../types/endpoints" );
const { encodeName } = require( "../dapp-common" );

import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';

export default class LiquidAccountsService extends DSPServiceClient {
    private ipfs:any;
    constructor( api:any, contract:string, config:any) {
        super( api, contract, config, serviceContract);
        this.ipfs = new (require('./ipfs').default)(api, contract, config);
    }
    /**
     * [POST /v1/dsp/accountless1/push_action](https://docs.liquidapps.io/en/stable/services/vaccounts-service.html)
     *
     * Push Liquid Account Transaction - creates and pushes LiquidAccount transaction
     *
     * @param {string} contract contract account
     * @param {string} private_key contract private key
     * @param {string} action contract action
     * @param {any} payload transaction payload
     * @param {object} [options={}] optional params
     * @param {number} [options.time_to_live=3600] transaction time to live before expiration
     * @example
     *
     * let response = await push_liquid_account_transaction(
     *    "vacctstst123",
     *    "5JMUyaQ4qw6Zt816B1kWJjgRA5cdEE6PhCb2BW45rU8GBEDa1RC",
     *    "hello",
     *    {
     *      vaccount: 'testing124',
     *      b: 1,
     *      c: 2
     *    },
     *    "kylin",
     * );
     *
     * console.log( response );
     * // { result:
     * //     { broadcast: true,
     * //       transaction:
     * //        { compression: 'none',
     * //          transaction: [Object],
     * //          signatures: [Array] },
     * //       transaction_id:
     * //        'ef90712d7bfe7da325a5eb5545b13f1bb05ba1360753463645be96dce18858c2',
     * //       processed:
     * //        { id:
     * //           'ef90712d7bfe7da325a5eb5545b13f1bb05ba1360753463645be96dce18858c2',
     * //          block_num: 60942620,
     * //          block_time: '2019-08-07T14:12:47.500',
     * //          producer_block_id: null,
     * //          receipt: [Object],
     * //          elapsed: 4414,
     * //          net_usage: 400,
     * //          scheduled: false,
     * //          action_traces: [Array],
     * //          account_ram_delta: null,
     * //          except: null,
     * //          error_code: null } } }
    */
    public push_liquid_account_transaction = async (
        contract: string,
        private_key: string,
        action: string,
        payload: liquidaccount.Payload,
        options: {
            time_to_live?: number,
        } = {},
    )  => {
        const time_to_live = options.time_to_live || 3600;
        return await this.push_liquid_account_transaction_logic( contract, private_key, action, payload, time_to_live );
    }
private push_liquid_account_transaction_logic = async ( contract: string, private_key: string, action: string, payload: liquidaccount.Payload, time_to_live: number ) => {
        const wif = ( await PrivateKey.fromString( private_key ) ).toWif();
        return await this.runTrx(
            contract,
            wif,
            {
                name: action,
                data: {
                    payload,
                },
            },
            time_to_live,
        );
    }
 private postVirtualTx = ({
        contract,
        payload,
        wif
    }) => {
        var signature = ecc.sign(Buffer.from(payload, 'hex'), wif);
        const public_key = PrivateKey.fromString(wif).toPublic().toString()
        return this.post(V1_DSP_PUSH_LIQUIDACCOUNT_ACTION, {
            contract,
            public_key,
            payload,
            signature
        },{ contract });
    }


    private runTrx = async(
        contract,
        payload,
        wif,
        time_to_live= 120
    ) => {



        let buffer = new Serialize.SerialBuffer({
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder()
        });

        const expiry = Math.floor(Date.now() / 1000) + 120; //two minute expiry
        buffer.pushNumberAsUint64(expiry);
        var nonce =0;
        try {
            var tableRes = await this.ipfs.get_vram_row(
                contract,
                contract,
                "vkey",
                payload.data.payload.vaccount
            );
            nonce = tableRes.row.nonce;
            console.log('got nonce', nonce);
        }
        catch (e) {
            console.log('no nonce');
            nonce = 0;
        }

        buffer.pushNumberAsUint64(nonce);
        const infoRes: any = await this.get( endpoints.V1_GET_INFO );
        var chainId = infoRes.chain_id;

        let buf1 = buffer.getUint8Array(8);
        let buf2 = buffer.getUint8Array(8);
        let header = Serialize.arrayToHex(buf1) + Serialize.arrayToHex(buf2) + chainId;

        const response = await this.api.serializeActions([{
            account: contract,
            name: payload.name,
            authorization: [],
            data: payload.data
        }]);
        const toName = (name) => {
            var res = new BigNumber(encodeName(name, true));
            res = (toBound(res.toString(16), 8));
            return res;
        }
        var datasize = toBound(new BigNumber(response[0].data.length / 2).toString(16), 1).match(/.{2}/g).reverse().join('');
        var payloadSerialized = header + "0000000000000000" + toName(payload.name) + "01" + "00000000000000000000000000000000" + datasize + response[0].data;
        return await this.postVirtualTx({
            contract,
            wif,
            payload: payloadSerialized
        });
    }



}