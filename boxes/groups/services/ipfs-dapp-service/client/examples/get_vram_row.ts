import { getClient } from "./client";

(async () => {
    const service = await (await getClient()).service('ipfs','cardgame1112');

    const response = await service.get_vram_row( "cardgame1112", "cardgame1112", "users", "nattests" );
    console.log(response);
    // { username: 'nattests',
    //     win_count: 0,
    //     lost_count: 0,
    //     game_data:
    // { life_player: 5,
    //     life_ai: 5,
    //     deck_player:
    //     [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 ],
    //     deck_ai:
    //     [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 ],
    //     hand_player: [ 0, 0, 0, 0 ],
    //     hand_ai: [ 0, 0, 0, 0 ],
    //     selected_card_player: 0,
    //     selected_card_ai: 0,
    //     life_lost_player: 0,
    //     life_lost_ai: 0,
    //     status: 0 } }
})().catch((e) => { console.log(e); });