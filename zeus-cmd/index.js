require('babel-core/register');

require('babel-core/register');
require('babel-polyfill');
const deployer = require('./dist/tools/deployer');
const artifacts = require('./dist/tools/artifacts');

module.exports = {
  deployer,
  artifacts
};
