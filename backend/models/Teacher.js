const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Teacher = sequelize.define('Teacher', {
    teacher_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    teacher_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    academic_title: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'teachers',
    timestamps: false
  });

  return Teacher;
};

