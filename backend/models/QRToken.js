const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QRToken = sequelize.define('QRToken', {
    qr_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    attendance_session_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    token: {
      type: DataTypes.CHAR(16),
      allowNull: false,
      unique: true
    },
    issued_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'qr_tokens',
    timestamps: false
  });

  return QRToken;
};

