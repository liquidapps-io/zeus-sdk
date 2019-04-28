import Phaser from 'phaser';
import { BigNumber } from 'bignumber.js';

const networks = [{
  name: 'Main Net SSL - for scatter over ssl',
  host: 'node2.liquideos.com',
  port: 443,
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
  secured: true,
  contractAccount: 'eoscraft'
},
{
  name: 'Jungle Testnet',
  host: 'dolphin.eosblocksmith.io',
  chainId: '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca',
  port: 8888,
  contractAccount: 'eoscraft'
},
{
  name: 'dev',
  host: 'node.eoscraft.online',
  chainId: 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f',
  port: 8888,
  contractAccount: 'eoscraft'
},
{
  name: 'jungle',
  host: 'dev.cryptolions.io',
  chainId: '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca',
  port: 18888,
  contractAccount: 'eoscraft'
}

];

const network = networks[3];

var config = {
  chainId: network.chainId, // 32 byte (64 char) hex string
  expireInSeconds: 60,
  broadcast: true,
  debug: true, // API and transactions
  sign: true
};
if (network.secured) {
  config.httpsEndpoint = 'https://' + network.host + ':' + network.port;
} else {
  config.httpEndpoint = 'http://' + network.host + ':' + network.port;
}

window.eosPublic = new Eos(config);

export default class TitleScene extends Phaser.Scene {
  constructor () {
    super({ key: 'title' });
  }

  preload () {}

  create () {

  }
  centerX () {
    return this.sys.game.config.width / 2;
  }
  centerY () {
    return this.sys.game.config.height / 2;
  }
}
