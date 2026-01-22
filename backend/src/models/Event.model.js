const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    eventDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    eventEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isMultiDay: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    startTime: {
      type: DataTypes.STRING,
      defaultValue: '09:00'
    },
    endTime: {
      type: DataTypes.STRING,
      defaultValue: '17:00'
    },
    locationAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'location_address'
    },
    locationCity: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'location_city'
    },
    locationState: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'location_state'
    },
    locationZipCode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'location_zip_code'
    },
    targetBloodGroups: {
      type: DataTypes.JSON,
      allowNull: true
    },
    targetUnits: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    maxRegistrations: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'upcoming'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cancelledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    originalEventDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rescheduledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rescheduleReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rescheduledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    rescheduleCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    requiresPreScreening: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    preScreeningDeadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    autoRejectIneligible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'events'
  });

  return Event;
};
