const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventCheckin = sequelize.define('EventCheckin', {
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
      allowNull: false,
      references: {
        model: 'donations',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    checkInMethod: {
      type: DataTypes.ENUM('qr_code', 'manual', 'self'),
      defaultValue: 'manual'
    },
    checkedInBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      },
      comment: 'Organization staff member who checked in (if manual)'
    },
    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional notes from staff'
    }
  }, {
    tableName: 'event_checkins',
    timestamps: false // Using checkedInAt as timestamp
  });

  return EventCheckin;
};
