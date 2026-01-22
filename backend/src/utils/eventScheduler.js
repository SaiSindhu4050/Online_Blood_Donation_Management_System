const { Event, Donation, Notification, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Update event statuses based on current date/time
 * - upcoming → ongoing: When eventDate <= now and eventEndDate >= now (or no endDate)
 * - ongoing → completed: When eventEndDate < now (or eventDate + 1 day < now for single-day events)
 */
const updateEventStatuses = async () => {
  try {
    const now = new Date();

    // Update events to 'ongoing' if they've started but not ended
    const eventsToStart = await Event.findAll({
      where: {
        status: 'upcoming',
        eventDate: { [Op.lte]: now },
        [Op.or]: [
          { eventEndDate: { [Op.gte]: now } },
          { eventEndDate: null },
          { isMultiDay: false }
        ]
      }
    });

    for (const event of eventsToStart) {
      // For single-day events, check if event date + end time has passed
      if (!event.isMultiDay && event.eventDate) {
        const eventEndDateTime = new Date(event.eventDate);
        const [hours, minutes] = (event.endTime || '17:00').split(':');
        eventEndDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (eventEndDateTime < now) {
          // Event has ended, mark as completed
          await event.update({ status: 'completed' });
        } else {
          // Event is ongoing
          await event.update({ status: 'ongoing' });
        }
      } else if (event.eventEndDate) {
        // Multi-day event: check if end date has passed
        const eventEndDateTime = new Date(event.eventEndDate);
        const [hours, minutes] = (event.endTime || '17:00').split(':');
        eventEndDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (eventEndDateTime < now) {
          await event.update({ status: 'completed' });
        } else {
          await event.update({ status: 'ongoing' });
        }
      } else {
        // No end date, just mark as ongoing
        await event.update({ status: 'ongoing' });
      }
    }

    // Update ongoing events to 'completed' if they've ended
    const eventsToComplete = await Event.findAll({
      where: {
        status: 'ongoing',
        [Op.or]: [
          { eventEndDate: { [Op.lt]: now } },
          {
            isMultiDay: false,
            eventDate: {
              [Op.lt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) // More than 24 hours ago
            }
          }
        ]
      }
    });

    for (const event of eventsToComplete) {
      await event.update({ status: 'completed' });
    }

    console.log(`Event status update completed. Started: ${eventsToStart.length}, Completed: ${eventsToComplete.length}`);
  } catch (error) {
    console.error('Error updating event statuses:', error);
  }
};

/**
 * Send event reminder notifications to registered users
 * Sends reminders 24 hours before event and 2 hours before event
 */
const sendEventReminders = async () => {
  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find events starting in 24 hours (for 24h reminder)
    const events24h = await Event.findAll({
      where: {
        status: 'upcoming',
        eventDate: {
          [Op.gte]: new Date(twentyFourHoursFromNow.getTime() - 60 * 60 * 1000), // 23-25 hour window
          [Op.lte]: twentyFourHoursFromNow
        }
      },
      include: [
        {
          model: Donation,
          as: 'donations',
          where: {
            status: { [Op.in]: ['pending', 'approved', 'scheduled'] },
            userId: { [Op.ne]: null }
          },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'fullName', 'email'],
              required: false
            }
          ]
        }
      ]
    });

    // Find events starting in 2 hours (for 2h reminder)
    const events2h = await Event.findAll({
      where: {
        status: { [Op.in]: ['upcoming', 'ongoing'] },
        eventDate: {
          [Op.gte]: new Date(twoHoursFromNow.getTime() - 30 * 60 * 1000), // 1.5-2.5 hour window
          [Op.lte]: twoHoursFromNow
        }
      }
    });

    // Get donations for these events separately
    const eventIds2h = events2h.map(e => e.id);
    const donations2h = eventIds2h.length > 0 ? await Donation.findAll({
      where: {
        eventId: { [Op.in]: eventIds2h },
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
    }) : [];

    // Group donations by eventId
    const donationsByEvent2h = {};
    donations2h.forEach(donation => {
      if (!donationsByEvent2h[donation.eventId]) {
        donationsByEvent2h[donation.eventId] = [];
      }
      donationsByEvent2h[donation.eventId].push(donation);
    });

    // Send 24-hour reminders
    for (const event of events24h) {
      const eventDonations = donationsByEvent24h[event.id] || [];
      for (const donation of eventDonations) {
        if (donation.user && donation.user.id) {
          // Check if reminder already sent (avoid duplicates)
          const existingNotification = await Notification.findOne({
            where: {
              userId: donation.user.id,
              type: 'EVENT_REMINDER_24H',
              referenceId: event.id,
              createdAt: {
                [Op.gte]: new Date(now.getTime() - 2 * 60 * 60 * 1000) // Within last 2 hours
              }
            }
          });

          if (!existingNotification) {
            const eventDate = new Date(event.eventDate);
            await Notification.create({
              userId: donation.user.id,
              type: 'EVENT_REMINDER_24H',
              title: `📅 Reminder: ${event.name} Tomorrow`,
              message: `Your blood donation appointment is tomorrow at ${eventDate.toLocaleDateString()} ${event.startTime || '09:00'}. Location: ${event.locationAddress}, ${event.locationCity}.`,
              isRead: false,
              referenceId: event.id
            });
          }
        }
      }
    }

    // Send 2-hour reminders
    for (const event of events2h) {
      const eventDonations = donationsByEvent2h[event.id] || [];
      for (const donation of eventDonations) {
        if (donation.user && donation.user.id) {
          // Check if reminder already sent
          const existingNotification = await Notification.findOne({
            where: {
              userId: donation.user.id,
              type: 'EVENT_REMINDER_2H',
              referenceId: event.id,
              createdAt: {
                [Op.gte]: new Date(now.getTime() - 1 * 60 * 60 * 1000) // Within last hour
              }
            }
          });

          if (!existingNotification) {
            const eventDate = new Date(event.eventDate);
            await Notification.create({
              userId: donation.user.id,
              type: 'EVENT_REMINDER_2H',
              title: `⏰ Reminder: ${event.name} Starting Soon`,
              message: `Your blood donation appointment starts in 2 hours at ${eventDate.toLocaleDateString()} ${event.startTime || '09:00'}. Location: ${event.locationAddress}, ${event.locationCity}.`,
              isRead: false,
              referenceId: event.id
            });
          }
        }
      }
    }

    console.log(`Event reminders sent. 24h: ${events24h.length} events, 2h: ${events2h.length} events`);
  } catch (error) {
    console.error('Error sending event reminders:', error);
  }
};

/**
 * Initialize event scheduler
 * Runs status updates every hour and reminders every 30 minutes
 */
const startEventScheduler = () => {
  // Update event statuses every hour
  setInterval(() => {
    updateEventStatuses();
  }, 60 * 60 * 1000); // 1 hour

  // Send reminders every 30 minutes
  setInterval(() => {
    sendEventReminders();
  }, 30 * 60 * 1000); // 30 minutes

  // Run immediately on startup
  updateEventStatuses();
  sendEventReminders();

  console.log('Event scheduler started');
};

module.exports = {
  updateEventStatuses,
  sendEventReminders,
  startEventScheduler
};
