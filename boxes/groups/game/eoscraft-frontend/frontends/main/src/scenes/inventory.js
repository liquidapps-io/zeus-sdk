import Phaser from 'phaser';

export default class InventoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'inventory' });
    }

    preload() {}
    generateSlot(item, quantity, x, y) {
        const slot = this.add.image(0, 0, 'inventory_item');
        const material_image = this.add.image(0, 0, window.getResource('item', 'icon', item));
        material_image.scaleX = (slot.width - 6) / material_image.width;
        material_image.scaleY = (slot.height - 6) / material_image.height;

        const label = this.add.text(0, 0, quantity);
        label.setOrigin(0, 0);
        // label.x = slot.width - (label.width);
        label.x = -(label.width / 2);
        label.y = (label.height / 2) - 3;
        var this2 = this;
        slot.setInteractive();
        var name = window.getResource('item', 'name', item);
        slot.on('pointerover', function(pointer) {
            window.showTooltip(this2, name, slot, pointer.worldX, pointer.worldY);
        });
        slot.on('pointermove', function(pointer) {
            window.showTooltip(this2, name, slot, pointer.worldX, pointer.worldY);
        });
        slot.on('pointerout', function(pointer) {
            window.hideTooltip(this2);
        });
        const container = this.add.container(x, y, [slot, material_image, label]);
        return container;
    }
    populateInventory() {
        this.content.removeAll();
        var startY = 182;
        var startX = 57;
        var items = Object.keys(this.playerData.inventory);
        var realIdx = 0;
        for (var i = 0; i < items.length; i++) {
            var itemName = items[i];
            var quantity = this.playerData.inventory[itemName].item_count.count;
            console.log('populating ', this.playerData.inventory[itemName], this.gameData.items[itemName] && this.gameData.items[itemName].hidden);
            if (this.gameData.items[itemName] && this.gameData.items[itemName].hidden)
                continue;
            if (!(quantity > 0)) {
                continue;
            }
            var item = this.generateSlot(itemName, quantity, startX + (realIdx % 10) * 50, startY + parseInt(realIdx / 10) * 50);
            this.content.add(item);
            realIdx++;
        }
    }
    create() {
        var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
        this.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);
        this.gameData = window.fullGameData;
        var location = '1';
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

        const content = this.add.container(0, 0, []);
        // const label = this.add.text(0, 0, 'Inventory');
        const aWindow = this.add.image(0, 0, 'inventory_window');

        const container = this.add.container(0, 0, [
            aWindow,
            content
        ]);
        // label.x = -label.width * 0.5;
        // label.y = (-(aWindow.height * 0.5)) + 25;
        content.x = -(aWindow.width * 0.5);
        content.y = -(aWindow.height * 0.5);
        container.width = aWindow.width;
        container.height = aWindow.height;
        container.setSize(aWindow.width, aWindow.height);
        container.y = this.scene.systems.game.renderer.height * 0.5 + 15;
        container.x = this.scene.systems.game.renderer.width - (container.width * 0.5) - 30;
        // TODO: add pagination when needed
        this.content = content;
        this.populateInventory();
        window.placeOptionIcons(this, 60, 700);
    }

}
