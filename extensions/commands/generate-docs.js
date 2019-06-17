var path = require('path');
var os = require('os');
var fs = require('fs');
var {
  execPromise,
  emojMap
} = require('../../zeus-cmd/src/helpers/_exec');

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

const generateServiceDoc = async(subdir, boxName, zeusBoxJson, args) => {
  if (!zeusBoxJson.service) return;
  var outputDir = args['service-output-dir'];
  // var serviceName;
  var serviceName = zeusBoxJson.service;
  var boxOutputDir = path.join(outputDir, serviceName, serviceName) + "-service.md";
  // generate dir
  // load models/dapp-services/service
  // generate doc
  var model;
  var contractName = "";
  var prettyServiceName = "";
  var docContent = `
${prettyServiceName} Service
=================

## Overview
## Contract

\`\`\`${contractName}\`\`\`

## Service Commands

`
}

const generateBoxDoc = async(subdir, name, zeusBoxJson, args) => {
  var parts = subdir.split('/');
  var group = parts[parts.length - 2]

  var outputDir = args['box-output-dir'];
  var boxOutputPath = path.join(outputDir, name) + ".md";
  var dependencies = [];
  if (zeusBoxJson.dependencies)
    dependencies = zeusBoxJson.dependencies;
  var tags = [];
  if (zeusBoxJson.tags)
    tags = zeusBoxJson.tags;
  var install = zeusBoxJson.install;
  var npmPackages = [];
  if (install && install.npm) {
    npmPackages = Object.keys(install.npm);
  }
  var contracts = [];
  if (install && install.contracts) {
    contracts = Object.keys(install.contracts);
  }
  var newCommands = [];
  var newSubCommands = [];
  var commandsDir = path.join(subdir, "extensions", "commands");
  if (fs.existsSync(commandsDir)) {
    newCommands = fs.readdirSync(commandsDir).map(name => path.join(commandsDir, name)).filter(a => !isDirectory(a) && a.endsWith('.js'));
    var directories = getDirectories(path.resolve(commandsDir));
    var boxes = directories.map(d => fs.readdirSync(d).map(name => path.join(d, name)).filter(a => !isDirectory(a) && a.endsWith('.js')));
    // console.log('new command', newCommands);

    boxes.forEach(c => {
      newSubCommands = [...newSubCommands, ...c];
    });
    // console.log('new sub command', newSubCommands);
  }
  var examples = {};
  if (zeusBoxJson.commands) {
    examples = zeusBoxJson.commands;
  }

  // model types
  var modelTypes = [];
  var modelGroups = {};
  var modelsDir = path.join(subdir, "models");
  if (fs.existsSync(modelsDir)) {
    var modelDirs = getDirectories(path.resolve(modelsDir));
    for (var i = 0; i < modelDirs.length; i++) {
      var modelDir = modelDirs[i];
      var models = fs.readdirSync(modelDir).map(name => path.join(modelDir, name)).filter(a => !isDirectory(a) && a.endsWith('.json'));
      if (models.length) {
        // non empty
        modelGroups[modelDir] = models;
      }
      else {

        modelTypes.push(modelDir);
      }
    }

  }

  var gitRoot = `https://github.com/liquidapps-io/zeus-sdk/tree/master/boxes/groups/${group}/${name}`;
  // generate docs
  var docContent = `
${name} 
====================
${(tags.length > 0 || zeusBoxJson.description) ? `## Overview` : ''}
${(zeusBoxJson.description) ? zeusBoxJson.description : ''}
${tags.length ? `### Tags` : ''}
${tags.map(tag=>{
return `\`${tag}\``
}).join(' ')}
${(dependencies.length + npmPackages.length) ? `## Dependencies` : ''}
${dependencies.length ? `### Boxes` : ''}
${dependencies.map(boxName=>{
return `* [\`${boxName}\`](${boxName}.md)`
}).join('\n')}
${npmPackages.length ? `### npm packages` : ''}
${npmPackages.map(packageName=>{
return `* [\`${packageName}\`](http://npmjs.com/package/${packageName})`
}).join('\n')}
${contracts.length ? `## Contracts` : ''}
${contracts.map(contractName=>{
  return `* [\`${contractName}\`](${gitRoot}/contracts/eos/${contractName})`
}).join('\n')}
## Install
\`\`\`bash
zeus unbox ${name}
\`\`\`
${Object.keys(examples).length ? `## Examples` : ''}
${Object.keys(examples).map(exampleKey=>{
return `### ${exampleKey} 
\`\`\`bash
${examples[exampleKey]}
\`\`\``}).join('\n')}
${(newCommands.length + newSubCommands.length) ? `## Zeus Command Extensions` : ''}
${newCommands.map(commandPath=>{
  var commandParts = commandPath.split('/');
  var commandName = commandParts[commandParts.length-1].split('.').slice(0, -1).join('.');

return `* \`\`\`zeus ${commandName}  --help\`\`\`
`}).join('\n')}
${(newSubCommands.length) ? `### Subcommands` : ''}
${newSubCommands.map(commandPath=>{
  var commandParts = commandPath.split('/');
  var commandName = commandParts[commandParts.length-2];
  var subCommandName = commandParts[commandParts.length-1].split('.').slice(0, -1).join('.');
  return `* \`\`\`zeus ${commandName} ${subCommandName} --help\`\`\`
`}).join('\n')}

${(modelGroups.length || modelTypes.length) ? `## Models` : ''}
${(modelTypes.length) ? `### New Model Types` : ''}
${modelTypes.map(modelType=>{
  var group = path.basename(modelType);

  return `* ${group}`}).join('\n')}
${Object.keys(modelGroups).length ? `### Model Instances` : ''}
${Object.keys(modelGroups).map(groupDir=>{
  var group = path.basename(groupDir);
  return modelGroups[groupDir].map(modelInstance => {
    var pathParts = modelInstance.split('/');
    var instanceName = pathParts[pathParts.length-1];
    var modelPath = path.join(subdir, "models",group,instanceName);
    var content = JSON.parse(fs.readFileSync(modelPath));
    return `#### [${group}/${instanceName}](${gitRoot}/models/${group}/${instanceName})
\`\`\`json
${JSON.stringify(content,null,2)}
\`\`\``})}).join('\n')}
## [Source](${gitRoot})
`

  fs.writeFileSync(boxOutputPath, docContent);
  // console.log(docContent);
}

const generateDoc = async(subdir, args) => {
  var name = path.basename(subdir);
  try {
    var zeusBoxJsonPath = path.join(subdir, 'zeus-box.json');
    if (!fs.existsSync(zeusBoxJsonPath)) {
      throw new Error('zeus-box.json not found');
    }
    var zeusBoxJson = JSON.parse(fs.readFileSync(zeusBoxJsonPath));
    await generateServiceDoc(subdir, name, zeusBoxJson, args);
    await generateBoxDoc(subdir, name, zeusBoxJson, args);

    console.log(emojMap.ok + `${name}`);
  }
  catch (e) {
    console.error(`error generating docs for: ${subdir}`, e);
    throw e;
  }
};

module.exports = {
  description: '',
  builder: (yargs) => {
    return yargs.example('$0 generate-docs ./docs/boxes ./docs/services');
  },
  command: 'generate-docs <box-output-dir> <service-output-dir>',
  handler: async(args) => {
    var dirs = await getAllBoxes(path.resolve('.', 'boxes/groups'));

    console.log(emojMap.fleur_de_lis + `Generate docs`);
    try {
      await Promise.all(dirs.map(subdir => generateDoc(subdir, args)));

      console.log(emojMap.relaxed + 'done.');
    }
    catch (e) {
      console.error(e);
      console.log(emojMap.white_frowning_face + 'generate-docs deploy failed.');
      throw new Error('failed');
    }
  }
};
