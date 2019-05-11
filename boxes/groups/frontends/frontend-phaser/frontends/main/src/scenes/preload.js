import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'preload' });
  }

  preload() {
    this.loadAssets(this.cache.json.get('assets'));
    var this2 = this;
    var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";


    this.add.image(this.centerX(), this.centerY(), 'logo');
    this.createProgressbar(this.centerX(), this.centerY() + 200);
    this.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/loading.png), pointer`);
  }
  createProgressbar(x, y) {
    // size & position

    let height = 20;
    let yStart = y - height / 2;

    // border size
    let borderOffset = 2;

    let border = this.add.image(0, yStart, 'loading_empty');
    let progressbar = this.add.image(0, yStart, 'load_fill');

    // border.strokeRectShape(borderRect);

    progressbar.initialWidth = progressbar.width;
    border.initialWidth = border.width;
    let xStart = (this.scene.systems.game.renderer.width * 0.5);
    border.x = xStart;
    progressbar.x = xStart;
    // progressbar.width = 0;
    // border.width = 0;

    const shape = this.make.graphics();
    shape.x = progressbar.x;
    shape.y = progressbar.y;
    let rect = new Phaser.Geom.Rectangle(0, 0, 0, 0);
    shape.clear();
    shape.fillRectShape(rect);
    progressbar.mask = new Phaser.Display.Masks.GeometryMask(this, shape);
    /**
     * Updates the progress bar.
     *
     * @param {number} percentage
     */
    var scene = this;
    let updateProgressbar = function(percentage) {
      const shape = scene.make.graphics();
      shape.x = progressbar.x - progressbar.width / 2;
      shape.y = progressbar.y - progressbar.height / 2;
      // shape.clear();
      let rect = new Phaser.Geom.Rectangle(0, 0, percentage * 0.9 * border.width, border.height);
      shape.fillRectShape(rect);
      progressbar.mask = new Phaser.Display.Masks.GeometryMask(scene, shape);
    };

    this.load.on('progress', updateProgressbar);
    this.load.on('loaderror', (file) => {
      scene.loadError(file);
    });
    this.load.once('complete', function() {
      updateProgressbar(100);
      this.load.off('progress', updateProgressbar);
      this.scene.start('title');
    }, this);
  }
  loadError(file) {
    // var badKey = this.resDict[file];
    // console.log(file, badKey);
    window.failDict[file.key] = true;
  }

  loadAssets(json) {
    let baseUrl = json.base ? json.base : "";
    const b = (relative) => baseUrl + relative;
    Object.keys(json).forEach(function(group) {
      if (group == "base")
        return;
      Object.keys(json[group]).forEach(function(key) {
        let value = json[group][key];


        if (group === 'atlas' ||
          group === 'unityAtlas' ||
          group === 'bitmapFont' ||
          group === 'spritesheet' ||
          group === 'multiatlas') {
          // atlas:ƒ       (key, textureURL,  atlasURL,  textureXhrSettings, atlasXhrSettings)
          // unityAtlas:ƒ  (key, textureURL,  atlasURL,  textureXhrSettings, atlasXhrSettings)
          // bitmapFont ƒ  (key, textureURL,  xmlURL,    textureXhrSettings, xmlXhrSettings)
          // spritesheet:ƒ (key, url,         config,    xhrSettings)
          // multiatlas:ƒ  (key, textureURLs, atlasURLs, textureXhrSettings, atlasXhrSettings)
          this.load[group](key, value[0], value[1]);
        }
        else if (group === 'audio') {
          // do not add mp3 unless, you bought a license ;)
          // opus, webm and ogg are way better than mp3
          if (value['opus'] && this.sys.game.device.audio.opus) {
            this.load[group](key, b(value['opus']));
          }
          else if (value['webm'] && this.sys.game.device.audio.webm) {
            this.load[group](key, b(value['webm']));
          }
          else if (value['ogg'] && this.sys.game.device.audio.ogg) {
            this.load[group](key, b(value['ogg']));
          }
          else if (value['wav'] && this.sys.game.device.audio.wav) {
            this.load[group](key, b(value['wav']));
          }
          else if (value['mp3'] && this.sys.game.device.audio.mp3) {
            this.load[group](key, b(value['mp3']));
          }
        }
        else if (group === 'html') {
          // html:ƒ (key, url, width, height, xhrSettings)
          this.load[group](key, b(value[0]), value[1], value[2]);
        }
        else {
          // animation:ƒ (key, url, xhrSettings)
          // binary:ƒ (key, url, xhrSettings)
          // glsl:ƒ (key, url, xhrSettings)
          // image:ƒ (key, url, xhrSettings)
          // image:ƒ (key, [url, normal-url], xhrSettings)
          // json:ƒ (key, url, xhrSettings)
          // plugin:ƒ (key, url, xhrSettings)
          // script:ƒ (key, url, xhrSettings)
          // svg:ƒ (key, url, xhrSettings)
          // text:ƒ (key, url, xhrSettings)
          // tilemapCSV:ƒ (key, url, xhrSettings)
          // tilemapTiledJSON:ƒ (key, url, xhrSettings)
          // tilemapWeltmeister:ƒ (key, url, xhrSettings)
          // xml:ƒ (key, url, xhrSettings)
          this.load[group](key, b(value));
        }
      }, this);
    }, this);
  }

  centerX() {
    return this.sys.game.config.width / 2;
  }
  centerY() {
    return this.sys.game.config.height / 2;
  }
}
