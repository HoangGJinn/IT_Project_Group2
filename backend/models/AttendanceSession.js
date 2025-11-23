const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AttendanceSession = sequelize.define('AttendanceSession', {
    attendance_session_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    method: {
      type: DataTypes.ENUM('QR', 'CODE', 'MANUAL', 'GEO'),
      allowNull: false
    },
    open_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    close_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    late_after_minutes: {
      type: DataTypes.SMALLINT,
      allowNull: true
    }
  }, {
    tableName: 'attendance_sessions',
    timestamps: false
  });

  return AttendanceSession;
};

