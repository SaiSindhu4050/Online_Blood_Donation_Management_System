const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Donation = sequelize.define('Donation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 18,
        max: 65
      }
    },
    bloodGroup: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastDonationDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    medicalConditions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    preferredDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    preferredTime: {
      type: DataTypes.STRING,
      allowNull: true
    },
    selectedOrganization: {
      type: DataTypes.STRING,
      allowNull: true
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'events',
        key: 'id'
      }
    },
    eventName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    eventDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    requestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'requests',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'scheduled', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    scheduledDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scheduledTime: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'donations'
  });

  return Donation;
};
