const path = require('path');
const os = require('os');
const fs = require('fs');
const { execPromise, emojMap } = require('../helpers/_exec');
const mapping = require('../helpers/_mapping');
const temp = require('temp');

const { promisify } = require('util');
const mkdir = promisify(temp.mkdir); // (A)
temp.track();

// Setup process exit/crash handler to always cleanup temp
const cleanup = function () {
  // console.log('cleaning up');
  temp.cleanupSync();
};
['exit', 'SIGINT', 'uncaughtException'].map(sig => process.on(sig, cleanup));

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
      console.log(emojMap.comet + `${hookName.green} hook for box: ${args.box.yellow}`);
      const stdout = await execPromise(hooks[hookName], opts);
    }
  }
  // check for post-install hooks under ./extensions/commands/hook/post-install.js
  var hookFile = path.resolve(`./extensions/commands/hook/${hookName}`);
  if (fs.existsSync(hookFile + '.js')) {
    await require(hookFile).handler(args, zeusBoxJson, location, opts);
  }
};
const handler = async (args, globalCopyList = []) => {
  // resolve github system boxes
  var boxName = args.box;
  // var repo = boxName.split('/')[0];
  // var repo = boxName.split('/')[1];
  const boxes = mapping.load(args.storagePath);
  if (boxes[boxName]) { boxName = boxes[boxName]; }
  var extractPath = await mkdir('zeus');
  let stdout;
  var inputPath;
  var currentzeusBoxJson = {
    'ignore': [
      'README.md',
      'zeus-box.json',
      'zeus-config.js'
    ],
    'commands': {
    },
    'hooks': {

    },
    'dependencies': []
  };
  var createDir = false;
  if (global.currentzeusBoxJson) {
    currentzeusBoxJson = global.currentzeusBoxJson;
  } else if (fs.existsSync(path.resolve('./zeus-box.json'))) {
    currentzeusBoxJson = JSON.parse(fs.readFileSync(path.resolve('./zeus-box.json')));
    if (!currentzeusBoxJson.dependencies) { currentzeusBoxJson.dependencies = []; }
  } else {
    if (args.createDir) {
      createDir = true;
      var newDir = path.resolve('./', args.box);
      if (fs.existsSync(newDir)) { throw new Error('path already exists', newDir); }
      fs.mkdirSync(newDir);
      process.chdir(newDir);
      args.createDir = false;
    }
  }
  if (currentzeusBoxJson.dependencies.indexOf(args.box) != -1) { return; }

  if (!args.no_sample) {
    console.log(emojMap.gear + 'Unboxing:', args.box.yellow);
  }

  currentzeusBoxJson.dependencies.push(args.box);
  global.currentzeusBoxJson = currentzeusBoxJson;
  if (boxName.indexOf('://') > 0 && boxName.indexOf('://') < 10) {
    var protocol = boxName.split('://')[0];
    var dirPath = await mkdir('zeus');
    inputPath = path.join(dirPath, 'archive.zip');

    switch (protocol) {
      case 'ipfs':
        var hash = boxName.split('://')[1];
        if (!process.env.SKIP_IPFS_GATEWAY) {
          boxName = `https://cloudflare-ipfs.com/ipfs/${hash}`;
        } else {
          var ipfsout = await execPromise(`${process.env.IPFS || 'ipfs'} cat /ipfs/${hash} > ${inputPath}`);
          break;
        }

      //
      case 'http':
      case 'https':
        // console.log(`downloading ${args.box}`);
        stdout = await execPromise(`${process.env.CURL || 'curl'} ${boxName} -L -o ${inputPath}`, {});

        break;
      case 'file':
        var file = boxName.split('://')[1];
        inputPath = file;
        break;

      default:
        throw new Error('not supported yet. pass archive url:' + boxName);
      // code
    }
  } else {
    throw new Error(`not supported yet. pass archive url ${args.box}`);
  }

  // console.log(`extracting ${args.box}`);
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

  // load zeus-box.json
  if (zeusBoxJson.dependencies) {
    if (zeusBoxJson.dependencies.filter(pkg => currentzeusBoxJson.dependencies.indexOf(pkg) == -1).length) { console.log(emojMap.gear + 'Unboxing:', zeusBoxJson.dependencies.filter(pkg => currentzeusBoxJson.dependencies.indexOf(pkg) == -1).map(a => a.yellow).join(',')); }
    // todo: load extension unbox if exists
    for (var i = 0; i < zeusBoxJson.dependencies.length; i++) {
      var dep = zeusBoxJson.dependencies[i];
      var unboxExt = path.resolve(`./extensions/commands/unbox.js`);
      var params = { ...args, box: dep, no_sample: true };
      if (fs.existsSync(unboxExt + '.js')) {
        await require(unboxExt).handler(params, globalCopyList);
      } else { await handler(params, globalCopyList); }
    }
  }

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
  if (fs.existsSync('.gitignore') && !args.noIgnore) {
    var currentGitIgnore = fs.readFileSync('.gitignore').toString();
    currentGitIgnore += '\n';
    currentGitIgnore += newIgnoreList.map(a => a.replace(/\\/g, '/')).filter(a => a.indexOf('node_modules/') == -1 && a.indexOf('extensions/') == -1).map(a => a.substring(1)).filter(a => a !== '.gitignore').join('\n');
    fs.writeFileSync('.gitignore', currentGitIgnore);
  }
  fs.writeFileSync(path.resolve('./zeus-box.json'), JSON.stringify(currentzeusBoxJson, null, 2));

  // run install script
  try {
    await runHook('post-install', args, zeusBoxJson, extractPath);

    if (args.test && !args.no_sample) {
      console.log('testing');
      stdout = await execPromise(`${process.env.ZEUS_CMD || 'zeus'} test`, {
        cwd: path.resolve('.')
      });
      console.log(stdout);
    }
  } catch (e) {
    // delete all files in  newIgnoreList
    globalCopyList.forEach(f => {
      try {
        fs.unlinkSync(f);
      } catch (e) { }
    });
    if (args.createDir) {
      var dirToDelete = path.resolve('.');
      process.chdir(path.resolve('..'));
      fs.rmdirSync(dirToDelete);
    }
    throw e;
  }
  // console.log('cleaning up');
  // var archive = `https://github.com/${}/${}/archive/master.zip`;
  // https://github.com/zeit/serve/archive/master.zip
  if (args.no_sample || !zeusBoxJson.commands || Object.keys(zeusBoxJson.commands).length == 0) { return; }
  console.log(emojMap.ok + `Done: ${createDir ? `\nEnter new directory:\n     cd ${args.box}` : ''}\nPlease try these sample commands:`);
  console.log(Object.keys(zeusBoxJson.commands).map(label => `     ${emojMap.star}${label.underline}: ${zeusBoxJson.commands[label].yellow}`).join('\n'));
  // resolve github 3rd party boxes
  // resolve ipfs boxes
  // resolve "onchain" boxes
};
module.exports = {
  description: 'installs a templated plugin or a seed',
  builder: (yargs) => {
    yargs.option('create-dir', {
      // describe: '',
      default: true
    }).option('test', {
      // describe: '',
      default: false
    }).alias('c', 'create-dir').example('$0 unbox seed --no-create-dir --no-test');
  },
  command: 'unbox <box>',
  handler
};
