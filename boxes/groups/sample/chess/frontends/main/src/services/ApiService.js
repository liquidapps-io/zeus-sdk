import { createClient } from "@liquidapps/dapp-client";
var endpoint = process.env.REACT_APP_EOS_HTTP_ENDPOINT;
var contract = process.env.REACT_APP_EOS_CONTRACT_NAME;
var client;
export const getClient = async() => {
  if (client)
    return client;
  client = await createClient({ network: "kylin", httpEndpoint: endpoint, fetch: window.fetch.bind(window) });
  return client;
};






class ApiService {



  static async register({ username, key }) {
    const service = await (await getClient()).service('vaccounts', contract);
    return new Promise((resolve, reject) => {
      localStorage.setItem('chess_account', username);
      localStorage.setItem('chess_key', key);
      service.push_liquid_account_transaction(
          contract,
          key,
          'regaccount', {
            vaccount: username,

          }
        ).then(() => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static async movepiece(move) {
    const service = await (await getClient()).service('vaccounts', contract);

    const privateKey = localStorage.getItem('chess_key');
    var account = localStorage.getItem('chess_account');
    var opponent = localStorage.getItem('chess_opponent');
    var isHost = localStorage.getItem('chess_ishost');

    var gameDataAccount = isHost == 'true' ? account : opponent;
    var opponentAccount = !(isHost == 'true') ? account : opponent;

    console.log("move", account, opponent, isHost, move, gameDataAccount, opponentAccount)
    const res = await service.push_liquid_account_transaction(
      contract,
      privateKey,
      'movepiece', {
        vaccount: account,
        gamehost: gameDataAccount,
        opponent: opponentAccount,
        move
      }
    );
    return res;
  }
  static async joingame(opponent) {
    const service = await (await getClient()).service('vaccounts', contract);

    const privateKey = localStorage.getItem('chess_key');
    var account = localStorage.getItem('chess_account');


    let res;
    try {
      res = await service.push_liquid_account_transaction(
        contract,
        privateKey,
        'joingame', {
          vaccount: account,
          opponent,
        }
      );
      localStorage.setItem('chess_opponent', opponent);

    }
    catch (e) {
      localStorage.setItem('chess_opponent', opponent);
      localStorage.removeItem('chess_account');
      localStorage.removeItem('chess_key');
      throw e;
    }
    return res;
  }

  static async quitgame() {
    const service = await (await getClient()).service('vaccounts', contract);

    const privateKey = localStorage.getItem('chess_key');
    var account = localStorage.getItem('chess_account');
    // var isHost = localStorage.getItem('chess_ishost');
    var opponent = localStorage.getItem('chess_opponent');
    if (!opponent)
      throw new Error('not in a game');
    // Main call to blockchain after setting action, account_name and data
    try {

      const res = await service.push_liquid_account_transaction(
        contract,
        privateKey,
        'quitgame', {
          vaccount: account,
          opponent,
        }
      );
      localStorage.removeItem('chess_ishost');
      localStorage.removeItem('chess_opponent');
      return res;
    }
    catch (err) {
      throw (err);
    }
  }
  static async getUserByName(username, opponent) {
    const client = await getClient();
    const service = await client.service('ipfs', contract);
    try {
      let existing = await service.get_vram_row(contract, contract, "games", username);


      localStorage.setItem('chess_ishost', true);



      return existing.row;
    }
    catch (err) {

      try {
        var existing = await service.get_vram_row(contract, contract, "games", opponent);
        if (existing.row) {
          if (existing.row.opponent !== username)
            throw new Error(`user ${opponent} already in a game`);

          localStorage.setItem('chess_ishost', false);
          return existing.row;

        }
      }
      catch (err) {
        localStorage.setItem('chess_ishost', true);
      }
      console.error(err);
    }
  }
  static async getCurrentUser() {
    // const privateKey = localStorage.getItem('chess_key');
    var account = localStorage.getItem('chess_account');
    // var isHost = localStorage.getItem('chess_ishost');
    var opponent = localStorage.getItem('chess_opponent');
    return this.getUserByName(account, opponent)

  }
}

export default ApiService;
