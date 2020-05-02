var path = require('path');
const { requireBox } = require('@liquidapps/box-utils');
const { emojMap } = requireBox('seed-zeus-support/_exec');
var fs = require('fs');
const { loadModels } = requireBox('seed-models/tools/models');

const isDirectory = source => fs.lstatSync(source).isDirectory();
const isFile = source => !fs.lstatSync(source).isDirectory();
const getDirectories = source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);

const getFiles = source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isFile);


var cache = {};
var gitIgnore;
var optionExternal = false;
var optionBox = ``

function collectAllFiles(thePath) {
  var subdirs = getDirectories(thePath);
  var files = getFiles(thePath);
  var recursiveResults = subdirs.map(collectAllFiles);
  var res = files;
  for (var i = 0; i < recursiveResults.length; i++) {
    var recursiveResult = recursiveResults[i];
    res = [...res, ...recursiveResult];
  }
  return res;

}

function buildBoxCache(boxPath) {
  var files = collectAllFiles(boxPath);
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (optionExternal && boxPath.endsWith(`/services`)) {
      file = file.substr(boxPath.length);
      // need to go one directory deeper for the cache to match unboxed file paths
      // remove /xxx-dapp-service
      // file = file.replace(/^\/.*?-dapp-service/, "")
      var [_, subDir, ...filePaths] = file.split(`/`)
      if (optionBox && optionBox !== subDir) continue;
      file = `/${filePaths.join(`/`)}`
      var filePrefix = `${boxPath}/${subDir}`

      cache[file] = filePrefix;
    } else {
      file = file.substr(boxPath.length);
      cache[file] = boxPath;
    }
  }
}


function buildBoxesCache(boxesDir) {
  var categories = getDirectories(boxesDir);
  for (var i = 0; i < categories.length; i++) {
    var categoryPath = categories[i];
    var boxes = getDirectories(categoryPath);
    for (var j = 0; j < boxes.length; j++) {
      var box = boxes[j];
      buildBoxCache(box);
    }
  }

}

function findInBoxes(source) {
  return cache[source];
}

function copyFileSync(source) {
  var root = path.resolve('.');
  if (source.indexOf("/node_modules") !== -1)
    return;
  if (source.indexOf("/CMakeFiles") !== -1)
    return;
  if (source.indexOf("-prefix") !== -1)
    return;
  if (source.indexOf('/Makefile') !== -1)
    return;

  if (source.indexOf('/cmake_install.cmake') !== -1)
    return;
  if (source.indexOf('/CMakeLists.txt') !== -1)
    return;

  if (source.indexOf('/CMakeCache.txt') !== -1)
    return;

  if (source.indexOf('.abi') !== -1)
    return;
  if (source.indexOf('.wasm') !== -1)
    return;
  if (source.indexOf('.gitignore') !== -1)
    return;

  var lookupFile = source.substr(root.length);
  if ([...gitIgnore, '/contracts/eos/dappservices/dappservices.config.hpp', '/models/boxmaps/50-zeusrepoeos.json', '/package-lock.json', '/package.json', '/nodeos.log', '/zeus-box.json', '/models/boxmaps/00-mapping.json'].indexOf(lookupFile) !== -1)
    return;
  var targetFilePrefix = findInBoxes(lookupFile);
  // if target is a directory a new file with the same name will be created
  if (targetFilePrefix) {
    var targetFile = path.join(targetFilePrefix, lookupFile);
    var targetBuf = fs.readFileSync(targetFile);
    var sourceBuf = fs.readFileSync(source);
    if (!sourceBuf.equals(targetBuf)) {
      console.log('overwriting', targetFile);
      fs.writeFileSync(targetFile, sourceBuf);

    }
    else {
      return;
    }
  }
  else {
    // check if in gitignore
    console.log('not found', lookupFile);
  }

}

function copyFolderRecursiveSync(source) {
  var files = [];

  // check if folder needs to be created or integrated
  var stats = fs.lstatSync(source);
  // copy

  if (stats.isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      var curSource = path.join(source, file);
      var fstats = fs.lstatSync(curSource);
      if (fstats.isDirectory()) {
        copyFolderRecursiveSync(curSource);
      }
      else {
        copyFileSync(curSource);
      }
    });
  }
}

module.exports = {
  description: 'sync-builtin-boxes',
  builder: (yargs) => {
    yargs
      .option('external', {
        describe: 'Needs to be set when syncing into the *public* LiquidApps github repo',
        default: false,
      })
      .option('box', {
        describe: 'Which box to sync',
        default: ``,
      })
      .example('$0 sync-builtin-boxes /home/user/git/liquidapps')
      .example('$0 sync-builtin-boxes ../zeus-sdk/boxes --external --box=storage-dapp-service');
  },
  command: 'sync-builtin-boxes <to>',

  handler: async (args) => {
    let stdout;
    try {
      optionExternal = args.external
      optionBox = args.box
      var models = await loadModels('dapp-services');
      gitIgnore = models.map(m => `/contracts/eos/dappservices/${m.name}.hpp`);
      gitIgnore = [...gitIgnore, ...models.map(m => `/contracts/eos/${m.name}service/${m.name}service.cpp`)];
      buildBoxesCache(path.resolve(args.to));
      copyFolderRecursiveSync(path.resolve('.'))
      // console.log(stdout);
      console.log(emojMap.ok + 'sync-builtin-boxes ok');
    }
    catch (e) {
      console.error(e);
      throw emojMap.white_frowning_face + 'sync-builtin-boxes failed';
    }
  }
};