const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Student = sequelize.define('Student', {
    student_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    student_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    class_cohort: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'students',
    timestamps: false
  });

  return Student;
};

