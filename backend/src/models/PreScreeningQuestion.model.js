const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PreScreeningQuestion = sequelize.define('PreScreeningQuestion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      },
      comment: 'NULL = system-wide question'
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    questionType: {
      type: DataTypes.ENUM('yes_no', 'multiple_choice', 'text', 'number'),
      defaultValue: 'yes_no'
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'For multiple_choice questions'
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    disqualifyingAnswer: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Answer that makes user ineligible'
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'pre_screening_questions',
    timestamps: true
  });

  return PreScreeningQuestion;
};
