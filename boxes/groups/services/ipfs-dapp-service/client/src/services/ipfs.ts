const serviceContract = "ipfsservice1"

import {DSPServiceClient} from '../dsp-service-client';
import * as common from "../dapp-common";
import * as get_table_row from "../types/chain/get_table_row";
const V1_DSP_GET_TABLE_ROW = `/v1/dsp/${serviceContract}/get_table_row`;

export default class VRAMService extends DSPServiceClient {
    constructor( api:any, contract:string, config:any) {
        super( api, contract, config, serviceContract);
    }

 /**
     * [GET /v1/dsp/ipfsservice1/get_table_row](https://docs.liquidapps.io/en/stable/developers/vram-getting-started.html)
     *
     * Get vRAM Row - returns get table row call for dapp::multi_index containers
     *
     * @param {string} contract contract account
     * @param {string} scope table scope
     * @param {string} table contract table
     * @param {string} primary_key table primary_key
     * @param {object} [options={}] optional params
     * @param {number} [options.index_position=1]
     * @param {boolean} [options.json]
     * @param {string} [options.key_type]
     * @param {string} [options.lower_bound]
     * @param {string} [options.upper_bound]
     * @param {string} [options.table_key]
     * @param {string} [options.encode_type]
     * @param {boolean} [options.show_payer]
     * @param {number} [options.limit=10]
     * @example
     *
     * const response = await get_vram_row(
     *  "cardgame1112",
     *  "cardgame1112",
     *  "users",
     *  "nattests",
     *  "kylin",
     * );
     *
     * console.log(response);
     *  // { username: 'nattests',
     *  //     win_count: 0,
     *  //     lost_count: 0,
     *  //     game_data:
     *  // { life_player: 5,
     *  //     life_ai: 5,
     *  //     deck_player:
     *  //     [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 ],
     *  //     deck_ai:
     *  //     [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 ],
     *  //     hand_player: [ 0, 0, 0, 0 ],
     *  //     hand_ai: [ 0, 0, 0, 0 ],
     *  //     selected_card_player: 0,
     *  //     selected_card_ai: 0,
     *  //     life_lost_player: 0,
     *  //     life_lost_ai: 0,
     *  //     status: 0 } }
     */
    public get_vram_row = async (
        contract: string,
        scope: string,
        table: string,
        primary_key: string,
        options: {
            index_position?: number,
            json?: boolean,
            key_type?: string,
            lower_bound?: string,
            upper_bound?: string,
            table_key?: string,
            encode_type?: string,
            show_payer?: boolean,
            limit?: number,
        } = {},
    ) => {
        // Optional params
        const json = options.json === false ? false : true;
        const index_position = options.index_position || 1;
        const limit = options.limit || 10;
        const key_type = options.key_type || "";
        const table_key = options.table_key || "";
        const lower_bound = options.lower_bound || "";
        const upper_bound = options.upper_bound || "";
        const encode_type = options.encode_type || "";
        const show_payer = options.show_payer === true ? true : false;
        const req_data = {
            contract,
            scope,
            table,
            key: primary_key,
            json,
            index_position,
            key_type,
            table_key,
            lower_bound,
            upper_bound,
            encode_type,
            show_payer,
            limit,
        };
        const res = await this.post( V1_DSP_GET_TABLE_ROW, req_data, { contract } );
        return res;
    }


}