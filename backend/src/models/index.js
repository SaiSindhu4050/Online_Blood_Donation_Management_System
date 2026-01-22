const { sequelize } = require('../config/database');
const UserModel = require('./User.model');
const OrganizationModel = require('./Organization.model');
const DonationModel = require('./Donation.model');
const RequestModel = require('./Request.model');
const EventModel = require('./Event.model');
const BloodInventoryModel = require('./BloodInventory.model');
const DonationRescheduleRequestModel = require('./DonationRescheduleRequest.model');
const NotificationModel = require('./Notification.model');
const EventWaitlistModel = require('./EventWaitlist.model');
const EventCheckinModel = require('./EventCheckin.model');
const PreScreeningQuestionModel = require('./PreScreeningQuestion.model');
const EventPreScreeningModel = require('./EventPreScreening.model');
const PreScreeningResponseModel = require('./PreScreeningResponse.model');
const TestimonialModel = require('./Testimonial.model');
const AdminModel = require('./Admin.model');

// Initialize models
const User = UserModel(sequelize);
const Organization = OrganizationModel(sequelize);
const Donation = DonationModel(sequelize);
const Request = RequestModel(sequelize);
const Event = EventModel(sequelize);
const BloodInventory = BloodInventoryModel(sequelize);
const DonationRescheduleRequest = DonationRescheduleRequestModel(sequelize);
const Notification = NotificationModel(sequelize);
const EventWaitlist = EventWaitlistModel(sequelize);
const EventCheckin = EventCheckinModel(sequelize);
const PreScreeningQuestion = PreScreeningQuestionModel(sequelize);
const EventPreScreening = EventPreScreeningModel(sequelize);
const PreScreeningResponse = PreScreeningResponseModel(sequelize);
const Testimonial = TestimonialModel(sequelize);
const Admin = AdminModel(sequelize);

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

// Event Waitlist associations
Event.hasMany(EventWaitlist, { foreignKey: 'eventId', as: 'waitlist' });
EventWaitlist.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
User.hasMany(EventWaitlist, { foreignKey: 'userId', as: 'waitlistEntries' });
EventWaitlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Event Check-in associations
Event.hasMany(EventCheckin, { foreignKey: 'eventId', as: 'checkins' });
EventCheckin.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Donation.hasOne(EventCheckin, { foreignKey: 'donationId', as: 'checkin' });
EventCheckin.belongsTo(Donation, { foreignKey: 'donationId', as: 'donation' });
User.hasMany(EventCheckin, { foreignKey: 'userId', as: 'checkins' });
EventCheckin.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Organization.hasMany(EventCheckin, { foreignKey: 'checkedInBy', as: 'checkinsPerformed' });
EventCheckin.belongsTo(Organization, { foreignKey: 'checkedInBy', as: 'checkedInByOrg' });

// Pre-screening associations
Organization.hasMany(PreScreeningQuestion, { foreignKey: 'organizationId', as: 'preScreeningQuestions' });
PreScreeningQuestion.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

Event.belongsToMany(PreScreeningQuestion, {
  through: EventPreScreening,
  foreignKey: 'eventId',
  otherKey: 'questionId',
  as: 'preScreeningQuestions'
});
PreScreeningQuestion.belongsToMany(Event, {
  through: EventPreScreening,
  foreignKey: 'questionId',
  otherKey: 'eventId',
  as: 'events'
});

// Direct EventPreScreening associations for easier querying
EventPreScreening.belongsTo(PreScreeningQuestion, { foreignKey: 'questionId', as: 'question' });
PreScreeningQuestion.hasMany(EventPreScreening, { foreignKey: 'questionId', as: 'eventPreScreenings' });
EventPreScreening.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Event.hasMany(EventPreScreening, { foreignKey: 'eventId', as: 'eventPreScreenings' });

Event.hasMany(PreScreeningResponse, { foreignKey: 'eventId', as: 'preScreeningResponses' });
PreScreeningResponse.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

Donation.hasMany(PreScreeningResponse, { foreignKey: 'donationId', as: 'preScreeningResponses' });
PreScreeningResponse.belongsTo(Donation, { foreignKey: 'donationId', as: 'donation' });

User.hasMany(PreScreeningResponse, { foreignKey: 'userId', as: 'preScreeningResponses' });
PreScreeningResponse.belongsTo(User, { foreignKey: 'userId', as: 'user' });

PreScreeningQuestion.hasMany(PreScreeningResponse, { foreignKey: 'questionId', as: 'responses' });
PreScreeningResponse.belongsTo(PreScreeningQuestion, { foreignKey: 'questionId', as: 'question' });

// Testimonial associations
User.hasMany(Testimonial, { foreignKey: 'userId', as: 'testimonials' });
Testimonial.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Donation.hasMany(Testimonial, { foreignKey: 'donationId', as: 'testimonials' });
Testimonial.belongsTo(Donation, { foreignKey: 'donationId', as: 'donation' });

Request.hasMany(Testimonial, { foreignKey: 'requestId', as: 'testimonials' });
Testimonial.belongsTo(Request, { foreignKey: 'requestId', as: 'request' });

module.exports = {
  sequelize,
  User,
  Organization,
  Donation,
  Request,
  Event,
  BloodInventory,
  DonationRescheduleRequest,
  Notification,
  EventWaitlist,
  EventCheckin,
  PreScreeningQuestion,
  EventPreScreening,
  PreScreeningResponse,
  Testimonial,
  Admin
};

