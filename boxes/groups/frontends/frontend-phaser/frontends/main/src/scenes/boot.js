import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }
  preload() {
    // load all files necessary for the loading screen
    this.load.json('assets', 'assets/json/assets.json');
    var baseUrl = "";
    this.load.image('logo', baseUrl + 'assets/image/logo.png');
    this.load.image('loading_empty', baseUrl + 'assets/image/loading_empty.png');
    this.load.image('load_fill', baseUrl + 'assets/image/load_fill.png');
    this.load.image('desert_background', baseUrl + 'assets/image/desert_background.png');
    this.load.image('darker', baseUrl + 'assets/image/darker.png');
  }
  create() {

    this.scene.start('preload');
  }
}
