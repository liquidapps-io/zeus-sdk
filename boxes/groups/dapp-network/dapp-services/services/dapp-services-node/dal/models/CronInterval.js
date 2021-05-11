'use strict';
module.exports = (sequelize, DataTypes) => {
  const CronInterval = sequelize.define('CronInterval', {
    key: { type: DataTypes.STRING, unique: true },
    event: DataTypes.JSON,
    timer: DataTypes.STRING,
    payload: DataTypes.JSON,
    seconds: DataTypes.INTEGER,
  }, {
    version: true,
    timestamps: true,
  });
  return CronInterval;
};
