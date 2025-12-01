const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Class = sequelize.define('Class', {
    class_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    course_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    class_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    teacher_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    semester: {
      type: DataTypes.ENUM('HK1', 'HK2', 'HK3'),
      allowNull: false
    },
    school_year: {
      type: DataTypes.STRING(9),
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    planned_sessions: {
      type: DataTypes.SMALLINT,
      allowNull: true
    },
    default_duration_min: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: 90
    },
    default_late_after_min: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: 15
    },
    early_start_minutes: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: 0,
      comment: 'Cho phép bắt đầu điểm danh trước giờ học (phút)'
    },
    default_method: {
      type: DataTypes.ENUM('QR', 'CODE', 'MANUAL', 'GEO'),
      allowNull: true,
      defaultValue: 'QR'
    },
    schedule_days: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    schedule_periods: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Ngày bắt đầu môn học'
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Ngày kết thúc môn học'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Vĩ độ của địa điểm lớp học'
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Kinh độ của địa điểm lớp học'
    },
    location_radius: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 100,
      comment: 'Bán kính cho phép điểm danh (mét), mặc định 100m'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'classes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return Class;
};

