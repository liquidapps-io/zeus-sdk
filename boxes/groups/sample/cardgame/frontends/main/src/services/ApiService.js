const { createClient } = require("@liquidapps/dapp-client");
const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);

var endpoint = process.env.REACT_APP_EOS_HTTP_ENDPOINT;

const runTrx = async({
  contract_code,
  payload,
  wif
}) => {
  const service = await (await createClient({ network: 'private', httpEndpoint: endpoint, fetch: window.fetch.bind(window)})).service('vaccounts', contract_code); 
  if (!wif)
      wif = localStorage.getItem('cardgame_key') 
  return service.push_liquid_account_transaction(
    contract_code,
    wif,
    payload.name,
    payload.data.payload
  );
}
// Main action call to blockchain
async function takeAction(action, dataValue, waitForChange = true) {
  const privateKey = localStorage.getItem('cardgame_key');
  var account = localStorage.getItem('cardgame_account');
  let oldstate;
  try {
    oldstate = await postData(`${endpoint}/v1/dsp/ipfsservice1/get_table_row`, { contract: process.env.REACT_APP_EOS_CONTRACT_NAME, scope: process.env.REACT_APP_EOS_CONTRACT_NAME, table: 'users', key: account }); 
  } catch(e) {

  }

  // Main call to blockchain after setting action, account_name and data
  var res = await runTrx({
    contract_code: process.env.REACT_APP_EOS_CONTRACT_NAME,
    payload: {
      name: action,
      data: {
        payload: { ...dataValue, vaccount: account }
      }
    },
    wif: privateKey
  });
  if (action === 'regaccount')
    await delay(3000);
  if (waitForChange || !oldstate)
    return res;
  for (var i = 0; i < 20; i++) {
    const newstate = await postData(`${endpoint}/v1/dsp/ipfsservice1/get_table_row`, { contract: process.env.REACT_APP_EOS_CONTRACT_NAME, scope: process.env.REACT_APP_EOS_CONTRACT_NAME, table: 'users', key: account });
    if (JSON.stringify(newstate) !== JSON.stringify(oldstate))
      return res;
    await delay(80 * (i + 1));
  }
  return res;
}

function postData(url = ``, data = {}) {
  // Default options are marked with *
  return fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, cors, *same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        // "Content-Type": "application/json",
        // "Content-Type": "application/x-www-form-urlencoded",
      },
      redirect: 'follow', // manual, *follow, error
      referrer: 'no-referrer', // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    })
    .then(response => response.json()); // parses response to JSON
}

class ApiService {
  static getCurrentUser() {
    return new Promise((resolve, reject) => {
      if (!localStorage.getItem('cardgame_account')) {
        return reject();
      }
      takeAction('login', { username: localStorage.getItem('cardgame_account') }, false)
        .then(() => {
          resolve(localStorage.getItem('cardgame_account'));
        })
        .catch(err => {
          localStorage.removeItem('cardgame_account');
          localStorage.removeItem('cardgame_key');
          reject(err);
        });
    });
  }

  static login({ username, key }) {
    return new Promise((resolve, reject) => {
      localStorage.setItem('cardgame_account', username);
      localStorage.setItem('cardgame_key', key);
      takeAction('login', { username }, key)
        .then((res) => {
          if (res.result && res.result.processed)
            resolve();
          else
            throw new Error("wrong password");
        })
        .catch(err => {
          localStorage.removeItem('cardgame_account');
          localStorage.removeItem('cardgame_key');
          reject(err);
        });
    });
  }
  static register({ username, key }) {
    return new Promise((resolve, reject) => {
      localStorage.setItem('cardgame_account', username);
      localStorage.setItem('cardgame_key', key);
      takeAction('regaccount', { vaccount: username }, key)
        .then(() => {
          resolve();
        })
        .catch(err => {
          localStorage.removeItem('cardgame_account');
          localStorage.removeItem('cardgame_key');
          reject(err);
        });
    });
  }

  static startGame() {
    return takeAction('startgame', { username: localStorage.getItem('cardgame_account') });
  }

  static playCard(cardIdx) {
    return takeAction('playcard', { username: localStorage.getItem('cardgame_account'), player_card_idx: cardIdx });
  }

  static nextRound() {
    return takeAction('nextround', { username: localStorage.getItem('cardgame_account') });
  }

  static endGame() {
    return takeAction('endgame', { username: localStorage.getItem('cardgame_account') });
  }

  static async getUserByName(username) {
    try {
      const result = await postData(`${endpoint}/v1/dsp/ipfsservice1/get_table_row`, { contract: process.env.REACT_APP_EOS_CONTRACT_NAME, scope: process.env.REACT_APP_EOS_CONTRACT_NAME, table: 'users', key: username });
      return result.row;
    }
    catch (err) {
      console.error(err);
    }
  }
}

export default ApiService;
