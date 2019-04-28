import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor () {
    super({ key: 'boot' });
  }

  preload () {
    // load all files necessary for the loading screen
    this.load.json('assets', 'assets/json/assets.json');
  }

  create () {
    this.scene.start('preload');
  }
}
