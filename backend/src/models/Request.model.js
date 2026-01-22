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
      type: DataTypes.ENUM('emergency', 'urgent', 'normal', 'scheduled'),
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
    hospitalCity: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Hospital city - used for donor matching'
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Legacy field - kept for backward compatibility, but hospitalCity should be used'
    },
    requestorCity: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Requestor/patient city (if different from hospital city)'
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
      type: DataTypes.ENUM('pending', 'matched', 'fulfilled', 'cancelled', 'IN_PROGRESS'),
      defaultValue: 'pending'
    },
    currentDonorsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of donors who have accepted this request'
    },
    // Donor-First Workflow fields
    workflowPhase: {
      type: DataTypes.ENUM('gathering', 'critical_wait', 'assessment', 'hard_stop', 'completed'),
      defaultValue: 'gathering',
      comment: 'Current phase of the donor-first workflow'
    },
    requestCreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the request was created (for 2-hour timer)'
    },
    patientReadyAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When admin clicked "Patient is Ready"'
    },
    waitForDonorsStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When 30-minute wait for donors started'
    },
    waitForDonorsEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When 30-minute wait for donors ends'
    },
    assessmentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When 1-hour assessment phase starts'
    },
    hardStopAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When 2-hour hard stop occurs'
    },
    inventoryLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether inventory is locked (donor-first workflow)'
    },
    unitsCollected: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of units collected from donors'
    },
    emergencyOverride: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether emergency override was used to unlock inventory'
    },
    donorETAs: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of donor ETA objects: {donorId, eta, status}'
    },
    finalCallSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether final call notification was sent at 1-hour mark'
    },
    inventoryUnlockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When inventory was unlocked (after 2 hours or emergency override)'
    }
  }, {
    tableName: 'requests'
  });

  return Request;
};
