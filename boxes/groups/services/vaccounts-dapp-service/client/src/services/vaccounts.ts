import {DSPServiceClient} from '../dsp-service-client';
import * as common from "../dapp-common";
const {toBound} = common;
import * as liquidaccount from "../types/dsp/liquid-account";
const serviceContract = "accountless1";
export const V1_DSP_PUSH_LIQUIDACCOUNT_ACTION = `/v1/dsp/${serviceContract}/push_action`;
export const V1_DSP_GET_LIQUIDACCOUNT_NONCE = `/v1/dsp/${serviceContract}/get_nonce`;
const ecc = require( "eosjs-ecc" );
import { Serialize } from 'eosjs';

const { PrivateKey } = ecc;
const { BigNumber } = require( "bignumber.js" );
const endpoints = require( "../types/endpoints" );
const { encodeName } = require( "../dapp-common" );
const { TextDecoder, TextEncoder } = require( "text-encoding" );


export default class LiquidAccountsService extends DSPServiceClient {
    private ipfs:any;
    constructor( api:any, contract:string, config:any) {
        super( api, contract, config, serviceContract);
        this.ipfs = new (require('./ipfs').default)(api, contract, config);
    }
    /**
     * [POST /v1/dsp/accountless1/push_action](http://liquidapps.gitbook.io/)
     *
     * Push Liquid Account Transaction - creates and pushes LiquidAccount transaction
     *
     * @param {string} contract contract account
     * @param {string} private_key contract private key
     * @param {string} action contract action
     * @param {any} payload transaction payload
     * @param {object} [options={}] optional params
     * @param {number} [options.time_to_live=120] transaction time to live before expiration
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
            alt_reg_action?: [string]
        } = {},
    )  => {
        const { 
            public_key, payload: serPayload, signature
        } = await this.sign_liquid_account_transaction( contract, private_key, action, payload, options);
        return this.post_liquid_account_transaction(
            contract,
            public_key,
            signature,
            serPayload
        ); 
    }
    
    public sign_liquid_account_transaction = async (
        contract: string,
        private_key: string,
        action: string,
        payload: liquidaccount.Payload,
        options: {
            time_to_live?: number
        } = {},
    )  => {
        let buffer = new Serialize.SerialBuffer({
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder()
        });
        const { time_to_live } = options;
        const expiry = Math.floor(Date.now() / 1000) + Number(time_to_live || 120); //two minute expiry
        buffer.pushNumberAsUint64(expiry);
        const nonce = await this.get_nonce(contract, payload.vaccount);

        buffer.pushNumberAsUint64(nonce);
        const infoRes: any = await this.get( endpoints.V1_GET_INFO );
        var chainId = infoRes.chain_id;

        let buf1 = buffer.getUint8Array(8);
        let buf2 = buffer.getUint8Array(8);
        let header = Serialize.arrayToHex(buf1) + Serialize.arrayToHex(buf2) + chainId;

        const response = await this.api.serializeActions([{
            account: contract,
            name: action,
            authorization: [],
            data: { payload }
        }]);
        const toName = (name) => {
            var res = new BigNumber(encodeName(name, true));
            res = (toBound(res.toString(16), 8));
            return res;
        }
        buffer.pushVaruint32(response[0].data.length / 2);
        const varuintBytes = [];
        while (buffer.haveReadData()) varuintBytes.push(buffer.get());
        const serializedDataWithLength = Serialize.arrayToHex(Uint8Array.from(varuintBytes)) + response[0].data;

        // payloadSerialized corresponds to the actual vAccount action (like regaccount) https://github.com/liquidapps-io/zeus-sdk/blob/a3041e9177ffe4375fd8b944f4a10f74a447e406/boxes/groups/services/vaccounts-dapp-service/contracts/eos/dappservices/_vaccounts_impl.hpp#L50-L60
        // and is used as xvexec's payload vector<char>: https://github.com/liquidapps-io/zeus-sdk/blob/4e79122e42eeab50cf633097342b9c1fa00960c6/boxes/groups/services/vaccounts-dapp-service/services/vaccounts-dapp-service-node/index.js#L30
        // eosio::action fields to serialize https://github.com/EOSIO/eosio.cdt/blob/master/libraries/eosiolib/action.hpp#L194-L221
        const actionSerialized =
        "0000000000000000" + // account_name
        toName(action) + // action_name
        // std::vector<permission_level> authorization https://github.com/EOSIO/eosio.cdt/blob/master/libraries/eosiolib/action.hpp#L107-L155
        "00" +
        // std::vector<char> data;
        serializedDataWithLength;

        const payloadSerialized = header + actionSerialized;
        const wif = ( await PrivateKey.fromString( private_key ) ).toWif();
        const signature = ecc.sign(Buffer.from(payloadSerialized, 'hex'), wif);
        const public_key = PrivateKey.fromString(wif).toPublic().toString()
        return { 
            contract_code: contract,
            public_key,
            payload: payloadSerialized,
            signature
        }
    }

    public post_liquid_account_transaction = async (
        contract: string,
        public_key: string,
        signature: string,
        payload: any
    )  => {
        return this.post(V1_DSP_PUSH_LIQUIDACCOUNT_ACTION, {
            contract_code: contract,
            public_key,
            payload,
            signature
        },{ contract });
    }

    private get_nonce = async (contract, vaccount) => {
        let nonce;
        try {
            const nonceRes = await this.post<liquidaccount.Nonce>(V1_DSP_GET_LIQUIDACCOUNT_NONCE, {
                contract_code: contract,
                vaccount
            });
            nonce = nonceRes.nonce;
        }
        catch (e) {
            throw e;
        }
        return nonce;
    }
}