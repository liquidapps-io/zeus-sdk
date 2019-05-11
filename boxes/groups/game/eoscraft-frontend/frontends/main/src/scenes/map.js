import Phaser from 'phaser';

export default class MapScene extends Phaser.Scene {
	constructor() {
		super({ key: 'map' });
	}

	preload() {}

	navigate(location) {
		var scene = this;
		if (!window.sfxOff)
			scene.sound.add('move').play({ loop: false });
		window.fadeOut(scene, this.music, () => {
			switch (location) {
				case '0':
					scene.scene.start('market');
					break;
				case '1':
					scene.scene.start('inventory');
					break;
				case '2':
					scene.scene.start('credits');
					break;
				default:
					scene.scene.start('game', location);
					break;
			}
		});
	}
	create() {
		var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
		this.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/map.png), pointer`);
		this.gameData = window.fullGameData;
		this.music = this.sound.add('map');
		if (!window.musicOff) {
			this.music.play({ loop: true });
			// this.music.volume =0;
			window.fadeIn(this, this.music);

		}
		window.currentMusic = this.music;

		const mapImage = this.add.image(0, 0, 'map');

		const logo = this.add.image(0, 0, 'eoscraft');
		logo.x = 180;
		logo.y = 60;
		logo.scaleY = 0.4;
		logo.scaleX = 0.4;
		// mapImage.scaleY = window.innerWidth / mapImage.width;
		// mapImage.scaleX = window.innerWidth / mapImage.width;
		// var ratio = 1920 / 1079;
		// mapImage.height = Math.min(mapImage.height, window.innerHeight);
		// mapImage.width = Math.min(mapImage.width, window.innerWidth);

		mapImage.y = mapImage.height * 0.5;
		mapImage.x = mapImage.width * 0.5;
		// mapImage.setInteractive();
		var this2 = this;
		var locationsData = this.gameData.locations;
		var locations = Object.keys(this.gameData.locations);
		var markers = [];
		for (var i = 0; i < locations.length; i++) {
			var locationKey = locations[i];
			var location = this.gameData.locations[locationKey];
			var okReqs = true;
			if (location.reqs && location.reqs.length) {
				okReqs = false;
				for (var j = 0; j < location.reqs.length; j++) {
					var req = location.reqs[j];
					if (window.playerData.inventory[req] && window.playerData.inventory[req].item_count.count > 0) {
						okReqs = true;
						break;
					}
				}
				if (!okReqs) {
					continue;
				}
			}
			var marker = this.add.image(location.position.x, location.position.y, window.getResource('location', 'marker', locationKey));
			marker.key = locationKey;
			marker.on('pointerdown', function(pointer) {
				this2.navigate(this.key);
			});
			marker.on('pointerover', function(pointer) {
				var name = window.getResource('location', 'name', this.key);
				window.showTooltip(this2, name, marker, pointer.worldX, pointer.worldY);
			});
			marker.on('pointermove', function(pointer) {
				var name = window.getResource('location', 'name', this.key);
				window.showTooltip(this2, name.key, marker, pointer.worldX, pointer.worldY);
			});
			marker.on('pointerout', function(pointer) {
				window.hideTooltip(this2);
			});
			var origScale = 64 / marker.width;
			if (locationKey === '2')
				origScale *= 0.5;
			marker.scaleX = origScale;
			marker.scaleY = origScale;
			marker.setInteractive();
			markers.push(marker);
			if (locationKey !== '2')
				this.tweens.add({
					targets: marker,
					scaleX: origScale / 2,
					scaleY: origScale / 2,
					duration: 1000,
					ease: 'Power2',
					repeat: -1,
					yoyo: true,
					repeatDelay: 200
				});
		}

		window.placeOptionIcons(this, 100, 850);
	}

}
