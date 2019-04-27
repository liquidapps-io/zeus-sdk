var path = require('path');
const fs = require('fs');
var unbox = require('./unbox');

const { lstatSync, readdirSync } = fs;
const { join } = require('path');

const isFile = source => !lstatSync(source).isDirectory();

const getFiles = (source, ext) =>
  readdirSync(source).map(name => join(source, name)).filter(isFile).filter(a => a.endsWith(ext)).sort();

const loadRepos = async () => {
  return getFiles('./models/repos', '.json').map(a => JSON.parse(fs.readFileSync(a).toString()));
};

const fetchBoxMaps = async (args, repo) => {
  var mappings = {};

  if (repo.type == 'eos') {
    await require(`./update/${repo.type}`)(args, repo, mappings);
  }

  fs.writeFileSync(`./models/boxmaps/50-${repo.name}.json`, JSON.stringify(mappings));
};

module.exports = {
  description: 'updates all box',
  builder: (yargs) => {
    yargs.option('boxes', {
      // describe: '',
      default: false
    }).option('repos', {
      // describe: '',
      default: true
    }).example('$0 update --boxes');
  },
  command: 'update',
  handler: async (args) => {
    args.update = true;

    // fetch boxmaps from online repo, put in ../boxmaps/aaa.json

    if (args.repos) {
      const repos = await loadRepos();
      await Promise.all(repos.map(repo => fetchBoxMaps(args, repo)));
    }

    if (args.boxes) {
      var currentzeusBoxJson = JSON.parse(fs.readFileSync(path.resolve('./zeus-box.json')));
      if (!currentzeusBoxJson.dependencies) { return; }
      for (var i = 0; i < currentzeusBoxJson.dependencies.length; i++) {
        var dep = currentzeusBoxJson.dependencies[i];
        if (dep.startsWith('ipfs://')) { continue; }
        args.box = dep;
        await unbox.handler(args);
      }
    }
  }
};
