const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('BLOOD_REQUEST', 'SHARE_REQUEST', 'REQUEST_ACCEPTED', 'CAMPAIGN', 'DONATION_COMPLETED', 'EVENT_REMINDER_24H', 'EVENT_REMINDER_2H', 'EVENT_WAITLIST_SPOT_AVAILABLE', 'EVENT_CHECKIN_CONFIRMED', 'EVENT_CANCELLED', 'EVENT_RESCHEDULED', 'PRE_SCREENING_REMINDER', 'PRE_SCREENING_COMPLETED', 'PRE_SCREENING_INELIGIBLE'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isCompatible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isSameLocation: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Stores the RequestID or DonationID'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'notifications',
    timestamps: true
  });

  return Notification;
};

