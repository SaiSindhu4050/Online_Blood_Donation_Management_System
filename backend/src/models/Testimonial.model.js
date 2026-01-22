const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Testimonial = sequelize.define('Testimonial', {
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
      },
      onDelete: 'SET NULL'
    },
    donationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'donations',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    requestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'requests',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    userType: {
      type: DataTypes.ENUM('donor', 'requestor', 'family_member'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    authorName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    authorRole: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'testimonials',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  return Testimonial;
};
