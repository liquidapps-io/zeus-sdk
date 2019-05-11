import Phaser from 'phaser';

export default class CreditsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'credits' });
    }

    preload() {}

    create() {
        var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
        this.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);

        var location = '2';
        this.music = this.sound.add(window.getResource('location', 'music', location));
        if (!window.musicOff) {
            this.music.play({ loop: true });
            window.fadeIn(this, this.music);
        }
        window.currentMusic = this.music;
        this.playerData = window.playerData;

        const bg = this.add.image(0, 0, window.getResource('location', 'background', location));
        bg.scaleY = this.scene.systems.game.renderer.height / bg.height;
        bg.scaleX = this.scene.systems.game.renderer.height / bg.height;
        bg.y = bg.height * bg.scaleY * 0.5;
        bg.x = bg.width * bg.scaleX * 0.5;

        const back_to_map = this.add.image(0, 0, 'back_to_map');
        back_to_map.x = 60;
        back_to_map.y = 950;
        back_to_map.scaleX = 0.4;
        back_to_map.scaleY = 0.4;
        var theScene = this;
        back_to_map.setInteractive();
        back_to_map.on('pointerdown', function(pointer) {
            if (!window.sfxOff)
                theScene.sound.add('movemap').play({ loop: false });

            var scene = theScene;
            window.fadeOut(scene, theScene.music, () => {
                scene.scene.start('map');
            });

        });
        this.add.image(this.sys.game.config.width / 2, this.sys.game.config.height / 2 - 450, 'logo_credits');

        window.placeOptionIcons(this, 60, 700);
    }

}
