const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Request = sequelize.define('Request', {
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
    requestType: {
      type: DataTypes.ENUM('self', 'others'),
      allowNull: false
    },
    patientName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true
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
    bloodGroup: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: false
    },
    donationType: {
      type: DataTypes.ENUM('Whole Blood', 'Plasma', 'Red Blood Cells', 'Platelets', 'Double Red Cells', 'Cryo', 'White Cells', 'Granulocytes'),
      defaultValue: 'Whole Blood'
    },
    unitsRequired: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    urgency: {
      type: DataTypes.ENUM('emergency', 'urgent', 'normal'),
      allowNull: false
    },
    requiredDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    hospitalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    hospitalAddress: {
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
    patientCondition: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    doctorName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    doctorContact: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'matched', 'fulfilled', 'cancelled'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'requests'
  });

  return Request;
};
