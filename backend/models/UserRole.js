const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true
    },
    role_id: {
      type: DataTypes.TINYINT,
      primaryKey: true
    }
  }, {
    tableName: 'user_roles',
    timestamps: false
  });

  return UserRole;
};

