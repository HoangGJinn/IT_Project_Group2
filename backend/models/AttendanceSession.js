const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const AttendanceSession = sequelize.define(
    'AttendanceSession',
    {
      attendance_session_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      session_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
      },
      method: {
        type: DataTypes.ENUM('QR', 'CODE', 'MANUAL', 'GEO'),
        allowNull: false,
      },
      open_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      close_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      late_after_minutes: {
        type: DataTypes.SMALLINT,
        allowNull: true,
      },
      teacher_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      teacher_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      location_radius: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 15,
        comment: 'Bán kính cho phép điểm danh (mét), mặc định 15m (phạm vi 10-20m)',
      },
    },
    {
      tableName: 'attendance_sessions',
      timestamps: false,
    }
  );

  return AttendanceSession;
};
