// 'use strict';

var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');
var basename = path.basename(__filename);
const logger = require('../../../../extensions/helpers/logger');

var env = process.env.DATABASE_NODE_ENV || 'development';

if (process.env.DATABASE_URL)
  env = 'production';
var config = require(__dirname + '/../config/config.js')[env];
var db = {};
logger.info(`starting db: env - ${env}, dialect - ${config.dialect}`);
var sequelize;
try {
  if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
  }
  else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
  }
}
catch (e) {
  logger.error(`error initing db: ${config.dialect} ${env} ${e.toString()}`);
  throw e;
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    var model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
