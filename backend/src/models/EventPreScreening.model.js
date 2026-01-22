const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventPreScreening = sequelize.define('EventPreScreening', {
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
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pre_screening_questions',
        key: 'id'
      }
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'event_pre_screening',
    timestamps: true
  });

  return EventPreScreening;
};
