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
  return Object.assign({}, BUILTIN, localMapping);
};

const add = (storagePath, box, uri) => {
  if (box in getBuiltin()) {
    console.log("WARNING:", box, "already in builtin mapping. Unboxing will use local mapping. If you wish to revert to builtin mapping, use zeus box remove", box);
  }
  const localMapping = getLocal(storagePath);
  localMapping[box] = uri;
  const localMappingFile = path.join(storagePath, MAPPINGFILE);
  fs.writeFileSync(localMappingFile, JSON.stringify(localMapping, null, 2));
  // check if box in localMapping, if so say already exists, if not say added
  if(box in localMapping)  {
    console.log(`Updating local mapping ${box}: ${uri}`);
  } else {
    console.log(`Added to local mapping ${box}: ${uri}`);
  }
};

const remove = (storagePath, box) => {
  const localMapping = getLocal(storagePath);
  if (!(box in localMapping)) {
    console.log('Box with name', box, 'not found in local mapping');
    return;
  }
  delete localMapping[box];
  const localMappingFile = path.join(storagePath, MAPPINGFILE);
  fs.writeFileSync(localMappingFile, JSON.stringify(localMapping, null, 2));
  console.log('Removed', box, 'from local mapping');
};

const boxInBothMappings = (storagePath, box) => {
  const localMapping = getLocal(storagePath);
  if (box in localMapping && box in getBuiltin()) {
    return true;
  }
  return false;
}

module.exports = { getBuiltin, getLocal, getCombined, add, remove, boxInBothMappings };