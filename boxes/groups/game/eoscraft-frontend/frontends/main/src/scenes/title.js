import Phaser from 'phaser';
import { BigNumber } from 'bignumber.js';
import ScatterJS from 'scatterjs-core';
import ScatterEOS from 'scatterjs-plugin-eosjs2';
import { JsonRpc, Api } from 'eosjs'

const networks = [{
    name: 'Main Net SSL - for scatter over ssl',
    host: 'node2.liquideos.com',
    port: 443,
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    secured: true,
    contractAccount: 'eoscraft'
  },
  {
    name: 'Jungle Testnet',
    host: 'dolphin.eosblocksmith.io',
    chainId: '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca',
    port: 8888,
    contractAccount: 'eoscraftcore'
  },
  {
    name: 'dev',
    host: 'node.eoscraft.online',
    chainId: 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f',
    port: 8888,
    contractAccount: 'eoscraftcore'
  },
  {
    chainId: '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191',
    host: 'kylin-dsp-1.liquidapps.io',
    port: 443,
    secured: true,
    contractAccount: 'eoscraftcore'
  }

];



ScatterJS.plugins(new ScatterEOS());

const network = networks[3];
const defaultData = {
  "owner": "eoscraftcore",
  "default_packages": [
    0
  ],
  "default_inventory": [{
    "item": 1,
    "count": 1
  }],
  "map_image": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/homeland.png",
  "map_music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/map.mp3",
  "items": {
    "0": {
      "pkey": 0,
      "owner": "eoscraftcore",
      "name": "Coin",
      "description": "",
      "package": 0,
      "hidden": 1,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/starting_token.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/starting_token.png"
    },
    "1": {
      "pkey": 1,
      "owner": "eoscraftcore",
      "name": "Starting Token",
      "description": "",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/starting_token.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/starting_token.png"
    },
    "2": {
      "pkey": 2,
      "owner": "eoscraftcore",
      "name": "Wood Log",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/wood_log.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/wood_log.png"
    },
    "3": {
      "pkey": 3,
      "owner": "eoscraftcore",
      "name": "Saw",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/saw.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/saw.png"
    },
    "4": {
      "pkey": 4,
      "owner": "eoscraftcore",
      "name": "Wood",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/wood.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/wood.png"
    },
    "5": {
      "pkey": 5,
      "owner": "eoscraftcore",
      "name": "Welcome Scroll",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/welcome_scroll.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/welcome_scroll.png"
    },
    "6": {
      "pkey": 6,
      "owner": "eoscraftcore",
      "name": "Raw Iron",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/raw_iron.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/raw_iron.png"
    },
    "7": {
      "pkey": 7,
      "owner": "eoscraftcore",
      "name": "Pickaxe",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/pickaxe.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/pickaxe.png"
    },
    "8": {
      "pkey": 8,
      "owner": "eoscraftcore",
      "name": "Iron Ingot",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/iron_ingot.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/iron_ingot.png"
    },
    "9": {
      "pkey": 9,
      "owner": "eoscraftcore",
      "name": "Castle Key",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/castle_key.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/castle_key.png"
    },
    "10": {
      "pkey": 10,
      "owner": "eoscraftcore",
      "name": "Wagon",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/wagon.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/wagon.png"
    },
    "11": {
      "pkey": 11,
      "owner": "eoscraftcore",
      "name": "Wheel",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/wheel.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/wheel.png"
    },
    "12": {
      "pkey": 12,
      "owner": "eoscraftcore",
      "name": "Spinning Wheel",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/spinning_wheel.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/spinning_wheel.png"
    },
    "13": {
      "pkey": 13,
      "owner": "eoscraftcore",
      "name": "Clay",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/clay.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/clay.png"
    },
    "14": {
      "pkey": 14,
      "owner": "eoscraftcore",
      "name": "Clay Brick",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/clay_brick.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/clay_brick.png"
    },
    "15": {
      "pkey": 15,
      "owner": "eoscraftcore",
      "name": "Grinder",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/grinder.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/grinder.png"
    },
    "16": {
      "pkey": 16,
      "owner": "eoscraftcore",
      "name": "Stone",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/stone.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/stone.png"
    },
    "17": {
      "pkey": 17,
      "owner": "eoscraftcore",
      "name": "Plant Fiber",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/plant_fiber.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/plant_fiber.png"
    },
    "18": {
      "pkey": 18,
      "owner": "eoscraftcore",
      "name": "Medishrub",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/medishrub.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/medishrub.png"
    },
    "19": {
      "pkey": 19,
      "owner": "eoscraftcore",
      "name": "Manashroom",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/manashroom.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/manashroom.png"
    },
    "20": {
      "pkey": 20,
      "owner": "eoscraftcore",
      "name": "Stone Brick",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/stone_brick.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/stone_brick.png"
    },
    "21": {
      "pkey": 21,
      "owner": "eoscraftcore",
      "name": "Castle Access",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 1,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/castle_access.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/castle_access.png"
    },
    "22": {
      "pkey": 22,
      "owner": "eoscraftcore",
      "name": "Grindstone",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/grindstone.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/grindstone.png"
    },
    "23": {
      "pkey": 23,
      "owner": "eoscraftcore",
      "name": "Rope",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/rope.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/rope.png"
    },
    "24": {
      "pkey": 24,
      "owner": "eoscraftcore",
      "name": "Slingshot",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/slingshot.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/slingshot.png"
    },
    "25": {
      "pkey": 25,
      "owner": "eoscraftcore",
      "name": "Fishing Rod",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/fishing_rod.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/fishing_rod.png"
    },
    "26": {
      "pkey": 26,
      "owner": "eoscraftcore",
      "name": "Healing Potion",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/healing_potion.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/healing_potion.png"
    },
    "27": {
      "pkey": 27,
      "owner": "eoscraftcore",
      "name": "Healing Powder",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/healing_powder.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/healing_powder.png"
    },
    "28": {
      "pkey": 28,
      "owner": "eoscraftcore",
      "name": "Fish",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/fish.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/fish.png"
    },
    "29": {
      "pkey": 29,
      "owner": "eoscraftcore",
      "name": "Fish Meat",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/fish_meat.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/fish_meat.png"
    },
    "30": {
      "pkey": 30,
      "owner": "eoscraftcore",
      "name": "Rabbit",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/rabbit.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/rabbit.png"
    },
    "31": {
      "pkey": 31,
      "owner": "eoscraftcore",
      "name": "Rabbit Meat",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/rabbit_meat.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/rabbit_meat.png"
    },
    "32": {
      "pkey": 32,
      "owner": "eoscraftcore",
      "name": "Deer",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/deer.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/deer.png"
    },
    "33": {
      "pkey": 33,
      "owner": "eoscraftcore",
      "name": "Deer Meat",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/deer_meat.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/deer_meat.png"
    },
    "34": {
      "pkey": 34,
      "owner": "eoscraftcore",
      "name": "Chicken",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/chicken.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/chicken.png"
    },
    "35": {
      "pkey": 35,
      "owner": "eoscraftcore",
      "name": "Chicken Meat",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/chicken_meat.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/chicken_meat.png"
    },
    "36": {
      "pkey": 36,
      "owner": "eoscraftcore",
      "name": "Egg",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/egg.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/egg.png"
    },
    "37": {
      "pkey": 37,
      "owner": "eoscraftcore",
      "name": "Cow",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/cow.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/cow.png"
    },
    "38": {
      "pkey": 38,
      "owner": "eoscraftcore",
      "name": "Cow Meat",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/cow_meat.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/cow_meat.png"
    },
    "39": {
      "pkey": 39,
      "owner": "eoscraftcore",
      "name": "Milk",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/milk.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/milk.png"
    },
    "40": {
      "pkey": 40,
      "owner": "eoscraftcore",
      "name": "Fur",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/fur.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/fur.png"
    },
    "41": {
      "pkey": 41,
      "owner": "eoscraftcore",
      "name": "Knife",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/knife.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/knife.png"
    },
    "42": {
      "pkey": 42,
      "owner": "eoscraftcore",
      "name": "Coal",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/coal.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/coal.png"
    },
    "43": {
      "pkey": 43,
      "owner": "eoscraftcore",
      "name": "Raw Copper",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/raw_copper.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/raw_copper.png"
    },
    "44": {
      "pkey": 44,
      "owner": "eoscraftcore",
      "name": "Raw Gold",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/raw_gold.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/raw_gold.png"
    },
    "45": {
      "pkey": 45,
      "owner": "eoscraftcore",
      "name": "Gold Ingot",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/gold_ingot.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/gold_ingot.png"
    },
    "46": {
      "pkey": 46,
      "owner": "eoscraftcore",
      "name": "Copper Ingot",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/copper_ingot.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/copper_ingot.png"
    },
    "47": {
      "pkey": 47,
      "owner": "eoscraftcore",
      "name": "Bow",
      "description": "Loerm ipsum",
      "package": 0,
      "hidden": 0,
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/items/bow.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/bow.png"
    }
  },
  "recipes": {
    "0": {
      "pkey": 0,
      "owner": "eoscraftcore",
      "name": "Welcome",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "3": {
          "item": 3,
          "count": 1
        },
        "5": {
          "item": 5,
          "count": 1
        }
      },
      "ingreds": {
        "1": {
          "item": 1,
          "count": 1
        }
      },
      "tools": [],
      "locations": [
        3
      ],
      "act_label": "Welcome",
      "act_label_ing": "Welcoming",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/welcome.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/crafting/welcome.png",
      "cooldown": 0
    },
    "1": {
      "pkey": 1,
      "owner": "eoscraftcore",
      "name": "Cut Wood",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "2": {
          "item": 2,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        3
      ],
      "locations": [
        4
      ],
      "act_label": "Cut",
      "act_label_ing": "Cutting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/cut_wood.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/saw.png",
      "cooldown": 5
    },
    "2": {
      "pkey": 2,
      "owner": "eoscraftcore",
      "name": "Hunt Rabbit",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "30": {
          "item": 30,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        24
      ],
      "locations": [
        4
      ],
      "act_label": "Hunt",
      "act_label_ing": "Hunting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/rabbit.png",
      "cooldown": 30
    },
    "3": {
      "pkey": 3,
      "owner": "eoscraftcore",
      "name": "Hunt Deer",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "32": {
          "item": 32,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        47
      ],
      "locations": [
        4
      ],
      "act_label": "Hunt",
      "act_label_ing": "Hunting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/deer.png",
      "cooldown": 30
    },
    "4": {
      "pkey": 4,
      "owner": "eoscraftcore",
      "name": "Mine Iron",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "6": {
          "item": 6,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        7
      ],
      "locations": [
        9
      ],
      "act_label": "Mine",
      "act_label_ing": "Mining",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/mine_iron.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/raw_iron.png",
      "cooldown": 5
    },
    "5": {
      "pkey": 5,
      "owner": "eoscraftcore",
      "name": "Mine Coal",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "42": {
          "item": 42,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        7,
        21,
        10
      ],
      "locations": [
        9
      ],
      "act_label": "Mine",
      "act_label_ing": "Mining",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/mine_coal.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/coal.png",
      "cooldown": 30
    },
    "6": {
      "pkey": 6,
      "owner": "eoscraftcore",
      "name": "Mine Gold",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "44": {
          "item": 44,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        7,
        21,
        10
      ],
      "locations": [
        9
      ],
      "act_label": "Mine",
      "act_label_ing": "Mining",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/mine_gold.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/raw_gold.png",
      "cooldown": 300
    },
    "7": {
      "pkey": 7,
      "owner": "eoscraftcore",
      "name": "Mine Copper",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "43": {
          "item": 43,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        7,
        21,
        10
      ],
      "locations": [
        9
      ],
      "act_label": "Mine",
      "act_label_ing": "Mining",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/mine_copper.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/raw_copper.png",
      "cooldown": 65
    },
    "8": {
      "pkey": 8,
      "owner": "eoscraftcore",
      "name": "Mine Clay",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "14": {
          "item": 14,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        7,
        21,
        10
      ],
      "locations": [
        9
      ],
      "act_label": "Mine",
      "act_label_ing": "Mining",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/mine_clay.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/clay.png",
      "cooldown": 65
    },
    "9": {
      "pkey": 9,
      "owner": "eoscraftcore",
      "name": "Chop Wood",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "4": {
          "item": 4,
          "count": 2
        }
      },
      "ingreds": {
        "2": {
          "item": 2,
          "count": 1
        }
      },
      "tools": [
        3
      ],
      "locations": [
        5
      ],
      "act_label": "Chop",
      "act_label_ing": "Chopping",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/chop_wood.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/wood.png",
      "cooldown": 0
    },
    "10": {
      "pkey": 10,
      "owner": "eoscraftcore",
      "name": "Forge Iron",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "8": {
          "item": 8,
          "count": 1
        }
      },
      "ingreds": {
        "6": {
          "item": 6,
          "count": 1
        }
      },
      "tools": [],
      "locations": [
        5
      ],
      "act_label": "Forge",
      "act_label_ing": "Forging",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/forge_iron.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/iron_ingot.png",
      "cooldown": 0
    },
    "11": {
      "pkey": 11,
      "owner": "eoscraftcore",
      "name": "Forge Gold",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "45": {
          "item": 45,
          "count": 1
        }
      },
      "ingreds": {
        "44": {
          "item": 44,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        5
      ],
      "act_label": "Forge",
      "act_label_ing": "Forging",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/forge_iron.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/gold_ingot.png",
      "cooldown": 0
    },
    "12": {
      "pkey": 12,
      "owner": "eoscraftcore",
      "name": "Forge Copper",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "46": {
          "item": 46,
          "count": 1
        }
      },
      "ingreds": {
        "43": {
          "item": 43,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        5
      ],
      "act_label": "Forge",
      "act_label_ing": "Forging",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/forge_iron.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/copper_ingot.png",
      "cooldown": 0
    },
    "13": {
      "pkey": 13,
      "owner": "eoscraftcore",
      "name": "Rope",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "23": {
          "item": 23,
          "count": 1
        }
      },
      "ingreds": {
        "17": {
          "item": 17,
          "count": 2
        }
      },
      "tools": [
        12,
        21
      ],
      "locations": [
        5
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/rope.png",
      "cooldown": 0
    },
    "14": {
      "pkey": 14,
      "owner": "eoscraftcore",
      "name": "Slingshot",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "24": {
          "item": 24,
          "count": 1
        }
      },
      "ingreds": {
        "16": {
          "item": 16,
          "count": 2
        },
        "23": {
          "item": 23,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        5
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/slingshot.png",
      "cooldown": 0
    },
    "15": {
      "pkey": 15,
      "owner": "eoscraftcore",
      "name": "Fishing Rod",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "25": {
          "item": 25,
          "count": 1
        }
      },
      "ingreds": {
        "4": {
          "item": 4,
          "count": 1
        },
        "23": {
          "item": 23,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        5
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/fishing_rod.png",
      "cooldown": 0
    },
    "16": {
      "pkey": 16,
      "owner": "eoscraftcore",
      "name": "Healing Powder",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "27": {
          "item": 27,
          "count": 1
        }
      },
      "ingreds": {
        "18": {
          "item": 18,
          "count": 2
        }
      },
      "tools": [
        15
      ],
      "locations": [
        5
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/healing_powder.png",
      "cooldown": 0
    },
    "17": {
      "pkey": 17,
      "owner": "eoscraftcore",
      "name": "Healing Potion",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "26": {
          "item": 26,
          "count": 1
        }
      },
      "ingreds": {
        "27": {
          "item": 27,
          "count": 2
        }
      },
      "tools": [
        21
      ],
      "locations": [
        5
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/healing_potion.png",
      "cooldown": 0
    },
    "18": {
      "pkey": 18,
      "owner": "eoscraftcore",
      "name": "Clay Bricks",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "14": {
          "item": 14,
          "count": 1
        }
      },
      "ingreds": {
        "13": {
          "item": 13,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        6
      ],
      "act_label": "Make",
      "act_label_ing": "Making",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/clay_brick.png",
      "cooldown": 0
    },
    "19": {
      "pkey": 19,
      "owner": "eoscraftcore",
      "name": "Stone Bricks",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "20": {
          "item": 20,
          "count": 1
        }
      },
      "ingreds": {
        "16": {
          "item": 16,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        6
      ],
      "act_label": "Make",
      "act_label_ing": "Making",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/stone_brick.png",
      "cooldown": 0
    },
    "20": {
      "pkey": 20,
      "owner": "eoscraftcore",
      "name": "Wheel",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "11": {
          "item": 11,
          "count": 1
        }
      },
      "ingreds": {
        "4": {
          "item": 4,
          "count": 4
        }
      },
      "tools": [
        21
      ],
      "locations": [
        6
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/wheel.png",
      "cooldown": 0
    },
    "21": {
      "pkey": 21,
      "owner": "eoscraftcore",
      "name": "Wagon",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "10": {
          "item": 10,
          "count": 1
        }
      },
      "ingreds": {
        "4": {
          "item": 4,
          "count": 4
        },
        "11": {
          "item": 11,
          "count": 4
        }
      },
      "tools": [
        21
      ],
      "locations": [
        6
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/wagon.png",
      "cooldown": 0
    },
    "22": {
      "pkey": 22,
      "owner": "eoscraftcore",
      "name": "Grinder",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "15": {
          "item": 15,
          "count": 1
        }
      },
      "ingreds": {
        "13": {
          "item": 13,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        6
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/grinder.png",
      "cooldown": 0
    },
    "23": {
      "pkey": 23,
      "owner": "eoscraftcore",
      "name": "Spinning Wheel",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "12": {
          "item": 12,
          "count": 1
        }
      },
      "ingreds": {
        "4": {
          "item": 4,
          "count": 1
        },
        "11": {
          "item": 11,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        6
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/spinning_wheel.png",
      "cooldown": 0
    },
    "24": {
      "pkey": 24,
      "owner": "eoscraftcore",
      "name": "Grindstone",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "22": {
          "item": 22,
          "count": 1
        }
      },
      "ingreds": {
        "4": {
          "item": 4,
          "count": 3
        },
        "20": {
          "item": 20,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        6
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/grindstone.png",
      "cooldown": 0
    },
    "25": {
      "pkey": 25,
      "owner": "eoscraftcore",
      "name": "Unlock Castle",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "21": {
          "item": 21,
          "count": 1
        }
      },
      "ingreds": {
        "9": {
          "item": 9,
          "count": 1
        }
      },
      "tools": [
        9
      ],
      "locations": [
        6
      ],
      "act_label": "Unlock",
      "act_label_ing": "Unlocking",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/crafting/unlock_castle.png",
      "cooldown": 0
    },
    "26": {
      "pkey": 26,
      "owner": "eoscraftcore",
      "name": "Knife",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "41": {
          "item": 41,
          "count": 1
        }
      },
      "ingreds": {
        "8": {
          "item": 8,
          "count": 1
        }
      },
      "tools": [
        21
      ],
      "locations": [
        6
      ],
      "act_label": "Craft",
      "act_label_ing": "Crafting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/knife.png",
      "cooldown": 0
    },
    "27": {
      "pkey": 27,
      "owner": "eoscraftcore",
      "name": "Collect Manashroom",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "19": {
          "item": 19,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [],
      "locations": [
        10
      ],
      "act_label": "Collect",
      "act_label_ing": "Collecting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/manashroom.png",
      "cooldown": 10
    },
    "28": {
      "pkey": 28,
      "owner": "eoscraftcore",
      "name": "Collect Stone",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "16": {
          "item": 16,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [],
      "locations": [
        10
      ],
      "act_label": "Collect",
      "act_label_ing": "Collecting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/stone.png",
      "cooldown": 10
    },
    "29": {
      "pkey": 29,
      "owner": "eoscraftcore",
      "name": "Collect Plant Fiber",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "17": {
          "item": 17,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [],
      "locations": [
        10
      ],
      "act_label": "Collect",
      "act_label_ing": "Collecting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/plant_fiber.png",
      "cooldown": 10
    },
    "30": {
      "pkey": 30,
      "owner": "eoscraftcore",
      "name": "Collect Medishrub",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "18": {
          "item": 18,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [],
      "locations": [
        10
      ],
      "act_label": "Collect",
      "act_label_ing": "Collecting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/medishrub.png",
      "cooldown": 10
    },
    "31": {
      "pkey": 31,
      "owner": "eoscraftcore",
      "name": "Catch Fish",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "28": {
          "item": 28,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        25
      ],
      "locations": [
        8
      ],
      "act_label": "Catch",
      "act_label_ing": "Catching",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/fish.png",
      "cooldown": 30
    },
    "32": {
      "pkey": 32,
      "owner": "eoscraftcore",
      "name": "Butcher Rabbit",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "31": {
          "item": 31,
          "count": 1
        }
      },
      "ingreds": {
        "30": {
          "item": 30,
          "count": 1
        }
      },
      "tools": [
        41
      ],
      "locations": [
        7
      ],
      "act_label": "Butcher",
      "act_label_ing": "Butchering",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/rabbit_meat.png",
      "cooldown": 30
    },
    "33": {
      "pkey": 33,
      "owner": "eoscraftcore",
      "name": "Butcher Deer",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "33": {
          "item": 33,
          "count": 1
        }
      },
      "ingreds": {
        "32": {
          "item": 32,
          "count": 1
        }
      },
      "tools": [
        41
      ],
      "locations": [
        7
      ],
      "act_label": "Butcher",
      "act_label_ing": "Butchering",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/deer_meat.png",
      "cooldown": 30
    },
    "34": {
      "pkey": 34,
      "owner": "eoscraftcore",
      "name": "Butcher Fish",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "29": {
          "item": 29,
          "count": 1
        }
      },
      "ingreds": {
        "28": {
          "item": 28,
          "count": 1
        }
      },
      "tools": [
        41
      ],
      "locations": [
        7
      ],
      "act_label": "Butcher",
      "act_label_ing": "Butchering",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/fish_meat.png",
      "cooldown": 30
    },
    "35": {
      "pkey": 35,
      "owner": "eoscraftcore",
      "name": "Butcher Chicken",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "35": {
          "item": 35,
          "count": 1
        }
      },
      "ingreds": {
        "34": {
          "item": 34,
          "count": 1
        }
      },
      "tools": [
        41
      ],
      "locations": [
        7
      ],
      "act_label": "Butcher",
      "act_label_ing": "Butchering",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/chicken_meat.png",
      "cooldown": 30
    },
    "36": {
      "pkey": 36,
      "owner": "eoscraftcore",
      "name": "Butcher Cow",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "38": {
          "item": 38,
          "count": 1
        }
      },
      "ingreds": {
        "37": {
          "item": 37,
          "count": 1
        }
      },
      "tools": [
        41
      ],
      "locations": [
        7
      ],
      "act_label": "Butcher",
      "act_label_ing": "Butchering",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/cow_meat.png",
      "cooldown": 30
    },
    "37": {
      "pkey": 37,
      "owner": "eoscraftcore",
      "name": "Milk Cow",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "39": {
          "item": 39,
          "count": 1
        }
      },
      "ingreds": {},
      "tools": [
        37
      ],
      "locations": [
        7
      ],
      "act_label": "Mil",
      "act_label_ing": "Milking",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/milk.png",
      "cooldown": 30
    },
    "38": {
      "pkey": 38,
      "owner": "eoscraftcore",
      "name": "Incubate eggs",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "34": {
          "item": 34,
          "count": 1
        }
      },
      "ingreds": {
        "36": {
          "item": 36,
          "count": 1
        }
      },
      "tools": [],
      "locations": [
        7
      ],
      "act_label": "Incubate",
      "act_label_ing": "Incubating",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/chicken.png",
      "cooldown": 300
    },
    "39": {
      "pkey": 39,
      "owner": "eoscraftcore",
      "name": "Collect Egg",
      "description": "Loerm ipsum",
      "package": 0,
      "outputs": {
        "36": {
          "item": 36,
          "count": 2
        }
      },
      "ingreds": {},
      "tools": [
        34
      ],
      "locations": [
        7
      ],
      "act_label": "Collect",
      "act_label_ing": "Collecting",
      "sfx": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/sfx/crafting/generic.mp3",
      "icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/items/egg.png",
      "cooldown": 30
    }
  },
  "locations": {
    "0": {
      "pkey": 0,
      "owner": "eoscraftcore",
      "name": "Market",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/market.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/market.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/market.jpg",
      "position": {
        "x": 1305,
        "y": 805
      },
      "reqs": [
        5
      ]
    },
    "1": {
      "pkey": 1,
      "owner": "eoscraftcore",
      "name": "Inventory",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/inventory.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/bag_t.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/inventory.png",
      "position": {
        "x": 1820,
        "y": 995
      },
      "reqs": [
        5
      ]
    },
    "2": {
      "pkey": 2,
      "owner": "eoscraftcore",
      "name": "Credits",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/welcome.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/credits.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/credits.png",
      "position": {
        "x": 330,
        "y": 60
      },
      "reqs": []
    },
    "3": {
      "pkey": 3,
      "owner": "eoscraftcore",
      "name": "Starting Point",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/starting_point.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/quest_imp.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/starting_point.png",
      "position": {
        "x": 1605,
        "y": 860
      },
      "reqs": [
        1
      ]
    },
    "4": {
      "pkey": 4,
      "owner": "eoscraftcore",
      "name": "Corbridge Timberland",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/forest.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/generic.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/forest.jpg",
      "position": {
        "x": 1555,
        "y": 645
      },
      "reqs": [
        3
      ]
    },
    "5": {
      "pkey": 5,
      "owner": "eoscraftcore",
      "name": "Ruthorham Village",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/village.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/generic.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/village.jpg",
      "position": {
        "x": 1355,
        "y": 795
      },
      "reqs": [
        3
      ]
    },
    "6": {
      "pkey": 6,
      "owner": "eoscraftcore",
      "name": "Barmsfield Castle",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/castle.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/generic.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/castle.png",
      "position": {
        "x": 1605,
        "y": 860
      },
      "reqs": [
        9,
        21
      ]
    },
    "7": {
      "pkey": 7,
      "owner": "eoscraftcore",
      "name": "Jolly Oak Farms",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/farm.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/generic.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/farm.png",
      "position": {
        "x": 1455,
        "y": 795
      },
      "reqs": [
        24,
        25
      ]
    },
    "8": {
      "pkey": 8,
      "owner": "eoscraftcore",
      "name": "Valna Lake",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/lake.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/generic.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/lake.png",
      "position": {
        "x": 1500,
        "y": 910
      },
      "reqs": [
        25
      ]
    },
    "9": {
      "pkey": 9,
      "owner": "eoscraftcore",
      "name": "Granboro Mountains",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/mine.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/generic.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/mine.png",
      "position": {
        "x": 1405,
        "y": 415
      },
      "reqs": [
        7
      ]
    },
    "10": {
      "pkey": 10,
      "owner": "eoscraftcore",
      "name": "The Jungles Of Fakisi",
      "description": "Loerm ipsum",
      "package": 0,
      "music": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/audio/music/mine.mp3",
      "marker_icon": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/map_icons/generic.png",
      "background": "https://s3.amazonaws.com/liquidapps.games-assets/eoscraft/assets/image/locations/jungle.jpg",
      "position": {
        "x": 315,
        "y": 720
      },
      "reqs": [
        10
      ]
    }
  },
  "account": {
    "owner": "demouser",
    "active_packages": [
      0
    ],
    "cooldowns": [],
    "inventory": {
      "1": {
        "pkey": 0,
        "item_count": {
          "item": 1,
          "count": 1
        },
        "owner": "demouser"
      }
    },
    "currencies": {
      "coins": 0
    }
  },
  "connector": {
    "4": { "owner": "eoscraftcore", "supply": { "item": 4, "count": 10000 }, "coins": 10000000, "base_weight": 100, "target_weight": 500 },
    "7": { "owner": "eoscraftcore", "supply": { "item": 7, "count": 5000 }, "coins": 10000000, "base_weight": 100, "target_weight": 500 },
    "8": { "owner": "eoscraftcore", "supply": { "item": 8, "count": 10000 }, "coins": 100000000, "base_weight": 100, "target_weight": 500 },
    "9": { "owner": "eoscraftcore", "supply": { "item": 9, "count": 10000 }, "coins": 1000000000, "base_weight": 100, "target_weight": 500 }
  },
  "market": {
    "4": 200.01000065938968,
    "7": 400.0400052817099,
    "8": 2000.1000065938968,
    "9": 20001.000065938966
  }
};

var config = {
  chainId: network.chainId, // 32 byte (64 char) hex string          
  expireInSeconds: 60,
  broadcast: true,
  debug: true, // API and transactions
  sign: true
};
if (network.secured) {
  config.httpsEndpoint = 'https://' + network.host + ':' + network.port;
  config.httpEndpoint = 'https://' + network.host + ':' + network.port;
}
else {
  config.httpEndpoint = 'http://' + network.host + ':' + network.port;
}

const rpc = new JsonRpc(config.httpEndpoint, { fetch: window.fetch });



export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'title' });
  }

  preload() {}

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
    buttonImage.on('pointerdown', function(pointer) {
      if (!button.disabled) {
        if (!window.sfxOff)
          theScene.sound.add('click').play({ loop: false });
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
      if (!buttonImage.texture.key.endsWith('d'))
        buttonImage.setTexture(style + '_n');

    });

    return button;
  }
  startDemo() {
    window.isDebug = true;
    window.isDemo = true;
    window.eosAccount = 'demouser';
    this.getGameData().then(res => {
      this.start(res);
    });
  }
  startReal() {
    this.getGameData().then(res => {
      this.start(res);
    });
  }
  async getTable(table, item) {
    if (window.isDemo) {
      if (table === 'game') {
        return defaultData;
      }
      var resTable = defaultData[table];
      if (item === undefined)
        return Object.values(resTable);
      return resTable[item];
    }
    const query = {
      "json": true,
      "scope": network.contractAccount,
      "code": network.contractAccount,
      "table": table,
      "limit": 500
    };
    if (item) {
      // const table_key = new BigNumber(Eos.modules.format.encodeName(item, false));
      query.limit = 1;
      query.lower_bound = item
      // query.upper_bound = table_key.plus(1).toString();
    }
    const res = await rpc.get_table_rows(query);
    if (item) {
      if (res.rows.length && res.rows[0].pkey == item)
        return res.rows[0];
      else
        return null;
    }
    else {
      // handle next page
      return res.rows;
    }
  }


  toDict(array, index, valuefn) {
    index = index || ((a) => a['pkey']);
    valuefn = valuefn || (a => a);
    const res = {};
    for (var i = 0; i < array.length; i++) {
      var item = array[i];
      res[index(item)] = valuefn(item);
    }
    return res;
  }
  async getGameData(accountName) {
    var game = await this.getTable('game', network.contractAccount);
    if (!game.locations) {
      let account = await this.getTable('gameaccount', window.eosAccount);
      if (!account) {
        // need to invoke start.
        await window.scatter.mainContract.start({ owner: window.eosAccount }, { authorization: window.eosAccount });
        account = await this.getTable('gameaccount', window.eosAccount);
      }
      var items = await this.getTable('item');
      var recipes = await this.getTable('recipe');
      var locations = await this.getTable('location');

      game.items = this.toDict(items.filter(i => account.active_packages.indexOf(i.package) !== -1));
      recipes = recipes.filter(i => account.active_packages.indexOf(i.package) !== -1);
      recipes.forEach(r => {
        r.outputs = this.toDict(r.outputs, a => a.item);
        r.ingreds = this.toDict(r.ingreds, a => a.item);
      })
      game.recipes = this.toDict(recipes);
      game.locations = this.toDict(locations.filter(i => account.active_packages.indexOf(i.package) !== -1));
      account.inventory = this.toDict(account.items, a => a.item, a => { return { item_count: { count: a.count, item: a.item } } });
      account.currencies = {
        coins: account.inventory['0'] ? account.inventory['0'].item_count.count : 0
      };
      game.account = account;
    }
    return game;
  }
  async start(fullGameData) {
    console.log(JSON.stringify(fullGameData));
    var this2 = this;
    window.refreshInventory = async() => {

      let connectors = await this.getTable('connector');
      connectors.forEach(c => {
        c.getPriceForQuantity = (quantity) => {
          var currentSmartSupply = 10000000;
          var smartTokens = this.convert_to_exchange(c.supply.count, quantity, currentSmartSupply, c.base_weight, true);
          var targetTokens = this.convert_from_exchange(c.coins, smartTokens, currentSmartSupply, c.target_weight, true);
          return targetTokens;
        }
        // c.price = targetTokens;
      });
      window.fullGameData.market = this.toDict(connectors, a => a.supply.item, a => a.getPriceForQuantity);
      if (window.isDebug)
        return;
      let account = await this.getTable('gameaccount', window.eosAccount);
      window.playerData.inventory = this.toDict(account.items, a => a.item, a => { return { item_count: { count: a.count, item: a.item } } });

      window.playerData.currencies = {
        coins: window.playerData.inventory['0'] ? window.playerData.inventory['0'].item_count.count : 0
      };
    }
    window.playerData = fullGameData.account;
    window.fullGameData = fullGameData;
    var scene = this;
    await window.refreshInventory();
    window.fadeOut(scene, this.music, () => {
      scene.scene.start('preload2');
    });
  }
  convert_to_exchange(balance, inp, supply, weight, sell) {
    var R = supply;




    var C = balance + (inp * (sell ? -1 : 1));
    var F = weight / 1000.0;
    var T = inp;
    var ONE = 1.0;
    var E = -R * (ONE - Math.pow(ONE + T / C, F));
    return E;

  }

  convert_from_exchange(balance, inp, supply, weight, sell) {
    var R = (supply - (inp * (sell ? -1 : 1)));
    var C = (balance);
    var F = (1000.0 / weight);
    var E = (inp);
    var ONE = 1.0;
    var T = C * (Math.pow(ONE + E / R, F) - ONE);
    return T;
  }
  create() {
    var baseUrl = this.cache.json.get('assets').base ? this.cache.json.get('assets').base : "";
    this.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);

    const bg = this.add.image(0, 0, 'desert_background_dark');
    bg.y = bg.height * 0.5;
    bg.x = bg.width * 0.5;
    this.music = this.sound.add('welcome');
    if (!window.musicOff)
      this.music.play({ loop: true });
    window.currentMusic = this.music;

    var left_side_bg = this.add.image(0, 0, 'left_side_bg');
    left_side_bg.y = left_side_bg.height * 0.5;
    left_side_bg.x = left_side_bg.width * 0.5;

    var form_account_label = this.add.text(0, 0, 'Account');
    form_account_label.y = (form_account_label.height * 0.5);
    form_account_label.x = ((left_side_bg.width - form_account_label.width) * 0.5);

    let position = form_account_label.height;

    var form_account = this.add.image(0, 0, 'form_account');
    form_account.y = position + (20) + (form_account.height * 0.5);
    form_account.x = ((left_side_bg.width) * 0.5);

    var form_account_text = this.add.text(0, 0, "");


    form_account_text.y = position + (10) + (form_account.height * 0.5);
    form_account_text.x = ((left_side_bg.width) * 0.5) - (form_account_text.width * 0.5);

    position = form_account.y + (form_account.height * 0.5)
    var theScene = this;
    var this2 = this;
    var buttonGetAccount = this.generateButton('Connect with Scatter', 'button2', (pointer, button) => {
      if (window.isDebug) {
        form_account_text.setText('debug');
        form_account_text.x = ((left_side_bg.width) * 0.5) - (form_account_text.width * 0.5);

        buttonStart.setDisabled(false);
        return;
      }
      this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/defaultloading.png), pointer`);
      this2.input.mousePointer.dirty = true;
      buttonGetAccount.setDisabled(true);

      // First we need to connect to the user's Scatter.
      ScatterJS.scatter.connect('EOSCraft').then(connected => {

        // If the user does not have Scatter or it is Locked or Closed this will return false;
        if (!connected) return false;
        window.scatter = ScatterJS.scatter;
        const currentNetwork = {
          blockchain: 'eos',
          protocol: network.secured ? 'https' : 'http',
          host: network.host,
          port: network.scatterPort || network.port,
          chainId: network.chainId,
          httpEndpoint: network.host + ':' + network.port,
        };
        const getApi = (signatureProvider) =>
          new Api({ rpc, signatureProvider });

        return window.scatter.suggestNetwork(currentNetwork).then((selectedNetwork) => {
          const eosOptions = { chainId: network.chainId, expireInSeconds: 60, rpc, beta3: true };
          window.scatter = ScatterJS.scatter;
          const requiredFields = { accounts: [{ blockchain: 'eos', chainId: network.chainId }] };
          const api = getApi(window.scatter.eosHook(currentNetwork));
          window.scatter.eosInstance = window.scatter.eos(currentNetwork, Api, eosOptions);;
          return window.scatter.getIdentity(requiredFields).then(identity => {
            if (identity.accounts.length === 0) return
            var accountName = identity.accounts[0].name;
            console.log(accountName);
            // return window.scatter.eosInstance.contract(network.contractAccount).then(contract => {
            this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);
            this2.input.mousePointer.dirty = true;
            buttonStart.setDisabled(false);
            form_account_text.setText(accountName);
            window.eosAccount = accountName;
            form_account_text.x = ((left_side_bg.width) * 0.5) - (form_account_text.width * 0.5);
            theScene.sound.add('imported_account').play({ loop: false });
            buttonGetAccount.setDisabled(false);
            // });
          });
        }).catch((error) => {
          console.log("error importing account", error);
          this2.input.setDefaultCursor(`url(${baseUrl}assets/image/cursors/default.png), pointer`);
          this2.input.mousePointer.dirty = true;
          theScene.sound.add('craft_failed').play({ loop: false });
          buttonGetAccount.setDisabled(false);
        });

      });
    }, !!window.scatter);
    buttonGetAccount.y = position + 10;
    buttonGetAccount.x = ((left_side_bg.width) * 0.5);

    position = buttonGetAccount.y + buttonGetAccount.height;

    var buttonStart = this.generateButton('Start Playing', 'button', () => {
      if (window.isDebug)
        this.startDemo();
      else
        this.startReal();
    }, false);
    buttonStart.y = position + 10;
    buttonStart.x = ((left_side_bg.width) * 0.5);

    position = buttonStart.y + buttonStart.height;

    const accountContainer = this.add.container(0, 0, [
      form_account_label,
      form_account,
      form_account_text,
      buttonGetAccount,
      buttonStart
    ]);
    accountContainer.y = (accountContainer.height * 0.5) + 10;
    accountContainer.x = (accountContainer.width * 0.5);


    const container = this.add.container(0, 0, [left_side_bg, accountContainer]);
    container.y = container.height * 0.5;
    container.x = container.width * 0.5;

    var buttonStartDemo = this.generateButton('Play Demo', 'button2', (pointer, button) => {
      this.startDemo();
    }, true);
    buttonStartDemo.x = ((left_side_bg.width) * 0.5);
    buttonStartDemo.y = 500;

    var buttonInvite = this.generateButton('Telegram Group', 'button2', (pointer, button) => {
      document.location.href = 'https://t.me/joinchat/HQXh00P7yCsThKNjs0DKyQ';
    }, true);
    buttonInvite.x = ((left_side_bg.width) * 0.5);
    buttonInvite.y = 400;

    this.add.image(this.centerX() + (form_account.width / 2), this.centerY() - 450, 'logo');

    buttonGetAccount.setDisabled(false);
    window.placeOptionIcons(this, 200, 600);
  }
  centerX() {
    return this.sys.game.config.width / 2;
  }
  centerY() {
    return this.sys.game.config.height / 2;
  }
}
