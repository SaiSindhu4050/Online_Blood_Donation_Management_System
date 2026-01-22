/**
 * Script to create an admin account with username
 * Usage: node scripts/createAdmin.js <username> <password> <fullName> [email] [role]
 * 
 * Example:
 * node scripts/createAdmin.js Sindhu_7100 mypassword123 "Sindhu" sindhu@example.com admin
 */

const { Admin } = require('../src/models');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node scripts/createAdmin.js <username> <password> <fullName> [email] [role]');
    console.error('Example: node scripts/createAdmin.js Sindhu_7100 password123 "Sindhu" sindhu@example.com admin');
    process.exit(1);
  }

  const [username, password, fullName, email, role = 'admin'] = args;

  try {
    // Check if admin with this username already exists
    const existingAdmin = await Admin.findOne({ where: { username } });
    
    if (existingAdmin) {
      console.log(`Admin with username "${username}" already exists.`);
      console.log('Updating password and details...');
      
      // Update existing admin
      existingAdmin.password = password; // Will be hashed by the model hook
      existingAdmin.fullName = fullName;
      if (email) existingAdmin.email = email;
      existingAdmin.role = role;
      existingAdmin.isActive = true;
      
      await existingAdmin.save();
      console.log(`✅ Admin "${username}" updated successfully!`);
    } else {
      // Create new admin
      const admin = await Admin.create({
        username,
        password, // Will be hashed by the model hook
        fullName,
        email: email || null,
        role,
        isActive: true
      });
      
      console.log(`✅ Admin "${username}" created successfully!`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Full Name: ${admin.fullName}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email || 'Not set'}`);
      console.log(`   Role: ${admin.role}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('   A user with this username or email already exists.');
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  // Initialize database connection
  const { connectDB, syncModels } = require('../src/config/database');
  
  connectDB()
    .then(() => {
      syncModels();
      return createAdmin();
    })
    .catch(error => {
      console.error('Database connection error:', error);
      process.exit(1);
    });
}

module.exports = { createAdmin };
