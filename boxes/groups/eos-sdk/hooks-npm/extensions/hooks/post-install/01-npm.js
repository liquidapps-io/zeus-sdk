const fs = require('fs');
const { execPromise, emojMap } = require('../../helpers/_exec');
const path = require('path');
module.exports = async(args, zeusbox) => {
  if (!zeusbox.install) { return; }
  if (zeusbox.install.npm) {
    var packages = Object.keys(zeusbox.install.npm).map(pkg => {
      var ver = zeusbox.install.npm[pkg];
      if (ver === true) {
        return pkg;
      }
      return `${pkg}@${ver}`;
    }).join(' ');
    console.log(emojMap.eight_pointed_black_star + 'NPM Install', packages.yellow);
    try {
      await execPromise(`npm install --loglevel error ${packages}`, {
        cwd: path.resolve('.'),
        env: {
          ...process.env,
          // GO_IPFS_DIST_URL: 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts'
        }
      });
    }
    catch (e) {
      console.error(e.stderr);
      if (packages === 'ipfs go-ipfs-dep ipfsd-ctl' && e.stderr.indexOf('ERR!') === -1) { return; }
      throw new Error('npm install failed');
    }
  }

  if (zeusbox.install['npm-scripts']) {
    var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
    packageJson.scripts = { ...packageJson.scripts, ...zeusbox.install['npm-scripts'] };
    fs.writeFileSync('./package.json', JSON.stringify(packageJson));
  }
  if (zeusbox.install['npm-in-dirs']) {
    await Promise.all(Object.keys(zeusbox.install['npm-in-dirs']).map(async dir => {
      var npmSection = zeusbox.install['npm-in-dirs'][dir];
      if (npmSection.npm) {
        var packages = Object.keys(npmSection.npm).map(pkg => {
          var ver = npmSection.npm[pkg];
          if (ver === true) {
            return pkg;
          }
          return `${pkg}@${ver}`;
        }).join(' ');
        console.log(emojMap.eight_pointed_black_star + 'NPM Install', packages.yellow, 'in', dir.cyan);
        await execPromise(`npm install --loglevel error ${packages}`, {
          cwd: path.resolve('.', dir),
          env: {
            ...process.env,
          }
        });
      }

      if (npmSection['npm-scripts']) {
        var packageJson = JSON.parse(fs.readFileSync(path.resolve('.', dir, './package.json')).toString());

        packageJson.scripts = { ...packageJson.scripts, ...npmSection['npm-scripts'] };
        fs.writeFileSync(path.resolve(dir, './package.json'), JSON.stringify(packageJson));
      }
    }));
  }
};
