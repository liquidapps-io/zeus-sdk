'use strict';
module.exports = (sequelize, DataTypes) => {
  const Nonce = sequelize.define('Nonce', {
    key: DataTypes.STRING,
    data: DataTypes.JSON
  }, {});
  return Nonce;
};