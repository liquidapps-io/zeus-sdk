const path = require('path');
const os = require('os');
const fs = require('fs');
const { execPromise, emojMap, execScripts } = require('../helpers/_exec');
const mapping = require('../helpers/_mapping');
const temp = require('temp');
const semver = require('semver');

const { promisify } = require('util');
const mkdir = promisify(temp.mkdir); // (A)
temp.track();

// Setup process exit/crash handler to always cleanup temp
/*const cleanup = function () {
  //console.log('cleaning up');
  temp.cleanupSync();
};
['exit', 'SIGINT', 'uncaughtException'].map(sig => process.on(sig, cleanup));*/

const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
function copyFileSync(source, target, simulate, newIgnoreList, rootPath) {
  var targetFile = target;

  // if target is a directory a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    } else {
      var targetBuf = fs.readFileSync(target);
      var sourceBuf = fs.readFileSync(source);
      if (!sourceBuf.equals(targetBuf)) {
        throw new Error(`cannot override ${target}`);
      } else {
        return;
      }
    }
  }
  newIgnoreList.push(target.substr(rootPath.length));
  if (!simulate) {
    var stats = fs.lstatSync(source);
    fs.writeFileSync(targetFile, fs.readFileSync(source));
    fs.chmodSync(targetFile, stats.mode);
  }
}

function copyFolderRecursiveSync(source, target, simulate, ignoreList, newIgnoreList, rootPath) {
  var files = [];

  // check if folder needs to be created or integrated
  var targetFolder = target;
  if (!simulate && !fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }
  var stats = fs.lstatSync(source);
  // copy

  if (stats.isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      var curSource = path.join(source, file);
      var curTarget = path.join(targetFolder, file);
      if (ignoreList.indexOf(curSource) > -1) {
        // console.log("ignoring ",curSource);
        return;
      }
      var fstats = fs.lstatSync(curSource);
      if (fstats.isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget, simulate, ignoreList, newIgnoreList, rootPath);
      } else {
        // add to gitignore
        copyFileSync(curSource, curTarget, simulate, newIgnoreList, rootPath);
      }
    });
  }
}

const runHook = async (hookName, args, zeusBoxJson, location, opts) => {
  opts = opts || {
    cwd: path.resolve('.')
  };
  if (zeusBoxJson.hooks) {
    const hooks = zeusBoxJson.hooks;
    if (hooks[hookName]) {
      console.log(emojMap.comet + `${hookName.green} hook for box: ${args.boxes[0].yellow}`);
      const stdout = await execPromise(hooks[hookName], opts);
    }
  }

  let hooksPath = path.join(path.resolve(__dirname, "../hooks", hookName));
  if (fs.existsSync(hooksPath)) {
    await execScripts(hooksPath, (script) => {
      //console.log(`running ${hookName} hook ${path.basename(script)}`);
      return [args, zeusBoxJson, global.path];
    }, args);
  }
};

const deleteFolderRecursive = function(pathToDelete) {
  if (fs.existsSync(pathToDelete)) {
    fs.readdirSync(pathToDelete).forEach((file, index) => {
      const curPath = path.join(pathToDelete, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(pathToDelete);
  }
};

const handler = async (args, globalCopyList = []) => {

  if (!global.currentlyUnboxedBoxes) {
    global.currentlyUnboxedBoxes = [];
    if (!fs.existsSync(path.resolve('./zeus-box.json'))) {
      console.log(`Missing zeus-box.json. Please use zeus box create.`);
      return;
    }

    if (!fs.existsSync(path.resolve('./package.json'))) {
      console.log(`Missing package.json. Please use zeus box create.`);
    } else {
      console.log(`${emojMap.zap} Installing packages in ./package.json`);
      await execPromise('npm install');
    }

    var newDir = path.resolve('./', 'zeus_boxes');
    if (!fs.existsSync(newDir)) { fs.mkdirSync(newDir); }

    if (!args.boxes || !args.boxes.length) {
      args.boxes = [];
      let dependencies = JSON.parse(fs.readFileSync(path.resolve('./zeus-box.json'))).dependencies;
      for (let d of Object.keys(dependencies)) {
        args.boxes.push(d + '@' + dependencies[d]);
      }
    }

    global.path = process.cwd();

    if (args.boxes && args.boxes.length) {
      for (let boxName of args.boxes) {
        var params = { ...args, boxes: [boxName] };
        console.log(emojMap.gear + 'Unboxing:', boxName.yellow);
        await handler(params, globalCopyList);
        process.chdir(global.path);
      }
    }
    return;
  }

  var boxNameAndVersion = args.boxes[0];
  var boxNameAndVersionSplit = boxNameAndVersion.split('@');
  var boxName = boxNameAndVersionSplit[0];
  if (boxNameAndVersionSplit.length > 1) {
    var versionRange = boxNameAndVersionSplit[1];
    if (!semver.validRange(versionRange)) {
      console.log(`Given version '${versionRange}' for Box '${boxName}' is not semver valid`);
      return;
    }
  } else {
    var versionRange = '';
  }

  if (global.currentlyUnboxedBoxes.indexOf(boxName) != -1) { return; }

  const boxesMapping = mapping.getCombined(args.storagePath);
  let boxUri;

  if (boxName in boxesMapping) {
    var versions = (Object.keys(boxesMapping[boxName]));
    const includePrerelease = true; // only relevant in non production mapping
    var version = semver.maxSatisfying(versions, versionRange, {includePrerelease});
    if (version) {
      boxUri = boxesMapping[boxName][version];
    } else {
      console.log(`Given version '${versionRange}' for Box '${boxName}' is not in mapping`);
      process.exit(1);
    }
  } else {
    console.log(`Box '${boxName}' not found. Perhaps your mapping file is not updated?`);
    process.exit(1);
  }

  // If this is not a second-level dependency
  if (!args.no_sample) {
    let boxJson = JSON.parse(fs.readFileSync(path.resolve('./zeus-box.json')));
    if (!boxJson.dependencies) {
      boxJson.dependencies = {};
    }
    boxJson.dependencies[boxName] = versionRange;
    fs.writeFileSync(`./zeus-box.json`, JSON.stringify(boxJson, null, 4), function (err) { if (err) throw err; });
  }

  if (mapping.boxInBothMappings(args.storagePath, boxName, version)) {
    console.log("WARNING:", boxName, "with version", version, "found in both local and builtin mapping. Unboxing using local mapping. If you wish to revert to builtin mapping, use zeus box remove", boxName);
  }

  process.chdir(global.path);

  global.currentlyUnboxedBoxes.push(boxName);

  var newDir = path.resolve(global.path, 'zeus_boxes/', boxName);
  if (fs.existsSync(newDir)) {
    if (!args.update) {
      console.log(`${emojMap.white_frowning_face}Box ${boxName.red} already unboxed`); return;
    } else {
      if(fs.lstatSync(newDir).isDirectory()) {
        deleteFolderRecursive(newDir)
      } else {
        fs.unlinkSync(newDir);
      }
    }
  }

  var extractPath = await mkdir('zeus');
  let stdout;
  var inputPath;

  if (boxUri.indexOf('://') > 0 && boxUri.indexOf('://') < 10) {
    var protocol = boxUri.split('://')[0];
    var dirPath = await mkdir('zeus');
    inputPath = path.join(dirPath, 'archive.zip');

    switch (protocol) {
      case 'ipfs':
        var hash = boxUri.split('://')[1];
        if (!process.env.SKIP_IPFS_GATEWAY) {
          boxUri = `https://cloudflare-ipfs.com/ipfs/${hash}`;
        } else {
          var ipfsout = await execPromise(`${process.env.IPFS || 'ipfs'} cat /ipfs/${hash} > ${inputPath}`);
          break;
        }

      //
      case 'http':
      case 'https':
        stdout = await execPromise(`${process.env.CURL || 'curl'} ${boxUri} -L -o ${inputPath}`, {});

        break;
      case 'file':
        var file = boxUri.split('://')[1];
        inputPath = file;
        break;

      default:
        throw new Error('not supported yet. pass archive url:' + boxName);
      // code
    }
  } else {
    throw new Error(`Cannot parse box '${boxName}' URI: ${boxUri}`);
  }

  await (() => new Promise((resolve, reject) => {
    var extractor = require('unzipper').Extract({ path: extractPath });
    extractor.on('close', resolve);
    extractor.on('error', reject);
    fs.createReadStream(inputPath).pipe(extractor);
  })
  )();

  // console.log(stdout);
  var dirs = getDirectories(extractPath);
  if (dirs.length != 1) {
    temp.cleanupSync();
    throw new Error('unknown archive format');
  }
  extractPath = dirs[0];
  var zeusBoxJsonPath = path.join(extractPath, 'zeus-box.json');
  if (!fs.existsSync(zeusBoxJsonPath)) {
    temp.cleanupSync();
    throw new Error('zeus-box.json not found');
  }
  var zeusBoxJson = JSON.parse(fs.readFileSync(zeusBoxJsonPath));

  fs.mkdirSync(newDir);
  process.chdir(newDir);

  // run build script
  await runHook('post-unpack', args, zeusBoxJson, extractPath, {
    cwd: extractPath
  });

  // delete files in box ignore list
  var ignoreList = [];
  var newIgnoreList = [];
  if (zeusBoxJson.ignore) { ignoreList = zeusBoxJson.ignore.map(a => path.join(extractPath, a)); }
  // compare if any file already exists
  // console.log('copying staged files');
  copyFolderRecursiveSync(extractPath, path.resolve('.'), false, ignoreList, newIgnoreList, path.resolve('.'));
  globalCopyList.forEach(a => {
    if (newIgnoreList.indexOf(a) == -1) { newIgnoreList.push(a); }
  });

  // if(zeusBoxJson.ignore)
  //     ignoreList = zeusBoxJson.ignore.map(a=>a);
  // // copy to dest
  // stdout = await execPromise(`${process.env.RSYNC || 'rsync'} -a ${path.join(extractPath,'/')} . ${ignoreList.map(a=>`--exclude ${a}`).join(' ')}`,{
  //     cwd:path.resolve('.')
  // });
  // console.log(stdout);
  /*if (fs.existsSync('.gitignore') && !args.noIgnore) {
    var currentGitIgnore = fs.readFileSync('.gitignore').toString();
    currentGitIgnore += '\n';
    currentGitIgnore += newIgnoreList.map(a => a.replace(/\\/g, '/')).filter(a => a.indexOf('node_modules/') == -1 && a.indexOf('extensions/') == -1).map(a => a.substring(1)).filter(a => a !== '.gitignore').join('\n');
    fs.writeFileSync('.gitignore', currentGitIgnore);
  }*/
  //fs.writeFileSync(path.resolve('./zeus-box.json'), JSON.stringify(currentzeusBoxJson, null, 2));

  // load zeus-box.json
  if (zeusBoxJson.dependencies) {
    let dependenciesWithVersions = [];
    for (let d of Object.keys(zeusBoxJson.dependencies)) {
      if (!global.currentlyUnboxedBoxes.includes(d)) {
        dependenciesWithVersions.push(d + '@' + zeusBoxJson.dependencies[d]);
      }
    }
    if (dependenciesWithVersions.length > 0) {
      console.log(emojMap.gear + 'Unboxing:', dependenciesWithVersions.map(a => a.yellow).join(','));
    }
    for (var i = 0; i < dependenciesWithVersions.length; i++) {
      var dep = dependenciesWithVersions[i];
      var unboxExt = path.resolve(`.commands/unbox.js`);
      var params = { ...args, boxes: [dep], no_sample: true };
      if (fs.existsSync(unboxExt + '.js')) {
        await require(unboxExt).handler(params, globalCopyList);
      } else { await handler(params, globalCopyList); }
    }
  }

  process.chdir(newDir);

  // run install script
  try {
    await runHook('post-install', args, zeusBoxJson, extractPath);
    if (!args.no_sample) {
        console.log(emojMap.zap + 'Installing newly added packages to ./package.json');
        await execPromise(`npm install --loglevel error`, {
          cwd: path.resolve('.'),
          env: {
            ...process.env,
          }
        });
    }
    if (args.test && !args.no_sample) {
      console.log('testing');
      stdout = await execPromise(`${process.env.ZEUS_CMD || 'zeus'} test`, {
        cwd: path.resolve('.')
      });
      console.log(stdout);
    }
  } catch (e) {
    console.log(e);
    // delete all files in  newIgnoreList
    globalCopyList.forEach(f => {
      try {
        fs.unlinkSync(f);
      } catch (e) { }
    });
    var dirToDelete = path.resolve('.');
    process.chdir(path.resolve('..'));
    fs.rmdirSync(dirToDelete);
    throw e;
  }
  // console.log('cleaning up');
  // var archive = `https://github.com/${}/${}/archive/master.zip`;
  // https://github.com/zeit/serve/archive/master.zip
  if (args.no_sample || !zeusBoxJson.commands || Object.keys(zeusBoxJson.commands).length == 0) { return; }
  console.log(emojMap.ok + `Done:\nPlease try these sample commands:`);
  console.log(Object.keys(zeusBoxJson.commands).map(label => `     ${emojMap.star}${label.underline}: ${zeusBoxJson.commands[label].yellow}`).join('\n'));
  // resolve github 3rd party boxes
  // resolve ipfs boxes
  // resolve "onchain" boxes
};
module.exports = {
  description: 'installs a templated plugin or a seed',
  builder: (yargs) => {
    yargs.option('test', {
      // describe: '',
      default: false
    }).option('update', {
      // describe: '',
      default: true
    }).example('$0 unbox seed --test --no-update');
  },
  command: 'unbox [boxes..]',
  handler
};