const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Course = sequelize.define('Course', {
    course_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    credits: {
      type: DataTypes.TINYINT,
      allowNull: false
    },
    department_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    }
  }, {
    tableName: 'courses',
    timestamps: false
  });

  return Course;
};

