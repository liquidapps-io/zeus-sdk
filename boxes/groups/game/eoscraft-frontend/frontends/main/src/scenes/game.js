import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'game' });
    }

    preload() {}

    createWindow(location, content, handler) {

        const title = window.getResource('location', 'name', location);
        const label = this.add.text(0, 0, title);

        const aWindow = this.add.image(0, 0, 'window');
        const descLabel = this.make.text({
            x: (-(aWindow.width * 0.5)) + 32,
            y: (-(aWindow.height * 0.5)) + 150,
            text: window.getResource('location', 'description', location),
            origin: { x: 0.0, y: 0.0 },
            style: {
                font: '15px Arial',
                fill: 'white',
                wordWrap: { width: 505 }
            }
        });
        const bookContent = this.add.container(0, 0, []);
        const bookImage = this.add.image(0, 0, 'crafting_book');
        const book = this.add.container(0, 0, [
            bookImage,
            bookContent
        ]);
        const button = this.generateButton('Craft', 'button2', handler, false);
        const container = this.add.container(0, 0, [
            aWindow,
            label,
            descLabel,
            button,
            book,
            content
        ]);
        label.x = -label.width * 0.5;
        label.y = (-(aWindow.height * 0.5)) + 25;
        content.x = -(aWindow.width * 0.5);
        content.y = -(aWindow.height * 0.5);
        button.x = 0;
        button.y = 370;
        book.x = 0;
        book.y = 53;
        container.width = aWindow.width;
        container.height = aWindow.height;
        container.setSize(aWindow.width, aWindow.height);
        container.setDisabled = button.setDisabled;
        container.setButtonText = button.setText;
        this.bookContent = bookContent;
        this.bookContent.setSize(bookImage.width, bookImage.height);
        // container.setInteractive();
        // book.setInteractive();
        // this.bookContent.setInteractive();

        // bookImage.setInteractive();

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
    generateSlot(index, inRecipeInfo) {
        const slot_material = this.add.image(0, 0, 'slot_materials');
        const material_image = this.add.image(0, 0, 'slot_materials');
        const label = this.add.text(0, 0, '');
        if (inRecipeInfo) {
            slot_material.y = 185;
            slot_material.x = 20 + (index * (slot_material.width + 5));
        }
        else {
            slot_material.y = 765;
            slot_material.x = 67 + (index * (slot_material.width + 38));
        }
        material_image.x = slot_material.x;
        material_image.y = slot_material.y;
        const container = this.add.container(0, 0, [slot_material, material_image, label]);
        var this2 = this;
        container.setItem = (item, needed, have, isTool) => {
            container.item = item;

            var name = window.getResource('item', 'name', item);
            container.name = name;
            material_image.setTexture(window.getResource('item', 'icon', item));
            material_image.scaleY = 1 / ((material_image.height) / (slot_material.height - 10));
            material_image.scaleX = 1 / ((material_image.width) / (slot_material.width - 10));
            let textColor = '#ff2222'; // red (missing)
            if (inRecipeInfo) {
                label.setText(needed);
                textColor = '#ffffff';
            }
            else if (isTool) {
                if (have > 0) {
                    // paint in red
                    label.setText(`Have`);
                    textColor = '#ffdf00';
                }
                else {
                    // paint in yello or gold
                    label.setText(`Missing`);
                }
            }
            else {
                label.setText(`${have}/${needed}`);
                if (have < needed) {
                    // paint in red                    
                }
                else {
                    textColor = '#ffffff';
                    // paint in white
                }
            }
            label.setStyle({ fill: textColor });
            label.x = slot_material.x - (label.width / 2);
            label.y = slot_material.y + (slot_material.height / 2) + (inRecipeInfo ? (-label.height - 3) : 2);

            if (item === '') {
                label.setVisible(false);
                material_image.setVisible(false);
                slot_material.setVisible(false);
            }
            else {
                label.setVisible(true);
                material_image.setVisible(true);
                slot_material.setVisible(true);
            }
        };
        slot_material.setInteractive();

        slot_material.on('pointerover', function(pointer) {

            window.showTooltip(this2, container.name, slot_material, pointer.worldX, pointer.worldY);
        });
        slot_material.on('pointermove', function(pointer) {
            window.showTooltip(this2, container.name, slot_material, pointer.worldX, pointer.worldY);
        });
        slot_material.on('pointerout', function(pointer) {
            window.hideTooltip(this2);
        });
        return container;
    }
    updateInventory(item, quantity) {
        if (window.playerData.inventory[item] === undefined) {
            window.playerData.inventory[item] = { item_count: { item, count: 0 } };
        }
        window.playerData.inventory[item].item_count.count += quantity;
    }
    craft(recipe) {
        const recipeData = this.gameData.recipes[recipe];
        this.craftWindow.setDisabled(true);
        this.back_to_map.disabled = true;

        var this2 = this;
        var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
        this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/crafting.png), pointer`);
        this2.input.mousePointer.dirty = true;
        var actionText = recipeData.act_label_ing || "Crafting";
        this2.craftWindow.setButtonText(`${actionText}...`);

        function done() {
            this2.back_to_map.disabled = false;
            this2.craftWindow.setDisabled(false);
            this2.refreshRecipes(true);
            this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);

            this2.input.mousePointer.dirty = true;
        }
        async function onSuccess() {
            // reflect in ui
            // TODO: add to inventory cache
            if (recipeData.cooldownSeconds) {
                window.playerData.cooldowns[recipe] = { item: item, count: new Date().getTime() + (recipeData.cooldownSeconds * 1000) };
            }

            function randomPos(range) {
                var x = parseInt(Math.random() * range);
                var y = parseInt(Math.random() * range);
                return { x, y };
            }
            const outputs = Object.keys(recipeData.outputs);
            const inputs = Object.keys(recipeData.ingreds);
            var outputsForSfx = outputs.filter(o => {
                return !(this2.gameData.items[item] && this2.gameData.items[item].hidden);
            })
            if (outputsForSfx.length) {
                const primaryOutput = outputsForSfx[0];
                if (!window.sfxOff)
                    this2.sound.add(window.getResource('item', 'sfx', primaryOutput)).play({ loop: false });
            }
            var c = 0;
            for (var i = 0; i < outputs.length; i++) {
                var item = outputs[i];
                this2.updateInventory(item, recipeData.outputs[item].count);
                if (this2.gameData.items[item] && this2.gameData.items[item].hidden)
                    continue;
                setTimeout((item) => {
                    var pos = randomPos(400);
                    window.floatingNotificationItem(this2, item, recipeData.outputs[item].count, 300 + pos.x, 300 + pos.y);
                }, ++c * 400, item);
            }
            for (var i = 0; i < inputs.length; i++) {
                var item = inputs[i];
                this2.updateInventory(item, -recipeData.ingreds[item].count);
                if (this2.gameData.items[item] && this2.gameData.items[item].hidden)
                    continue;
                setTimeout((item) => {
                    var pos = randomPos(400);
                    window.floatingNotificationItem(this2, item, -recipeData.ingreds[item].count, 300 + pos.x, 300 + pos.y);
                }, ++c * 400, item);
            }
            // floating +1 indication
            await window.refreshInventory();
            done()
        }

        function onFailure() {
            // reflect in ui            
            if (!window.sfxOff)
                this2.sound.add(window.getResource('recipe', 'sfx', 'failed')).play({ loop: false });
            done()
        }
        // TODO: loader
        if (!window.sfxOff)
            this2.sound.add(window.getResource('recipe', 'sfx', recipe)).play({ loop: false });
        if (window.isDebug) {
            // simulate succes
            // delay and progress bar
            setTimeout(onSuccess, 300);
            // onSuccess();
            return
        }

        scatter.mainContract.gameact({ the_recipe: recipe, owner: window.eosAccount }, { authorization: window.eosAccount }).then(res => {
            onSuccess();
        }).catch(error => {
            // error sound
            onFailure()

        });
    }
    onEvent() {
        this.timedEvent = null;
        this.refreshRecipes(true);
    }
    updateRecipe(recipeKey, recipe, select) {
        let missingItems = false;
        let disableButton = false;
        var items = Object.keys(recipe.ingreds);
        var i = 0;
        var lastI = 6;
        var name = window.getResource('recipe', 'name', recipeKey);
        // TODO: remove cooldown message
        if (select) {
            this.craftWindow.setButtonText(recipe.act_label || 'Craft');
            this.recipeInfo.removeAll();

            const label = this.add.text(0, 0, name);
            const outputLabel = this.add.text(0, 0, 'Gives:');
            const descLabel = this.make.text({
                y: 210,
                text: window.getResource('recipe', 'description', recipeKey),
                origin: { x: 0.0, y: 0.0 },
                style: {
                    font: '14px Arial',
                    fill: 'white',
                    wordWrap: { width: 215 }
                }
            });

            var outputs = Object.keys(recipe.outputs);
            const icon = this.add.image(0, label.height, window.getResource('recipe', 'icon', recipeKey, outputs.length && window.getResource('item', 'icon', outputs[0])));
            icon.scaleX = 128 / icon.width;
            icon.scaleY = 128 / icon.height;
            label.setOrigin(0, 0);
            descLabel.setOrigin(0, 0);
            outputLabel.setOrigin(0, 0)
            outputLabel.y = label.height + 130;

            label.x = 105 - label.width / 2;
            icon.setOrigin(0, 0);
            icon.x = 105 - 128 / 2;
            this.recipeInfo.add(icon);
            this.recipeInfo.add(label);
            this.recipeInfo.add(outputLabel);
            this.recipeInfo.add(descLabel);

            var outputs = Object.keys(recipe.outputs);
            var j = 0;
            for (i = 0; i < outputs.length; i++) {
                var output = outputs[i];
                if (this.gameData.items[output] && this.gameData.items[output].hidden)
                    continue;
                const slot_material = this.generateSlot(j, true);
                slot_material.setItem(output, recipe.outputs[output].count);
                this.recipeInfo.add(slot_material);
                j++;
            }
        }
        var cooldownItem = window.playerData.cooldowns.find(a => a.item === recipeKey)
        if (cooldownItem) {
            var now = new Date().getTime();
            if (now < cooldownItem.count) {
                disableButton = true;
                if (select) {
                    var timeLeft = (window.playerData.cooldown[recipeKey] - now) / 1000;
                    this.craftWindow.setButtonText(`${timeLeft} seconds cooldown`);
                }
            }
        }
        var currIdx = 0;
        for (i = 0; i < 6; i++) {
            if (select)
                this.slots[i].setItem('', 0, 0, false);
            if (i >= items.length) {
                if (lastI == 6)
                    lastI = i;
                continue;
            }
            var itemKey = items[i];
            var itemValue = recipe.ingreds[itemKey].count;
            var item = itemKey;

            let have = window.playerData.inventory[item] ? window.playerData.inventory[item].item_count.count : 0;
            let need = itemValue;
            if (need > have)
                missingItems = true;
            if (this.gameData.items[itemKey] && this.gameData.items[itemKey].hidden)
                continue;
            if (select)
                this.slots[currIdx].setItem(item, need, have, false);
            currIdx++;
        }
        currIdx = (i - 1);
        var idx = 0;
        for (var j = i - 1; j >= lastI; j--) {

            if (!recipe.tools)
                break;
            if (idx >= recipe.tools.length)
                break;
            var item = recipe.tools[idx];

            // console.log("window.playerData.inventory",window.playerData.inventory);
            let have = window.playerData.inventory[item] ? window.playerData.inventory[item].item_count.count : 0;
            let need = 1;
            if (need > have)
                missingItems = true;
            if (this.gameData.items[item] && this.gameData.items[item].hidden)
                continue;
            if (select)
                this.slots[currIdx].setItem(item, need, have, true);
            idx++;
            currIdx--;
        }
        if (disableButton && select) {
            this.craftWindow.setButtonText(`Come back in ${parseInt(timeLeft)} seconds`);
            if (!this.timedEvent) {
                this.timedEvent = this.time.addEvent({ delay: 500, callback: this.onEvent, callbackScope: this, repeat: 0 });
            }
        }
        if (select) {
            if (missingItems) {
                this.craftWindow.setButtonText('Missing Items');
            }
            this.deselectAll();
            this.craftWindow.setDisabled(missingItems || disableButton);
        }

        return missingItems;
    }
    generateRecipeListItem(recipeKey) {
        const recipe = this.gameData.recipes[recipeKey];

        var missingItems = this.updateRecipe(recipeKey, recipe, false);
        var missingTools = false;
        for (var i = 0; i < (recipe.tools || []).length; i++) {
            var tools = recipe.tools[i];
            if (!(window.playerData.inventory[tools] && window.playerData.inventory[tools].item_count.count > 0)) {
                return { show: false };
            }
        }
        const name = window.getResource('recipe', 'name', recipeKey);
        const label = this.add.text(0, 0, name);
        label.setStyle({ fill: missingItems ? '#ff0000' : '#ffffff' });
        const entry_highlight = this.add.image(0, 0, 'entry_highlight');
        var outputs = Object.keys(recipe.outputs);
        const icon = this.add.image(0, 0, window.getResource('recipe', 'icon', recipeKey, outputs.length && window.getResource('item', 'icon', outputs[0])));
        entry_highlight.setOrigin(0, 0);
        label.setOrigin(0, 0);
        icon.setOrigin(0, 0);
        icon.x = 5;
        // icon.y = 5;

        label.x = entry_highlight.height + 10;
        label.y = 5;
        icon.scaleY = entry_highlight.height / icon.height;
        icon.scaleX = entry_highlight.height / icon.height;
        const content = this.add.container(0, 0, [icon, entry_highlight, label]);
        var this2 = this;

        function onClick(pointer) {
            this2.updateRecipe(recipeKey, recipe, true);
            content.setHighlighted(true);
        }
        content.height = entry_highlight.height;
        content.width = entry_highlight.width;
        content.setSize(entry_highlight.width, entry_highlight.height);
        content.setInteractive();
        // label.setInteractive();
        entry_highlight.setInteractive();
        // shape.setInteractive();
        // entry_highlight.on('pointerdown', function (pointer) {
        //     console.log("entry_highlight");
        // });
        // buttonTest.on('pointerdown', onClick);
        // content.on('pointerdown', onClick);
        // label.on('pointerdown', onClick);
        entry_highlight.on('pointerdown', onClick);
        // shape.on('pointerdown', onClick);

        content.setHighlighted = (highlighted) => {
            const level = highlighted ? 1.0 : 0.01;
            if (highlighted) {
                this2.selected = recipeKey;
            }
            entry_highlight.setAlpha(level);
        }


        content.setHighlighted(false);

        return { newItem: content, show: !missingTools };
    }
    refreshRecipes(keepSelected) {
        this.bookContent.removeAll()
        this.recipeItems = [];
        var prevSelected = this.selected;
        const recipeKeys = Object.keys(this.gameData.recipes);
        var firstValid = true;
        var validItems = 0;
        var deferRefresh = false;
        for (var i = 0; i < recipeKeys.length; i++) {

            const recipeKey = recipeKeys[i];
            const recipe = this.gameData.recipes[recipeKey];
            // populate in ui    
            if (recipe.locations.indexOf(parseInt(this.location)) === -1) {
                continue;
            }
            var { newItem, show } = this.generateRecipeListItem(recipeKey);
            if (show) {
                newItem.x = -233;
                newItem.y = -155 + (validItems * (newItem.height + 5));
                validItems++;
                this.bookContent.add(newItem);
                this.recipeItems.push(newItem);
            }
            else {
                if (prevSelected == recipeKey && keepSelected) {
                    deferRefresh = true;
                }
            }
            if (keepSelected) {
                if (prevSelected == recipeKey) {
                    this.updateRecipe(recipeKey, recipe, true);
                    if (newItem)
                        newItem.setHighlighted(true);
                }
            }
            else if (firstValid) {
                this.updateRecipe(recipeKey, recipe, true);
                if (newItem) {
                    newItem.setHighlighted(true);
                    firstValid = false;
                }
            }
        }
        if (deferRefresh)
            this.refreshRecipes(false);
    }
    create(location) {
        this.timedEvent = null;
        var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
        this.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);
        this.location = location;
        this.gameData = window.fullGameData;
        var music = this.sound.add(window.getResource('location', 'music', location));
        this.music = music;
        if (!window.musicOff) {
            music.play({ loop: true });
            window.fadeIn(this, this.music);

        }
        window.currentMusic = this.music;

        const bg = this.add.image(0, 0, window.getResource('location', 'background', location));
        bg.scaleY = this.scene.systems.game.renderer.height / bg.height;
        bg.scaleX = this.scene.systems.game.renderer.height / bg.height;
        // var ratio = 1920 / 1079;
        // bg.height = Math.min(bg.height, this.scene.systems.game.renderer.width);
        // bg.width = Math.min(bg.width, this.scene.systems.game.renderer.width);    
        bg.y = bg.height * bg.scaleY * 0.5;
        bg.x = bg.width * bg.scaleX * 0.5;
        // bg.setInteractive();
        var theScene = this;

        this.slots = [];


        for (var i = 0; i < 6; i++) {
            const slot_material = this.generateSlot(i);
            this.slots.push(slot_material);
        }

        const content = this.add.container(0, 0, [...this.slots]);

        const craftWindow = this.createWindow(location, content, () => {
            var recipe = theScene.selected;
            theScene.craft(recipe, craftWindow);
        });
        this.recipeInfo = this.add.container(0, 0, []);
        this.recipeInfo.x = 297;
        this.recipeInfo.y = 360;
        content.add(this.recipeInfo);
        craftWindow.y = this.scene.systems.game.renderer.height * 0.5 + 15;
        craftWindow.x = this.scene.systems.game.renderer.width - (craftWindow.width * 0.5) - 30;
        this.craftWindow = craftWindow;
        this.refreshRecipes();
        const back_to_map = this.add.image(0, 0, 'back_to_map');
        back_to_map.x = 60;
        back_to_map.y = 950;
        back_to_map.scaleX = 0.4;
        back_to_map.scaleY = 0.4;
        back_to_map.disabled = false;
        back_to_map.setInteractive();
        back_to_map.on('pointerdown', function(pointer) {
            if (back_to_map.disabled)
                return;
            if (!window.sfxOff)
                theScene.sound.add('movemap').play({ loop: false });

            var scene = theScene;
            window.fadeOut(scene, theScene.music, () => {
                scene.scene.start('map');
            });

        });
        this.back_to_map = back_to_map;

        window.placeOptionIcons(this, 60, 700);
    }
    deselectAll() {
        for (var i = 0; i < this.recipeItems.length; i++) {
            const item = this.recipeItems[i];
            item.setHighlighted(false);
        }

    }

}
