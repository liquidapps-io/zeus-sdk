'use strict';
module.exports = (sequelize, DataTypes) => {
  const Settings = sequelize.define('Settings', {
    key: DataTypes.STRING,
    data: DataTypes.JSON
  }, {});
  Settings.associate = function(models) {
    // associations can be defined here
  };
  return Settings;
};