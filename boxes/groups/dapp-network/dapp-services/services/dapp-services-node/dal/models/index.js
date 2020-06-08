// 'use strict';

var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');
var basename = path.basename(__filename);
const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');

var env = process.env.DATABASE_NODE_ENV || 'development';
const dbTimeout = process.env.DATABASE_TIMEOUT || '10000';

if (process.env.DATABASE_URL && process.env.DATABASE_URL !== "false") {
  env = 'production';
}
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
    db[model.name] = addTimeoutProxy(model, dbTimeout, model.name);
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// returns es6 proxy that intercepts async method calls and throws
// if the method doesn't resolve within a given time
function addTimeoutProxy(obj, timeout, objName) {
  const handler = {
    get(target, propKey, receiver) {
      const origMethod = target[propKey];
      if (typeof (origMethod) !== 'function')
        return origMethod;

      return function (...args) {
        // logger.debug(`${objName} with method ${propKey} calling`);
        const timedMethod = async function () {
          const beforeTime = Date.now();
          const result = await origMethod.apply(target, args);
          const totalTime = Date.now() - beforeTime;
          if (totalTime > 200)
            logger.warn(`${objName} with method ${propKey} took ${totalTime} ms`);

          return result;
        }
        return Promise.race([
          timedMethod(),
          new Promise((resolve, reject) => {
            setTimeout(() => reject('db timeout'), timeout);
          })
        ]);
      };
    }
  };
  return new Proxy(obj, handler);
}

db.sequelize = addTimeoutProxy(sequelize, dbTimeout, 'sequelize');
db.Sequelize = addTimeoutProxy(Sequelize, dbTimeout, 'Sequelize');

module.exports = db;

