const fs = require('fs');
const path = require('path');
const { lstatSync, readdirSync } = fs;
const { join } = require('path');
const yaml = require('js-yaml');

const isFile = source => !lstatSync(source).isDirectory();
const getFiles = (source, ext) =>
  readdirSync(source).map(name => join(source, name)).filter(isFile).filter(a => a.endsWith(ext)).sort();

const loadModels = async (name) => [...getFiles(path.resolve(`./models/${name}`), '.json').map(file => {
  try {
    return JSON.parse(fs.readFileSync(file).toString());
  } catch (e) {
    throw new Error(`failed parsing ${file}:${e}`);
  }
}), ...getFiles(path.resolve(`./models/${name}`), '.yaml').map(file => {
  try {
    return yaml.safeLoad(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`failed parsing ${file}:${e}`);
  }
})];

const saveModel = async (name, modelName, obj) =>
  fs.writeFileSync(path.resolve(`./models/${name}/${modelName}.json`), JSON.stringify(obj));

const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
  .toString(16).substring(1);

const guid = () => s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();

const saveUniqueModel = async (name, obj) => saveModel(name, guid(), obj);

module.exports = { loadModels, saveModel, saveUniqueModel };
