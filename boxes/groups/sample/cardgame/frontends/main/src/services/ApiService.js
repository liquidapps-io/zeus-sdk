const eosjs2 = require('../eosjs2');
const { JsonRpc, JsSignatureProvider, Api } = eosjs2;
const ecc = require('eosjs-ecc')
const { BigNumber } = require('bignumber.js');
var Eos = require('eosjs');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);

let { PrivateKey, PublicKey, Signature, Aes, key_utils, config } = require('eosjs-ecc')
var endpoint = process.env.REACT_APP_EOS_HTTP_ENDPOINT;
var url = endpoint;
const postVirtualTx = ({
  contract_code,
  payload,
  wif
}, signature) => {
  if (!signature)
    signature = ecc.sign(Buffer.from(payload, 'hex'), wif);
  const public_key = PrivateKey.fromString(wif).toPublic().toString()
  return postData(`${endpoint}/v1/dsp/accountless1/push_action`, {
    contract_code,
    public_key,
    payload,
    signature
  });
}
const toBound = (numStr, bytes) =>
  `${(new Array(bytes*2+1).join('0') + numStr).substring(numStr.length).toUpperCase()}`;

const rpc = new JsonRpc(url, { fetch });

const runTrx = async({
  contract_code,
  payload,
  wif
}) => {
  const signatureProvider = new JsSignatureProvider([]);
  const api = new Api({
    rpc,
    signatureProvider,
    // chainId:"",
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
  });




  const options = {
    authorization: `${contract_code}@active`, //@active for activeKey, @owner for Owner key
    //default authorizations will be calculated.
    broadcast: false,
    sign: true,
    forceActionDataHex: true
  };

  // const transaction = await eosvram.transaction({
  //     actions: [{
  //         account: contract_code,
  //         name: payload.name,
  //         authorization: [{
  //             actor: contract_code,
  //             permission: 'active'
  //         }],
  //         data: payload.data
  //     }]
  // }, options);
  // const data = transaction.transaction.transaction;
  const response = await api.serializeActions([{
    account: contract_code,
    name: payload.name,
    authorization: [],
    data: payload.data
  }]);
  const toName = (name) => {
    var res = new BigNumber(Eos.modules.format.encodeName(name, true));
    res = (toBound(res.toString(16), 8));
    return res;
  }
  var datasize = toBound(new BigNumber(response[0].data.length / 2).toString(16), 1).match(/.{2}/g).reverse().join('');
  var payloadSerialized = "0000000000000000" + toName(payload.name) + "01" + "00000000000000000000000000000000" + datasize + response[0].data;
  return await postVirtualTx({
    contract_code,
    wif,
    payload: payloadSerialized
  });
}
// Main action call to blockchain
async function takeAction(action, dataValue, waitForChange = true) {
  const privateKey = localStorage.getItem('cardgame_key');
  var account = localStorage.getItem('cardgame_account');
  // Main call to blockchain after setting action, account_name and data
  try {
    const oldstate = await postData(`${endpoint}/v1/dsp/ipfsservice1/get_table_row`, { contract: process.env.REACT_APP_EOS_CONTRACT_NAME, scope: process.env.REACT_APP_EOS_CONTRACT_NAME, table: 'users', key: account });
    var res = await runTrx({
      contract_code: process.env.REACT_APP_EOS_CONTRACT_NAME,
      payload: {
        name: action,
        data: {
          payload: dataValue
        }
      },
      wif: privateKey
    });
    if (!waitForChange) return res;
    for (var i = 0; i < 20; i++) {
      const newstate = await postData(`${endpoint}/v1/dsp/ipfsservice1/get_table_row`, { contract: process.env.REACT_APP_EOS_CONTRACT_NAME, scope: process.env.REACT_APP_EOS_CONTRACT_NAME, table: 'users', key: account });
      if (JSON.stringify(newstate) !== JSON.stringify(oldstate))
        return res;
      await delay(80 * (i + 1));
    }
    return res;
  }
  catch (err) {
    throw (err);
  }
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
      takeAction('login', { username }, false)
        .then((res) => {
          if (res.code == 500)
            throw new Error("wrong password");
          resolve();
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
      takeAction('regaccount', { vaccount: username }, false)
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
