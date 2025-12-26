const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BloodInventory = sequelize.define('BloodInventory', {
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
    donationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'donations',
        key: 'id'
      }
    },
    bloodGroup: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: false
    },
    donationType: {
      type: DataTypes.ENUM('Whole Blood', 'Plasma', 'Red Blood Cells', 'Platelets', 'Double Red Cells', 'Cryo', 'White Cells', 'Granulocytes'),
      allowNull: false,
      defaultValue: 'Whole Blood'
    },
    units: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    expirationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'used', 'discarded'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'blood_inventory',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  return BloodInventory;
};

