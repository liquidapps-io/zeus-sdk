import Phaser from 'phaser';
var slippage = 0.1;
export default class MarketScene extends Phaser.Scene {
    constructor() {
        super({ key: 'market' });
    }


    preload() {}
    getItemPrice(item) {
        return this.gameData.market[item] ? this.gameData.market[item](this.quantity) : 0
    }
    getItemBuyPrice(item) {
        return parseInt(this.getItemPrice(item));
    }
    getItemSellPrice(item) {
        return parseInt(this.getItemPrice(item));
    }
    selectMarketItem(item) {
        // populate price - red if not enough money
        var price = this.getItemBuyPrice(item);
        // enable buy button if have enough money
        this.selectedBuy = item;
        this.marketSlots[item].selectItem();
        this.buttonBuy.setDisabled(!this.haveMoney(price));
        this.buttonBuy.setText(`Buy (${price}) ->`)

        this.setMoneyLabelMarket(price, this.haveMoney(price));
    }
    selectInventoryItem(item) {
        // populate price
        var price = this.getItemSellPrice(item);
        this.selectedSell = item;
        // enable sell button
        if (this.inventorySlots[item]) {
            this.inventorySlots[item].selectItem();
            this.buttonSell.setText(`<- Sell (${price == 0 ? 'no buyer' : price})`);
            this.buttonSell.setDisabled(price == 0 || !(this.playerData.inventory[item] && this.playerData.inventory[item].item_count.count >= this.quantity));
        }
        else {
            this.buttonSell.setText(`<- Sell (${price})`)
            this.buttonSell.setDisabled(true)
        }

    }
    haveMoney(price) {
        return this.playerData.currencies.coins >= price;

    }
    playItemSfx(item) {
        if (!window.sfxOff)
            this.sound.add(window.getResource('item', 'sfx', item)).play({ loop: false });
    }
    sellItem(item) {
        this.buttonSell.setDisabled(true);
        var price = this.getItemSellPrice(item);
        var this2 = this;
        var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
        this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/defaultloading.png), pointer`);
        this2.input.mousePointer.dirty = true;

        function done() {
            this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);
            this2.input.mousePointer.dirty = true;
            // item sound
            this2.populateInventory();
            this2.populateMarket();
        }

        function onFailure() {
            // reflect in ui            
            if (!window.sfxOff)
                this2.sound.add(`craft_failed`).play({ loop: false });
            done()
        }
        async function onSuccess() {
            this2.playerData.currencies.coins += price;
            this2.updateInventory(item, -this2.quantity);
            // item sound
            this2.playItemSfx(item);
            await window.refreshInventory();
            done();
        }
        // sell sound
        if (!window.sfxOff)
            this2.sound.add(`sell`).play({ loop: false });
        if (window.isDebug) {
            setTimeout(onSuccess, 300);
        }
        else {
            scatter.mainContract.sell({ owner: window.eosAccount, items: { item: item, count: this2.quantity } }, { authorization: window.eosAccount }).then(res => {
                onSuccess();
            }).catch(error => {
                // error sound
                onFailure()
            });
        }
    }
    buyItem(item) {
        var price = this.getItemBuyPrice(item);

        this.buttonBuy.setDisabled(true);
        var this2 = this;
        var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
        this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/defaultloading.png), pointer`);
        this2.input.mousePointer.dirty = true;

        function done() {
            this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);
            this2.input.mousePointer.dirty = true;
            this2.populateInventory();
            this2.populateMarket();
        }
        async function onSuccess() {
            this2.playerData.currencies.coins -= price;
            this2.updateInventory(item, this2.quantity);
            // item sound
            this2.playItemSfx(item);
            await window.refreshInventory();
            done();
        }

        function onFailure() {
            // reflect in ui            
            if (!window.sfxOff)
                this2.sound.add(`craft_failed`).play({ loop: false });
            done()
        }
        if (!window.sfxOff)
            this2.sound.add(`buy`).play({ loop: false });

        // buy sound
        if (window.isDebug) {
            setTimeout(onSuccess, 300);
        }
        else {
            scatter.mainContract.buy({ owner: window.eosAccount, items: { item: item, count: this2.quantity } }, { authorization: window.eosAccount }).then(res => {
                onSuccess();
            }).catch(error => {
                // error sound
                onFailure()
            });
        }
    }
    updateInventory(item, quantity) {
        if (window.playerData.inventory[item] === undefined) {
            window.playerData.inventory[item] = { item_count: { item, count: 0 } };
        }
        window.playerData.inventory[item].item_count.count += quantity;
    }
    generateMarketSlot(item, x, y) {
        const slot = this.add.image(0, 0, 'inventory_item');
        const material_image = this.add.image(0, 0, window.getResource('item', 'icon', item));
        material_image.scaleX = (slot.width - 6) / material_image.width;
        material_image.scaleY = (slot.height - 6) / material_image.height;
        const container = this.add.container(x, y, [slot, material_image]);
        // var price = this.getItemBuyPrice(item);
        slot.setInteractive();
        var this2 = this;

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

        slot.on('pointerdown', function(pointer) {
            window.hideTooltip(this2);
            for (var j = this2.buttonQ.length - 1; j >= 0; j--) {
                var isSelected = j == 0;
                this2.quantity = 1;

                this2.buttonQ[j].setSelected(isSelected);
            }
            this2.selectMarketItem(item);
        });
        container.selectItem = () => {
            var itemKeys = Object.keys(this.marketSlots)
            for (var i = 0; i < itemKeys.length; i++) {
                var key = itemKeys[i];
                var itemContainer = this.marketSlots[key];
                itemContainer.setSelected(key === item);
            }
        }
        container.setSelected = (enabled) => {
            slot.setAlpha(enabled ? 1.0 : 0.1);
        }
        container.setSelected(false);
        return container;
    }
    generateButton(text, style, handler, enabled) {
        var buttonImage;
        if (enabled)
            buttonImage = this.add.image(0, 0, style + '_n');
        else
            buttonImage = this.add.image(0, 0, style + '_d');
        buttonImage.y = (buttonImage.height * 0.5);
        // buttonImage.x =  (buttonImage.width * 0.5);
        var buttonText = this.add.text(0, 0, text);
        buttonText.y = (buttonImage.height * 0.5) - (buttonText.height * 0.5);
        buttonText.x = -(buttonText.width * 0.5);
        var button = this.add.container(0, 0, [buttonImage, buttonText]);
        button.setInteractive();
        button.height = buttonImage.height;
        button.width = buttonImage.width;
        buttonImage.setInteractive();
        button.disabled = !enabled;
        var theScene = this;
        button.setDisabled = (isDisabled) => {
            button.disabled = isDisabled;
            buttonImage.setTexture(style + (isDisabled ? "_d" : '_n'));
            // button.setInteractive(!isDisabled);
        }
        button.setText = (text) => {
            buttonText.setText(text);
            buttonText.x = -(buttonText.width * 0.5);
        };
        buttonImage.on('pointerdown', function(pointer) {
            if (!button.disabled) {
                buttonImage.setTexture(style + '_a');
                handler(pointer, button);
            }
        });
        buttonImage.on('pointerover', function(pointer) {
            if (!button.disabled)
                buttonImage.setTexture(style + '_h');

        });
        buttonImage.on('pointerout', function(pointer) {
            if (!button.disabled)
                buttonImage.setTexture(style + '_n');

        });

        buttonImage.on('pointerup', function(pointer) {
            if (!button.disabled)
                buttonImage.setTexture(style + '_h');

        });

        return button;
    }

    generateQButton(text, handler, enabled) {
        var buttonImage;
        var style = "buttonQ";
        buttonImage = this.add.image(0, 0, style + '_n');
        buttonImage.y = (buttonImage.height * 0.5);
        // buttonImage.x =  (buttonImage.width * 0.5);
        var buttonText = this.add.text(0, 0, text);
        buttonText.y = (buttonImage.height * 0.5) - (buttonText.height * 0.5);
        buttonText.x = -(buttonText.width * 0.5);
        var button = this.add.container(0, 0, [buttonImage, buttonText]);
        button.setInteractive();
        button.height = buttonImage.height;
        button.width = buttonImage.width;
        buttonImage.setInteractive();
        button.disabled = !enabled;
        var theScene = this;
        button.setText = (text) => {
            buttonText.setText(text);
            buttonText.x = -(buttonText.width * 0.5);
        };
        button.setSelected = (selected) => {
            if (selected) {
                buttonImage.setTexture(style + '_s');
                if (theScene.selectedBuy)
                    theScene.selectMarketItem(theScene.selectedBuy);
                if (theScene.selectedSell)
                    theScene.selectInventoryItem(theScene.selectedSell);
            }
            else {
                buttonImage.setTexture(style + '_n');
            }
        };

        buttonImage.on('pointerdown', function(pointer) {
            buttonImage.setTexture(style + '_a');
            handler(pointer, button);
        });
        buttonImage.on('pointerover', function(pointer) {
            buttonImage.setTexture(style + '_h');

        });
        buttonImage.on('pointerout', function(pointer) {
            buttonImage.setTexture(style + '_n');

        });

        buttonImage.on('pointerup', function(pointer) {
            buttonImage.setTexture(style + '_h');

        });

        return button;
    }

    populateMarket() {
        this.marketSlots = {};
        this.contentMarket.removeAll();
        var startY = 182;
        var startX = 57;
        var items = Object.keys(this.gameData.market);
        var realIdx = 0;
        for (var i = 0; i < items.length; i++) {
            var itemName = items[i];
            var item = this.generateMarketSlot(itemName, startX + (realIdx % 10) * 50, startY + parseInt(realIdx / 10) * 50);
            this.contentMarket.add(item);
            this.marketSlots[itemName] = item;
            realIdx++;
        }
        if (this.selectedBuy) {
            this.selectMarketItem(this.selectedBuy);
        }

    }
    generateSlot(item, quantity, x, y) {
        const slot = this.add.image(0, 0, 'inventory_item');
        slot.setAlpha(0.4);

        const material_image = this.add.image(0, 0, `item_${item}`);
        material_image.scaleX = (slot.width - 6) / material_image.width;
        material_image.scaleY = (slot.height - 6) / material_image.height;
        var this2 = this;
        const label = this.add.text(0, 0, quantity);
        label.setOrigin(0, 0);
        // label.x = slot.width - (label.width);
        label.x = -(label.width / 2);
        label.y = (label.height / 2) - 3;
        const container = this.add.container(x, y, [slot, material_image, label]);
        slot.setInteractive();
        // var price = this.getItemSellPrice(item);
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
        slot.on('pointerdown', function(pointer) {
            for (var j = this2.buttonQ.length - 1; j >= 0; j--) {
                var isSelected = j == 0;
                this2.quantity = 1;
                this2.buttonQ[j].setSelected(isSelected);
            }

            this2.selectInventoryItem(item);
        });
        container.selectItem = () => {
            var itemKeys = Object.keys(this.inventorySlots)
            for (var i = 0; i < itemKeys.length; i++) {
                var key = itemKeys[i];
                var itemContainer = this.inventorySlots[key];
                itemContainer.setSelected(key === item);
            }
        }
        container.setSelected = (enabled) => {
            slot.setAlpha(enabled ? 1.0 : 0.1);
        }
        container.setSelected(false);
        return container;
    }
    populateInventory() {

        this.inventorySlots = {};
        this.content.removeAll();
        var startY = 182;
        var startX = 57;
        var items = Object.keys(this.playerData.inventory);
        var realIdx = 0;
        for (var i = 0; i < items.length; i++) {
            var itemName = items[i];
            var quantity = this.playerData.inventory[itemName].item_count.count
            if (!(quantity > 0)) {
                continue;
            }
            if (this.gameData.items[itemName] && this.gameData.items[itemName].hidden)
                continue;

            var item = this.generateSlot(itemName, quantity, startX + (realIdx % 10) * 50, startY + parseInt(realIdx / 10) * 50);
            this.content.add(item);
            this.inventorySlots[itemName] = item;
            realIdx++;
        }
        if (this.selectedSell) {
            this.selectInventoryItem(this.selectedSell);
        }
        this.setMoneyLabelInventory(this.playerData.currencies.coins);
    }
    setMoneyLabelMarket(num, valid) {
        this.moneyLabelMarket.setText(num);
        this.moneyLabelMarket.x = -55 - (this.moneyLabelMarket.width);
        this.moneyLabelMarket.y = 352;
        this.moneyLabelMarket.setStyle({ fill: valid ? "#ffffff" : "#ff1111" });
    }
    setMoneyLabelInventory(num) {
        this.moneyLabelInventory.setText(num);
        this.moneyLabelInventory.x = -55 - (this.moneyLabelInventory.width);
        this.moneyLabelInventory.y = 352;
    }
    create() {
        var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
        this.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);
        this.gameData = window.fullGameData;
        var location = '0';
        this.music = this.sound.add(window.getResource('location', 'music', location));
        this.playerData = window.playerData;
        if (!window.musicOff) {
            this.music.play({ loop: true });
            window.fadeIn(this, this.music);
        }
        window.currentMusic = this.music;
        this.quantity = 1;
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

        const contentMarket = this.add.container(0, 0, []);
        const aWindowMarket = this.add.image(0, 0, 'market_window');
        this.moneyLabelMarket = this.add.text(0, 0, '');
        const containerMarket = this.add.container(0, 0, [
            aWindowMarket,
            contentMarket,
            this.moneyLabelMarket
        ]);
        // label.x = -label.width * 0.5;
        // label.y = (-(aWindow.height * 0.5)) + 25;
        contentMarket.x = -(aWindowMarket.width * 0.5);
        contentMarket.y = -(aWindowMarket.height * 0.5);

        containerMarket.width = aWindowMarket.width;
        containerMarket.height = aWindowMarket.height;
        containerMarket.setSize(aWindowMarket.width, aWindowMarket.height);
        containerMarket.y = this.scene.systems.game.renderer.height * 0.5 + 15;
        containerMarket.x = (containerMarket.width * 0.5) + 430;
        // TODO: add pagination when needed
        this.contentMarket = contentMarket;


        const content = this.add.container(0, 0, []);
        this.moneyLabelInventory = this.add.text(0, 0, '');
        const aWindow = this.add.image(0, 0, 'inventory_window');
        const container = this.add.container(0, 0, [
            aWindow,
            content,
            this.moneyLabelInventory
        ]);

        content.x = -(aWindow.width * 0.5);
        content.y = -(aWindow.height * 0.5);
        container.width = aWindow.width;
        container.height = aWindow.height;
        container.setSize(aWindow.width, aWindow.height);
        container.y = this.scene.systems.game.renderer.height * 0.5 + 15;
        container.x = this.scene.systems.game.renderer.width - (container.width * 0.5) - 30;
        // TODO: add pagination when needed
        this.content = content;

        this.buttonQ = [];
        var this2 = this;
        var quantities = [1, 5, 10, 20, 50, 100];
        for (var i = quantities.length - 1; i >= 0; i--) {
            let quantity = quantities[i];
            let newQ = this.generateQButton(quantity, (pos, button) => {
                this2.quantity = quantity;
                for (var j = this2.buttonQ.length - 1; j >= 0; j--) {
                    var isSelected = button == this2.buttonQ[j];
                    this2.buttonQ[j].setSelected(isSelected);
                }
            }, false);
            newQ.q = quantity;
            newQ.y = 400;
            newQ.x = -130 + ((containerMarket.x + container.x) / 2 + (containerMarket.width - container.width) / 4) + i * 50;
            this.buttonQ.push(newQ);
        }

        this.buttonSell = this.generateButton('<- Sell', 'button2', () => {
            this.sellItem(this.selectedSell);
        }, false);
        this.buttonBuy = this.generateButton('Buy ->', 'button2', () => {
            this.buyItem(this.selectedBuy);
        }, false);

        this.buttonSell.x = (containerMarket.x + container.x) / 2 + (containerMarket.width - container.width) / 4;
        this.buttonSell.y = 500;
        this.buttonBuy.x = this.buttonSell.x;
        this.buttonBuy.y = 600;




        this.populateInventory();
        this.populateMarket();
        this.setMoneyLabelMarket(0);
        window.placeOptionIcons(this, 60, 700);
    }

}
