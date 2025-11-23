const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Session = sequelize.define('Session', {
    session_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    class_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    room: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    topic: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ONGOING', 'FINISHED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ONGOING'
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'sessions',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['class_id', 'date']
      }
    ]
  });

  return Session;
};

