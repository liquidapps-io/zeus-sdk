var path = require('path');
var os = require('os');
var fs = require('fs');
var { execPromise } = require('../../helpers/_exec');
var temp = require('temp');

const { promisify } = require('util');
const mkdir = promisify(temp.mkdir); // (A)
temp.track();

module.exports = {
  description: 'installs a templated plugin or a seed, without writing in deps',
  builder: (yargs) => {
    return yargs.option('ipfs', {
      // describe: '',
      default: true
    }).option('invalidate', {
      // describe: '',
      default: true
    }).example('$0 deploy box --ipfs');
  },
  command: 'box',
  handler: async (args) => {
    // resolve github system boxes
    if (!args.ipfs) { throw new Error('only ipfs is currently supported'); }
    // var repo = boxName.split('/')[0];
    // var repo = boxName.split('/')[1];
    var stagingPath = await mkdir('zeus');

    let stdout;
    var inputPath = path.resolve('.');

    console.log(`staging in ${stagingPath}`);
    var zeusBoxJsonPath = path.join(inputPath, 'zeus-box.json');
    if (!fs.existsSync(zeusBoxJsonPath)) {
      temp.cleanupSync();
      throw new Error('zeus-box.json not found');
    }
    var zeusBoxJson = JSON.parse(fs.readFileSync(zeusBoxJsonPath));

    var ignoreList = [];
    if (zeusBoxJson.ignore) { ignoreList = zeusBoxJson.ignore.filter(a => a != 'zeus-box.json').map(a => a); }

    if (fs.existsSync('.gitignore') && !args.noIgnore) {
      ignoreList = [...ignoreList, ...fs.readFileSync('.gitignore').toString().split('\n').filter(a => a.trim() != '')];
    }
    // copy to dest
    stdout = await execPromise(`${process.env.RSYNC || 'rsync'} -a ${path.join(inputPath)} ${stagingPath} ${ignoreList.map(a => `--exclude ${a}`).join(' ')}`, {
      cwd: path.resolve('.')
    });

    // load zeus-box.json
    const hooks = zeusBoxJson.hooks;

    // run build script
    if (hooks && hooks['post-stage']) {
      console.log('running post stage');
      stdout = await execPromise(hooks['post-stage'], {
        cwd: stagingPath
      });
    }

    var moddate = await execPromise(`find . -not -name "." -exec date --iso-8601=ns -r '{}' \\; | sort -rn | head -1`, { cwd: stagingPath });
    stdout = await execPromise(`${process.env.ZIP || 'zip'} -X -r ./box.zip .`, { cwd: stagingPath });
    console.log(moddate);
    stdout = await execPromise(`touch -d '${moddate}' ./box.zip`, { cwd: stagingPath });
    var ipfsout = await execPromise(`${process.env.IPFS || 'ipfs'} add ./box.zip`, { cwd: stagingPath });
    var hash = ipfsout.split(' ')[1];
    var uri = `ipfs://${hash}`;
    console.log(`box deployed to ${uri}`);
    // run post script

    // invalidate endpoints:
    var urls = [`https://ipfs.io/ipfs/${hash}`, `https://cloudflare-ipfs.com/ipfs/${hash}`, `https://ipfs.io/ipfs/${hash}`, `https://cloudflare-ipfs.com/ipfs/${hash}`];
    if (args.invalidate) {
      await Promise.race(urls.map(url => execPromise(`${process.env.CURL || 'curl'} --silent --output /dev/null ${url}`, {})));
    }

    // console.log('cleaning up');
    temp.cleanupSync();
    // var archive = `https://github.com/${}/${}/archive/master.zip`;
    // https://github.com/zeit/serve/archive/master.zip
    console.log('done.');

    // resolve github 3rd party boxes
    // resolve ipfs boxes
    // resolve "onchain" boxes
  }
};
