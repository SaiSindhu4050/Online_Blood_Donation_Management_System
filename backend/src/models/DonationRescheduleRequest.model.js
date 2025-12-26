const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DonationRescheduleRequest = sequelize.define('DonationRescheduleRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    oldDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    oldTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    newDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    newTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'donation_reschedule_requests',
    timestamps: true
  });

  return DonationRescheduleRequest;
};

