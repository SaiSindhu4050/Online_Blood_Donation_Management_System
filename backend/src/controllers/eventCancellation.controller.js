const { Event, Donation, User, Notification, EventWaitlist } = require('../models');
const { Op } = require('sequelize');

// @desc    Cancel event
// @route   POST /api/events/:id/cancel
// @access  Private (Organization)
exports.cancelEvent = async (req, res) => {
  try {
    const { reason, notifyRegistrants } = req.body;
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Event is already cancelled' 
      });
    }

    // Update event status
    await event.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason || null,
      cancelledBy: req.user.id
    });

    // Get all registered donors
    const registrations = await Donation.findAll({
      where: {
        eventId: event.id,
        status: { [Op.in]: ['pending', 'approved', 'scheduled'] }
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

    // Send notifications if requested
    if (notifyRegistrants !== false) {
      for (const donation of registrations) {
        if (donation.userId) {
          await Notification.create({
            userId: donation.userId,
            type: 'EVENT_CANCELLED',
            title: `❌ Event Cancelled: ${event.name}`,
            message: `The event "${event.name}" scheduled for ${new Date(event.eventDate).toLocaleDateString()} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
            isRead: false,
            referenceId: event.id
          });
        } else if (donation.email) {
          // For non-registered users, could send email notification
          // For now, we'll just log it
          console.log(`Event cancelled notification should be sent to: ${donation.email}`);
        }
      }

      // Notify waitlist users
      const waitlistEntries = await EventWaitlist.findAll({
        where: {
          eventId: event.id,
          status: { [Op.in]: ['waiting', 'notified'] }
        }
      });

      for (const entry of waitlistEntries) {
        if (entry.userId) {
          await Notification.create({
            userId: entry.userId,
            type: 'EVENT_CANCELLED',
            title: `❌ Event Cancelled: ${event.name}`,
            message: `The event "${event.name}" you were on the waitlist for has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
            isRead: false,
            referenceId: event.id
          });
        }
      }
    }

    // Update donation statuses (optional - could be cancelled or left as-is)
    // For now, we'll leave them as-is so organizations can manually handle reassignments

    res.json({ 
      success: true, 
      message: 'Event cancelled successfully',
      notificationsSent: notifyRegistrants !== false ? registrations.length : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reschedule event
// @route   POST /api/events/:id/reschedule
// @access  Private (Organization)
exports.rescheduleEvent = async (req, res) => {
  try {
    const { newEventDate, newEventEndDate, newStartTime, newEndTime, reason, notifyRegistrants } = req.body;
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!newEventDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'New event date is required' 
      });
    }

    // Store original date if first reschedule
    const originalDate = event.originalEventDate || event.eventDate;

    // Update event
    await event.update({
      eventDate: newEventDate,
      eventEndDate: newEventEndDate || event.eventEndDate,
      startTime: newStartTime || event.startTime,
      endTime: newEndTime || event.endTime,
      originalEventDate: originalDate,
      rescheduledAt: new Date(),
      rescheduleReason: reason || null,
      rescheduledBy: req.user.id,
      rescheduleCount: event.rescheduleCount + 1
    });

    // Get all registered donors
    const registrations = await Donation.findAll({
      where: {
        eventId: event.id,
        status: { [Op.in]: ['pending', 'approved', 'scheduled'] }
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

    // Send notifications if requested
    if (notifyRegistrants !== false) {
      for (const donation of registrations) {
        if (donation.userId) {
          await Notification.create({
            userId: donation.userId,
            type: 'EVENT_RESCHEDULED',
            title: `📅 Event Rescheduled: ${event.name}`,
            message: `The event "${event.name}" has been rescheduled to ${new Date(newEventDate).toLocaleDateString()} ${newStartTime || event.startTime || ''}.${reason ? ` Reason: ${reason}` : ''}`,
            isRead: false,
            referenceId: event.id
          });
        }
      }

      // Notify waitlist users
      const waitlistEntries = await EventWaitlist.findAll({
        where: {
          eventId: event.id,
          status: { [Op.in]: ['waiting', 'notified'] }
        }
      });

      for (const entry of waitlistEntries) {
        if (entry.userId) {
          await Notification.create({
            userId: entry.userId,
            type: 'EVENT_RESCHEDULED',
            title: `📅 Event Rescheduled: ${event.name}`,
            message: `The event "${event.name}" you were registered for has been rescheduled to ${new Date(newEventDate).toLocaleDateString()}.${reason ? ` Reason: ${reason}` : ''}`,
            isRead: false,
            referenceId: event.id
          });
        }
      }
    }

    res.json({ 
      success: true, 
      message: 'Event rescheduled successfully',
      event,
      notificationsSent: notifyRegistrants !== false ? registrations.length : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
