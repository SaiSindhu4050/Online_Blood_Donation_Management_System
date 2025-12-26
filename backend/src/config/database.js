const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'blood_donation_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  }
);

// Test connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Connected successfully');
  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error.message);
    process.exit(1);
  }
};

// Sync models function (call after models are loaded)
const syncModels = async () => {
  try {
    // Import models to ensure they're registered
    require('../models');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false }); // Set to true to auto-update tables
      console.log('✅ Database models synchronized');
    }
  } catch (error) {
    console.error('❌ Error syncing models:', error.message);
  }
};

module.exports = { sequelize, connectDB, syncModels };
