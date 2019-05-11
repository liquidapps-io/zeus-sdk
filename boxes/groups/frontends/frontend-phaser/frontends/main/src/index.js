import Phaser from 'phaser';
import BootScene from './scenes/boot';
import PreloadScene from './scenes/preload';

import TitleScreen from './scenes/title';
import Preload2Scene from './scenes/preload2';

import GameScreen from './scenes/game';
import MapScreen from './scenes/map';
import MarketScreen from './scenes/market';
import InventoryScreen from './scenes/inventory';
import CreditsScreen from './scenes/credits';

var ratio = 1920 / 1079;
var height = window.innerHeight;
var width = window.innerWidth - 50;
width = 1920; // Math.min(width,1920);
height = 1079; // width / ratio;
var config = { type: Phaser.WEBGL, scene: [BootScene, PreloadScene, TitleScreen, Preload2Scene, GameScreen, MapScreen, MarketScreen, InventoryScreen, CreditsScreen], width, height };

window.addEventListener('load', () => {
  window.musicOff = window.localStorage.getItem('musicOff') == 'true';
  window.sfxOff = window.localStorage.getItem('sfxOff') == 'true';
  document.getElementById('loading').setAttribute('style', 'display: none;');
  window.game = new Phaser.Game(config);
});

window.toggleMusic = () => {
  window.musicOff = !window.musicOff;
  if (window.currentMusic) {
    if (window.musicOff) { window.currentMusic.stop(); }
    else {
      window.currentMusic.play({ loop: true });
    }
  }
  window.localStorage.setItem('musicOff', window.musicOff);
};
window.toggleSfx = () => {
  window.sfxOff = !window.sfxOff;
  window.localStorage.setItem('sfxOff', window.sfxOff);
};

window.fadeIn = (scene, music) => {
  // scene.tweens.add({
  // 	targets: music,
  // 	volume: {
  // 	  getStart: function () {
  // 	    return 0;
  // 	  },
  // 	  getEnd: function () {
  // 	    return 1;
  // 	  }
  // 	} ,
  // 	duration: 100,
  // 	ease: 'Linear'
  // });
};

window.fadeOut = (scene, music, cb) => {
  // var tween = scene.tweens.add({
  // 	targets: music,
  // 	volume: {
  // 	  getStart: function () {
  // 	    return 1;
  // 	  },
  // 	  getEnd: function () {
  // 	    return 0;
  // 	  }
  // 	} ,
  // 	duration: 50,
  // 	ease: 'Linear'
  // });
  // tween.setCallback('onComplete',cb,{},[]);
  music.stop();
  cb();
};
window.placeOptionIcons = (scene, x, y) => {
  const sfxIcon = scene.add.image(0, 0, window.sfxOff ? 'exit' : 'check_mark');
  sfxIcon.scaleY = 64 / sfxIcon.height;
  sfxIcon.scaleX = 64 / sfxIcon.height;

  const musicIcon = scene.add.image(0, 0, window.musicOff ? 'exit' : 'check_mark');
  musicIcon.scaleY = 64 / musicIcon.height;
  musicIcon.scaleX = 64 / musicIcon.height;
  musicIcon.y = 100;
  musicIcon.setOrigin(0.5, 0);
  sfxIcon.setOrigin(0.5, 0);
  const labelSfx = scene.add.text(0, 0, 'SFX');
  const labelMusic = scene.add.text(0, 0, 'Music');
  labelMusic.y = musicIcon.y + 62;
  labelMusic.x = 2;
  labelMusic.setOrigin(0.5, 0);
  labelSfx.y = sfxIcon.y + 62;
  labelSfx.x = 2;
  labelSfx.setOrigin(0.5, 0);
  sfxIcon.setInteractive();
  musicIcon.setInteractive();
  const content = scene.add.container(0, 0, [sfxIcon, labelSfx, musicIcon, labelMusic]);
  musicIcon.on('pointerdown', function(pointer) {
    window.toggleMusic();
    musicIcon.setTexture(window.musicOff ? 'exit' : 'check_mark');
  });
  sfxIcon.on('pointerdown', function(pointer) {
    window.toggleSfx();
    sfxIcon.setTexture(window.sfxOff ? 'exit' : 'check_mark');
  });

  content.x = x;
  content.y = y;
  return content;
};
window.addEventListener('resize', () => {});

window.hideTooltip = (scene) => {
  if (scene.tweenObj) {
    scene.tweenObj.stop();
  }
  const tweenObj = scene.tweens.add({
    alpha: 0,
    targets: scene.tooltip,
    duration: 10
  });
  scene.lastTooltip = '';
};
window.moveTooltip = (scene, item, x, y) => {
  // var x = item.getWorldTransformMatrix().tx;
  // var y = item.getWorldTransformMatrix().ty;
  scene.tooltip.x = x + 32;
  scene.tooltip.y = y + 32;
};
window.showTooltip = (scene, text, item, x, y) => {
  if (item === scene.lastTooltip) {
    window.moveTooltip(scene, item, x, y);
    return;
  }
  scene.lastTooltip = item;
  if (scene.tweenObj) {
    scene.tweenObj.stop();
  }
  var _padding = 10;
  scene.tooltipContent = scene.add.text(_padding / 2, _padding / 2, text);
  var tooltipContent = scene.tooltipContent;
  scene.tooltipBG = scene.add.graphics(tooltipContent.width, tooltipContent.height / 2);
  var tooltipBG = scene.tooltipBG;
  scene.tooltipBG.defaultFillColor = 0x000000;
  scene.tooltipBG.x = 0;
  scene.tooltipBG.y = 0;
  scene.tooltipBG.lineStyle(2, 0xffffff, 1);
  scene.tooltipBG.setAlpha(0.5);

  // if roundedCornersRadius option is set to 1, drawRect will be used.

  tooltipBG.fillRect(0, 0, tooltipContent.width + _padding, tooltipContent.height + _padding, 1);

  scene.tooltip = scene.add.container();
  scene.tooltip.add(tooltipBG);
  scene.tooltip.add(tooltipContent);
  scene.tooltip.setAlpha(0);

  scene.tweenObj = scene.tweens.add({
    alpha: 1,
    duration: 100,
    targets: scene.tooltip
  });
  window.moveTooltip(scene, item, x, y);
};

window.floatingNotificationItem = (scene, item, count, x, y) => {
  const content = scene.add.container();
  var negative = count < 0;

  if (count > 0) { count = '+' + count; }
  const label = scene.add.text(0, 0, count);
  label.setStyle({ fill: negative ? '#ff0000' : '#ffffff' });

  content.add(label);
  const icon = scene.add.image(0, 0, window.getResource('item', 'icon', item));
  icon.scaleY = 32 / icon.height;
  icon.scaleX = 32 / icon.height;
  icon.x = label.width * 2;
  icon.y = 0;
  icon.setOrigin(0.5, 0);
  label.y = 16 - (label.height / 2);

  content.add(icon);
  content.width = icon.x + label.width;
  content.height = 32;
  window.floatingNotification(scene, content, x, y);
};
window.floatingNotification = (scene, content, x, y) => {
  var _padding = 10;
  scene.tooltipContent = content;
  var tooltipContent = scene.tooltipContent;
  tooltipContent.x = _padding;
  tooltipContent.y = _padding / 2;
  scene.tooltipBG = scene.add.graphics(tooltipContent.width, tooltipContent.height / 2);
  var tooltipBG = scene.tooltipBG;
  scene.tooltipBG.defaultFillColor = 0x000000;
  scene.tooltipBG.x = 0;
  scene.tooltipBG.y = 0;
  scene.tooltipBG.lineStyle(2, 0xffffff, 1);
  scene.tooltipBG.setAlpha(0.2);

  // if roundedCornersRadius option is set to 1, drawRect will be used.

  tooltipBG.fillRect(0, 0, tooltipContent.width + _padding, tooltipContent.height + _padding, 1);

  var t = scene.add.container();
  t.add(tooltipBG);
  t.add(tooltipContent);
  t.x = x;
  t.y = y;
  t.setAlpha(0);

  scene.tweens.add({
    alpha: 1,
    repeat: 0,
    yoyo: true,
    duration: 800,
    ease: 'Power2',
    targets: t
  });
  scene.tweens.add({
    y: y - 100,
    repeat: 0,
    yoyo: true,
    duration: 800,
    ease: 'Power2',
    targets: t
  });
};
