const { Event, PreScreeningResponse, Donation, User, Notification } = require('../models');
const { Op } = require('sequelize');

/**
 * Send pre-screening reminders to users who haven't completed screening
 * Runs daily to remind users about upcoming deadlines
 */
const sendPreScreeningReminders = async () => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find events with pre-screening deadlines in next 3 days
    const eventsNeedingReminders = await Event.findAll({
      where: {
        requiresPreScreening: true,
        status: 'upcoming',
        preScreeningDeadline: {
          [Op.gte]: now,
          [Op.lte]: threeDaysFromNow
        }
      }
    });

    for (const event of eventsNeedingReminders) {
      // Get all registered users who haven't completed pre-screening
      const registrations = await Donation.findAll({
        where: {
          eventId: event.id,
          status: { [Op.in]: ['pending', 'approved', 'scheduled'] },
          userId: { [Op.ne]: null }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'fullName', 'email'],
            required: false
          }
        ]
      });

      for (const donation of registrations) {
        if (!donation.userId) continue;

        // Check if user has completed pre-screening
        const hasCompletedScreening = await PreScreeningResponse.findOne({
          where: {
            eventId: event.id,
            userId: donation.userId
          }
        });

        if (!hasCompletedScreening) {
          // Check if reminder already sent today
          const existingNotification = await Notification.findOne({
            where: {
              userId: donation.userId,
              type: 'PRE_SCREENING_REMINDER',
              referenceId: event.id,
              createdAt: {
                [Op.gte]: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Within last 24 hours
              }
            }
          });

          if (!existingNotification) {
            const deadlineDate = new Date(event.preScreeningDeadline);
            const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
            
            let urgencyMessage = '';
            if (daysUntilDeadline <= 1) {
              urgencyMessage = 'URGENT: Deadline is tomorrow!';
            } else if (daysUntilDeadline <= 3) {
              urgencyMessage = `Deadline in ${daysUntilDeadline} days`;
            }

            await Notification.create({
              userId: donation.userId,
              type: 'PRE_SCREENING_REMINDER',
              title: `⏰ Pre-screening Reminder: ${event.name}`,
              message: `Please complete the pre-screening questionnaire for "${event.name}". ${urgencyMessage} Deadline: ${deadlineDate.toLocaleDateString()}.`,
              isRead: false,
              referenceId: event.id
            });
          }
        }
      }
    }

    console.log(`Pre-screening reminders sent for ${eventsNeedingReminders.length} events`);
  } catch (error) {
    console.error('Error sending pre-screening reminders:', error);
  }
};

/**
 * Initialize pre-screening reminder scheduler
 * Runs daily at midnight
 */
const startPreScreeningReminderScheduler = () => {
  // Run immediately on startup
  sendPreScreeningReminders();

  // Schedule to run daily at midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight - now;

  setTimeout(() => {
    sendPreScreeningReminders();
    // Then run every 24 hours
    setInterval(sendPreScreeningReminders, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  console.log('Pre-screening reminder scheduler started');
};

module.exports = {
  sendPreScreeningReminders,
  startPreScreeningReminderScheduler
};
