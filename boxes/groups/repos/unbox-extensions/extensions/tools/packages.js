const fs = require('fs');
const path = require('path');
const { lstatSync, readdirSync } = fs;
const { join } = require('path');

var crypto = require('crypto');
var algorithm = 'aes-256-ctr';

function decrypt (text, password) {
  var decipher = crypto.createDecipher(algorithm, password);
  var dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

const isFile = source => !lstatSync(source).isDirectory();
const getFiles = (source, ext) =>
  readdirSync(source).map(name => join(source, name)).filter(isFile).filter(a => a.endsWith(ext)).sort();

const loadPackages = async (args) => {
  var maps = getFiles(path.resolve('./models/boxmaps'), '.json');
  var mappings = {};
  for (var i = 0; i < maps.length; i++) {
    var mapFile = maps[i];
    var mapObject = JSON.parse(fs.readFileSync(mapFile).toString());
    mappings = { ...mappings, ...mapObject };
  }
  if (args.specialBoxkey) {
    var encmaps = getFiles(path.resolve('./models/boxmaps'), '.json.enc');
    for (var i = 0; i < encmaps.length; i++) {
      var mapEncFile = encmaps[i];
      var encrypted = fs.readFileSync(mapEncFile).toString();
      var decr = decrypt(encrypted, args.specialBoxkey);
      try {
        var newMapping = JSON.parse(decr);
        mappings = { ...mappings, ...newMapping };
      } catch (e) {
        // wrong key
      }
    }
  }
  return mappings;
};
module.exports = { decrypt, loadPackages };
