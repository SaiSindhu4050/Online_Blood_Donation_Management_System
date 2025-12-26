const { sequelize } = require('../config/database');
const UserModel = require('./User.model');
const OrganizationModel = require('./Organization.model');
const DonationModel = require('./Donation.model');
const RequestModel = require('./Request.model');
const EventModel = require('./Event.model');
const BloodInventoryModel = require('./BloodInventory.model');
const DonationRescheduleRequestModel = require('./DonationRescheduleRequest.model');
const NotificationModel = require('./Notification.model');

// Initialize models
const User = UserModel(sequelize);
const Organization = OrganizationModel(sequelize);
const Donation = DonationModel(sequelize);
const Request = RequestModel(sequelize);
const Event = EventModel(sequelize);
const BloodInventory = BloodInventoryModel(sequelize);
const DonationRescheduleRequest = DonationRescheduleRequestModel(sequelize);
const Notification = NotificationModel(sequelize);

// Define associations
User.hasMany(Donation, { foreignKey: 'userId', as: 'donations' });
Donation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Request, { foreignKey: 'userId', as: 'requests' });
Request.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Organization.hasMany(Event, { foreignKey: 'organizationId', as: 'events' });
Event.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Event.hasMany(Donation, { foreignKey: 'eventId', as: 'donations' });
Donation.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

Request.hasMany(Donation, { foreignKey: 'requestId', as: 'interestedDonations' });
Donation.belongsTo(Request, { foreignKey: 'requestId', as: 'request' });

Request.belongsToMany(User, { 
  through: 'RequestDonors', 
  foreignKey: 'requestId',
  otherKey: 'userId',
  as: 'matchedDonors'
});
User.belongsToMany(Request, { 
  through: 'RequestDonors', 
  foreignKey: 'userId',
  otherKey: 'requestId',
  as: 'matchedRequests'
});

// Define associations
Organization.hasMany(BloodInventory, { foreignKey: 'organizationId', as: 'inventory' });
BloodInventory.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Donation.hasOne(BloodInventory, { foreignKey: 'donationId', as: 'inventory' });
BloodInventory.belongsTo(Donation, { foreignKey: 'donationId', as: 'donation' });

// Reschedule request associations
Donation.hasMany(DonationRescheduleRequest, { foreignKey: 'donationId', as: 'rescheduleRequests' });
DonationRescheduleRequest.belongsTo(Donation, { foreignKey: 'donationId', as: 'donation' });

User.hasMany(DonationRescheduleRequest, { foreignKey: 'userId', as: 'rescheduleRequests' });
DonationRescheduleRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Organization.hasMany(DonationRescheduleRequest, { foreignKey: 'organizationId', as: 'rescheduleRequests' });
DonationRescheduleRequest.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Organization,
  Donation,
  Request,
  Event,
  BloodInventory,
  DonationRescheduleRequest,
  Notification
};

