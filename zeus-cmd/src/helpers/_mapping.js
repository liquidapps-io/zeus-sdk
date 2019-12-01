const path = require('path');
const fs = require('fs');

const DEFAULT = require('../../defaults/mapping.json');

const MAPPINGFILE = 'mapping.json';

const local = (storagePath) => {
  const localMappingFile = path.join(storagePath, MAPPINGFILE);
  return fs.existsSync(localMappingFile) ? JSON.parse(fs.readFileSync(localMappingFile)) : {};
};

const load = (storagePath) => {
  const localMapping = local(storagePath);
  return Object.assign({}, DEFAULT, localMapping);
};

const update = (storagePath, box, uri) => {
  const localMapping = local(storagePath);
  localMapping[box] = uri;
  const localMappingFile = path.join(storagePath, MAPPINGFILE);
  fs.writeFileSync(localMappingFile, JSON.stringify(localMapping, null, 2));
};

module.exports = { load, update };
