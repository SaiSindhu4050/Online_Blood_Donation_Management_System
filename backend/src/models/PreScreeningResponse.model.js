const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PreScreeningResponse = sequelize.define('PreScreeningResponse', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      }
    },
    donationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'donations',
        key: 'id'
      },
      comment: 'Linked to donation registration'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pre_screening_questions',
        key: 'id'
      }
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isEligible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'False if answer disqualifies user'
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'pre_screening_responses',
    timestamps: false // Using respondedAt as timestamp
  });

  return PreScreeningResponse;
};
