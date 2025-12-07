const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const AttendanceRecord = sequelize.define(
    'AttendanceRecord',
    {
      record_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      attendance_session_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      student_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      checkin_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('PRESENT', 'LATE', 'ABSENT', 'EXCUSED'),
        allowNull: false,
        defaultValue: 'ABSENT',
      },
      source: {
        type: DataTypes.ENUM('QR', 'CODE', 'MANUAL', 'GEO'),
        allowNull: true,
      },
      note: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Vĩ độ nơi điểm danh',
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Kinh độ nơi điểm danh',
      },
      no_gps_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Lý do không có GPS khi điểm danh',
      },
      is_valid: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        defaultValue: 1,
        comment: 'Điểm danh hợp lệ (1) hay không hợp lệ (0), NULL nếu chưa đánh giá',
      },
    },
    {
      tableName: 'attendance_records',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['attendance_session_id', 'student_id'],
        },
      ],
    }
  );

  return AttendanceRecord;
};
