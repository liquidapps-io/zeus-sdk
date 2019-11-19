import { getClient } from '../helpers/getClient';
import * as ecc from 'eosjs-ecc';
import * as ecies from 'standard-ecies';
const crypto = require('crypto');

const contract = process.env.REACT_APP_EOS_CONTRACT_NAME;

class ApiService {
  static encrypt(message) {
    let pubKey = ecc.privateToPublic(localStorage.getItem('user_key'));
    const pubBuffer = ecc.PublicKey(pubKey).toUncompressed().toBuffer();
    const messageBuffer = Buffer.from(message, 'utf8');
    const encryptedBuffer = ecies.encrypt(pubBuffer, messageBuffer);
    return encryptedBuffer;
  }
  
  static decrypt(encryptArr) {
    if(!encryptArr) return [];
    let decryptArr = [];
    for(let i = 0; i < encryptArr.length; i++) {
      const wif = localStorage.getItem('user_key');
      const ecdh = crypto.createECDH('secp256k1');
      const privBuffer = ecc.PrivateKey(wif).toBuffer();
      ecdh.setPrivateKey(privBuffer);
      let encryptBuffer = Buffer.from(encryptArr[i].toLowerCase(),'hex');
      decryptArr.push(ecies.decrypt(ecdh, encryptBuffer).toString());
    }
    return decryptArr;
  }
  
  static async register({ username, key }) {
    const service = await (await getClient()).service('vaccounts', contract);
    return new Promise((resolve, reject) => {
      localStorage.setItem('user_account', username);
      localStorage.setItem('user_key', key);
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

  static async login({ username, key }) {
    const service = await (await getClient()).service('vaccounts', contract);
    return new Promise((resolve, reject) => {
      localStorage.getItem('user_account');
      localStorage.getItem('user_key');
      service.push_liquid_account_transaction(
          contract,
          key,
          'login', {
            vaccount: username
          }
        ).then(() => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static async addaccount(btc, eth, eos) {
    const service = await (await getClient()).service('vaccounts', contract);
    var vaccount = localStorage.getItem('user_account');
    const privateKey = localStorage.getItem('user_key');
    return await service.push_liquid_account_transaction(contract,
      privateKey,
      'addaccount', {
        vaccount,
        btc: btc ? this.encrypt(btc): [],
        eth: eth ? this.encrypt(eth): [],
        eos: eos ? this.encrypt(eos): []
      });
  }

  static async fetchAccounts(username, thisObject) {
    const service = await (await getClient()).service('ipfs', contract);
    try {
      let res =  await service.get_vram_row(
        contract,
        contract,
        "users",
        username
      );
      thisObject.setState({ btcAddressArr: this.decrypt(res.row.btc), ethAddressArr: this.decrypt(res.row.eth), eosAddressArr: this.decrypt(res.row.eos) })
    } catch (e) {
      if(e.toString().indexOf("key not found") !== -1){
        thisObject.setState({ btcAddressArr: [], ethAddressArr: [], eosAddressArr: [] })
      }
      console.log(e);
    }
  }
}

export default ApiService;
