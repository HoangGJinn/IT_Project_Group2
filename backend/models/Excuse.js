const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Excuse = sequelize.define('Excuse', {
    excuse_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    attendance_session_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    student_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    proof_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    reviewed_by: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'excuses',
    timestamps: false
  });

  return Excuse;
};

