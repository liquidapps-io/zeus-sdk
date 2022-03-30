'use strict';
module.exports = (sequelize, DataTypes) => {
  const Settings = sequelize.define('Settings', {
    key: DataTypes.STRING,
    data: DataTypes.JSON
  }, {});
  return Settings;
};