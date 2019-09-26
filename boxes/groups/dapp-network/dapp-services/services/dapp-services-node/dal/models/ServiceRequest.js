'use strict';
module.exports = (sequelize, DataTypes) => {
  const ServiceRequest = sequelize.define('ServiceRequest', {
    key: { type: DataTypes.STRING, unique: true },
    data: DataTypes.JSON,
    request_block_num: DataTypes.INTEGER,
    signal_block_num: DataTypes.INTEGER,
    usage_block_num: DataTypes.INTEGER
  }, {
    paranoid: true,
    version: true,
    timestamps: true,
  });
  return ServiceRequest;
};
