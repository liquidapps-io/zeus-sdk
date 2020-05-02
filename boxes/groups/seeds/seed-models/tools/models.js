const { getBoxName, getBoxesDir } = require('@liquidapps/box-utils');
const fs = require('fs');
const path = require('path');
const { lstatSync, readdirSync } = fs;
const { join } = require('path');
const yaml = require('js-yaml');

const isFile = source => !lstatSync(source).isDirectory();
const getFiles = (source, ext) =>
  readdirSync(source).map(name => join(source, name)).filter(isFile).filter(a => a.endsWith(ext)).sort();

const loadModels = (name) => {
  var boxesDir = getBoxesDir();
  var list = fs.readdirSync(boxesDir, { withFileTypes: true });
  let returnModels = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].isDirectory()) {
      var extPath = path.join(boxesDir, list[i].name, `models/${name}`);
      if (fs.existsSync(extPath)) {
        [...getFiles(path.resolve(extPath), '.json').map(file => {
          try {
            returnModels.push(JSON.parse(fs.readFileSync(file).toString()));
          }
          catch (e) {
            throw new Error(`failed parsing ${file}:${e}`);
          }
        }), ...getFiles(path.resolve(extPath), '.yaml').map(file => {
          try {
            returnModels.push(yaml.safeLoad(fs.readFileSync(file, 'utf8')));
          }
          catch (e) {
            throw new Error(`failed parsing ${file}:${e}`);
          }
        })];
      }
    }
  }
  return returnModels;
};

const saveModel = async (name, modelName, obj) => {
  // if another file matches the file name searched, a wrong box can be returned
  const box = getBoxName(`${name}`);
  fs.writeFileSync(path.resolve(`./zeus_boxes/${box}/models/${name}/${modelName}.json`), JSON.stringify(obj));
}

const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
  .toString(16).substring(1);

const guid = () => s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();

const saveUniqueModel = async (name, obj) => saveModel(name, guid(), obj);

module.exports = { loadModels, saveModel, saveUniqueModel };
