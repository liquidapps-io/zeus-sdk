const path = require('path');
const fs = require('fs');

const BUILTIN = require('../resources/builtin-mapping.json');

const MAPPINGFILE = 'mapping.json';

const getBuiltin = () => {
  return BUILTIN;
};

const getLocal = (storagePath) => {
  const localMappingFile = path.join(storagePath, MAPPINGFILE);
  return fs.existsSync(localMappingFile) ? JSON.parse(fs.readFileSync(localMappingFile)) : {};
};

const getCombined = (storagePath) => {
  const localMapping = getLocal(storagePath);
  let combinedMapping = {};
  Object.assign(combinedMapping, BUILTIN);
  for (let localBox of Object.keys(localMapping)) {
    if (localBox in combinedMapping) {
      for (let localBoxVersion of Object.keys(localMapping[localBox])) {
        combinedMapping[localBox][localBoxVersion] = localMapping[localBox][localBoxVersion];
      }
    } else {
      combinedMapping[localBox] = localMapping[localBox];
    }
  }
  return combinedMapping;
};

const add = (storagePath, box, version, uri) => {
  if (box in getBuiltin()) {
    console.log(`\nWARNING:`, box, `already in builtin mapping. Local mapping will take precedence over built-in mapping if versions are equal. If you wish to revert to builtin mapping, use zeus box remove\n`, box);
  }
  const localMapping = getLocal(storagePath);
  var newLocalMapping = localMapping;
  if (!(box in localMapping)) {
    newLocalMapping[box] = {};
  }
  newLocalMapping[box][version] = uri;
  const localMappingFile = path.join(storagePath, MAPPINGFILE);
  fs.writeFileSync(localMappingFile, JSON.stringify(newLocalMapping, null, 2));
  // check if box in localMapping, if so say already exists, if not say added
  if (box in localMapping) {
    console.log(`Updating local mapping ${box}@${version}: ${uri}`);
  } else {
    console.log(`Added to local mapping ${box}@${version}: ${uri}`);
  }
};

const remove = (storagePath, box, version) => {
  const localMapping = getLocal(storagePath);
  if (!(box in localMapping)) {
    console.log('Box with name', box, 'not found in local mapping');
    return;
  }
  if (!(version in localMapping[box])) {
    console.log('Box with name', box, 'and version', version, 'not found in local mapping');
    return;
  }
  delete localMapping[box][version];
  const localMappingFile = path.join(storagePath, MAPPINGFILE);
  fs.writeFileSync(localMappingFile, JSON.stringify(localMapping, null, 2));
  console.log('Removed', box, 'version', version, 'from local mapping');
};

const boxInBothMappings = (storagePath, box, version) => {
  const localMapping = getLocal(storagePath);
  if (box in localMapping && box in getBuiltin()) {
    if (version in localMapping[box] && version in getBuiltin()[box]) {
      return true;
    }
  }
  return false;
}

module.exports = { getBuiltin, getLocal, getCombined, add, remove, boxInBothMappings };