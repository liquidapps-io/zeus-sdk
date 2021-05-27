'use strict';
module.exports = (sequelize, DataTypes) => {
  const Nonce = sequelize.define('Nonce', {
    key: DataTypes.STRING,
    data: DataTypes.JSON
  }, {});
  Nonce.associate = function(models) {
    // associations can be defined here
  };
  return Nonce;
};