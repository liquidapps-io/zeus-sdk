'use strict';
module.exports = (sequelize, DataTypes) => {
  const ServiceRequest = sequelize.define('ServiceRequest', {
    key: DataTypes.STRING,
    value: DataTypes.JSON // simple key value
  }, {});
  return ServiceRequest;
};