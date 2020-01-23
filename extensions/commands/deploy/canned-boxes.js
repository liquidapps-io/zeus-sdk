var path = require('path');
var os = require('os');
var fs = require('fs');
var {
  execPromise,
  emojMap
} = require('../../../zeus-cmd/lib/helpers/_exec');

var crypto = require('crypto');

const algorithm = 'aes-256-ctr';

function encrypt(text, password) {
  var cipher = crypto.createCipher(algorithm, password);
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);
const getAllBoxes = async(source) => {
  var directories = getDirectories(path.resolve(source));

  var boxes = directories.filter(dir => path.basename(dir) !== '.git' && fs.existsSync(path.resolve(dir, 'zeus-box.json')));

  var childPackages = await Promise.all(directories.map(dir => getAllBoxes(dir)));
  childPackages.forEach(c => {
    boxes = [...boxes, ...c];
  });
  return boxes;
};
const deployBox = async(subdir, encBoxes, boxes, invalidate, type) => {
  var name = path.basename(subdir);
  try {
    var stdout = await execPromise(`${process.env.ZEUS_CMD || 'zeus'} deploy box --moddate --no-update-mapping --type ${type} ${invalidate ? '--invalidate' : '--no-invalidate'}`, {
      cwd: subdir
    });
    var target = stdout.split('box deployed to ')[1].split('\n')[0];
    // console.log(`deployed ${name} to ${target}`);

    console.log(emojMap.ok + `${name}`);
    if (name[0] === '_') {
      encBoxes[name.substr(1, name.length - 1)] = target;
      return;
    }
    encBoxes[name] = target;
    boxes[name] = target;
  }
  catch (e) {
    console.error(`error deploying: ${subdir}`);
    throw e;
  }
};

const release = () => {
  console.log(emojMap.cloud + 'Publishing zeus-cmd npm');
  return execPromise(`${process.env.NPM || 'npm'} run release`, { cwd: path.resolve('.', 'zeus-cmd/') });
};

module.exports = {
  description: 'installs a templated plugin or a seed, without writing in deps',
  builder: (yargs) => {
    return yargs.option('invalidate', {
      // describe: '',
      default: true
    }).option('test', {
      // describe: '',
      default: false
    }).option('password', {
      // describe: '',
      default: ''
    }).option('release', {
      // describe: '',
      default: true
    }).option('type', {
      // describe: '',
      default: 's3'
    }).example('$0 deploy canned-boxes --invalidate --test');
  },
  command: 'canned-boxes',
  handler: async(args) => {
    var dirs = await getAllBoxes(path.resolve('.', 'boxes/groups'));

    var boxes = {};
    var encBoxes = {};
    console.log(emojMap.fleur_de_lis + `Deploying canned-boxes`);
    try {
      if (args.release) { await release(); }

      // fs.writeFileSync(path.resolve('./boxes/groups/repos/unbox-extensions/models/boxmaps/00-mapping.json'),JSON.stringify({}, null, 2));

      await Promise.all(dirs.map(subdir => deployBox(subdir, encBoxes, boxes, args.invalidate, args.type)));
      // twice to self contain the new box mapping in these packages
      console.log(emojMap.watch + 'Republishing repo boxes');
      // for (var i = 0; i < 2; i++) {
      fs.writeFileSync(path.resolve('./boxes/groups/repos/unbox-extensions/models/boxmaps/00-mapping.json'), JSON.stringify(boxes, null, 2));
      await deployBox(path.resolve('./boxes/groups/repos/unbox-extensions'), encBoxes, boxes, args.invalidate, args.type);
      // }

      fs.writeFileSync(path.resolve('./zeus-cmd/lib/mapping.js'), `module.exports = ${JSON.stringify(boxes, null, 2)};`);

      if (args.release) {
        var stdout = await release();
        if (args.test) {
          stdout = await execPromise(`cd \`mktemp -d\` && zeus unbox testbox -c --test`, {
            cwd: path.resolve('.', 'zeus-cmd/')
          });
        }
      }

      console.log(emojMap.relaxed + 'done.');
    }
    catch (e) {
      console.error(e);
      console.log(emojMap.white_frowning_face + 'canned-boxes deploy failed.');
      throw new Error('failed');
    }
  }
};
