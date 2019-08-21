'use strict';
module.exports = (sequelize, DataTypes) => {
  var EosTransaction = sequelize.define('EosTransaction', {
    id: DataTypes.STRING
  });

  EosTransaction.associate = function (models) {

  };

  return EosTransaction;
};
