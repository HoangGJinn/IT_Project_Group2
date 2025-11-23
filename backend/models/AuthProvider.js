const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuthProvider = sequelize.define('AuthProvider', {
    auth_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    provider: {
      type: DataTypes.ENUM('LOCAL', 'GOOGLE'),
      allowNull: false,
      defaultValue: 'LOCAL'
    },
    provider_uid: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'auth_providers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
  });

  return AuthProvider;
};

