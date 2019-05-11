import Phaser from 'phaser';

export default class Preload2Scene extends Phaser.Scene
{
    constructor ()
    {
        super({key: 'preload2'});
    }

    preload ()
    {                
        // var gameData = this.cache.json.get('game');
        var this2 = this;
        this.scene.systems.game.getResource = (type, restype, key, fallback)=>{
            function pascal(s){
                return s.replace('_',' ').replace(/(\w)(\w*)/g,
                    function(g0,g1,g2){return g1.toUpperCase() + g2.toLowerCase();});                 
            }
            function itemName(dict,key){
                if(!dict[key]){
                    return key;
                }
                return pascal(dict[key].name || key);
            }
            function itemDesc(dict,key){
                if(!dict[key]){
                    return key;
                }
                return dict[key].description  || `[${itemName(dict,key)} description]`;
            }
            function itemMarker(dict,key){
                if(!dict[key]){
                    return 'mapicon_generic';
                }
                return dict[key].marker  || 'mapicon_generic';
            }
            var dict = window.fullGameData[`${type}s`];            
            if(restype === 'name')
                return itemName(dict, key);            
            if(restype === 'description')
                return itemDesc(dict, key);            
            // if(restype === 'marker')
                // return itemMarker(dict,key);


            function getPrefix(){
                var switchKey = `${type}_${restype}`;
                switch(switchKey){
                    case "location_music":
                        return `music_`;
                    case "location_background":
                        return `bg_`;
                    case "location_marker":
                        return `marker_`;
                    case "item_icon":
                        return `item_`;
                    case "recipe_icon":
                        return `crafticon_`;
                    case "item_sfx":
                        return `itemsfx_`;
                    case "recipe_sfx":
                        return `craft_`;
                    default:
                        return `${switchKey}_`;
                }            
            }
            var finalKey = `${getPrefix()}${key}`;
            if(window.failDict[finalKey]){
                fallback = fallback || `${getPrefix()}generic`;
                return fallback;
            }
            return finalKey;
        }

        window.getResource = this.scene.systems.game.getResource;
        this.loadMoreAssets(window.fullGameData);
        this.add.image(this.centerX(), this.centerY(), 'logo');
        this.createProgressbar(this.centerX(), this.centerY() + 200);
        this.input.setDefaultCursor('url(assets/image/cursors/loading.png), pointer');
    }    
    createProgressbar (x, y)
    {
        // size & position
        
        let height = 20;        
        let yStart = y - height / 2;

        // border size
        let borderOffset = 2;



        let border = this.add.image(0,yStart,'loading_empty');
        let progressbar = this.add.image(0,yStart,'load_fill');
        
        // border.strokeRectShape(borderRect);

        
        progressbar.initialWidth = progressbar.width;
        border.initialWidth = border.width;
        let xStart = (this.scene.systems.game.renderer.width * 0.5) ;
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
         var scene = this
        let updateProgressbar = function (percentage)
        {            
            const shape = scene.make.graphics();
            shape.x = progressbar.x - progressbar.width / 2;
            shape.y = progressbar.y - progressbar.height / 2;
            // shape.clear();            
            let rect = new Phaser.Geom.Rectangle(0, 0, percentage * 0.9 * border.width, border.height);
            shape.fillRectShape(rect);
            progressbar.mask = new Phaser.Display.Masks.GeometryMask(scene, shape);
            
        };

        this.load.on('progress', updateProgressbar);        
        this.load.on('loaderror', (file)=>{            

            scene.loadError(file);
        })
        this.load.once('complete', function ()
        {
            updateProgressbar(100);
            this.load.off('progress', updateProgressbar);
            this.scene.start('map');

        }, this);
    }
    loadError(file){
        // var badKey = this.resDict[file];
        // console.log(file, badKey);
        window.failDict[file.key] = true;
    }

    loadMoreAssets(json){
        // var locations = Object.keys(json.locations);
        var key;
        var file;
        // var resDict = {};
        // this.resDict = resDict;
        window.failDict = {};
        this.load.image(`map`, json.map_image );
        this.load.audio(`map`, json.map_music );

        function _setKV(akey,afile){
            key = akey;
            file = afile;
        }
        var locations = Object.keys(json.locations);
        for (var i = locations.length - 1; i >= 0; i--) {
            var location = locations[i];
            var locationData = json.locations[location];
            console.log("locationData",locationData);
            // load music
            this.load.audio(`music_${location}`, locationData.music);

            // load bg
            this.load.image(`bg_${location}`, locationData.background );

            this.load.image(`marker_${location}`, locationData.marker_icon );
        }
        var recipesList = Object.keys(json.recipes);
        for (var i = recipesList.length - 1; i >= 0; i--) {
            var recipesKey = recipesList[i];            
            var recipe = recipesKey;
            var recipeData = json.recipes[recipesKey];
            // load craft sfx            
            this.load.audio(`craft_${recipe}`, recipeData.sfx);
            this.load.image(`crafticon_${recipe}`, recipeData.icon);
            
        }        
        var itemList = Object.keys(json.items);
        for (var i = itemList.length - 1; i >= 0; i--) {
            var item = itemList[i];
            var itemData = json.items[item];
            // load item icon
            this.load.image(`item_${item}`, itemData.icon);            
            this.load.audio(`itemsfx_${item}`, itemData.sfx);
        }


    }

    centerX ()
    {
        return this.sys.game.config.width / 2;
    }
    centerY ()
    {
        return this.sys.game.config.height / 2;
    }
}
