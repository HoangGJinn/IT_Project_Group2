const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Enrollment = sequelize.define('Enrollment', {
    enrollment_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    class_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    student_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ENROLLED', 'DROPPED'),
      allowNull: false,
      defaultValue: 'ENROLLED'
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'enrollments',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['class_id', 'student_id']
      }
    ]
  });

  return Enrollment;
};

