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
    status: {
      type: DataTypes.ENUM('upcoming', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'upcoming'
    }
  }, {
    tableName: 'events'
  });

  return Event;
};
