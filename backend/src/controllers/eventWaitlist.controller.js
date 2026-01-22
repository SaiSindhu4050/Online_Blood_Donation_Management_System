const { EventWaitlist, Event, Donation, User, Notification } = require('../models');
const { Op } = require('sequelize');

// @desc    Join event waitlist
// @route   POST /api/events/:id/waitlist
// @access  Public
exports.joinWaitlist = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if event is full
    if (event.maxRegistrations === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'This event does not have a registration limit' 
      });
    }

    const registrationCount = await Donation.count({
      where: {
        eventId: event.id,
        status: { [Op.in]: ['pending', 'approved', 'scheduled'] }
      }
    });

    if (registrationCount < event.maxRegistrations) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event is not full. You can register directly.' 
      });
    }

    // Check if user is already registered
    const existingDonation = await Donation.findOne({
      where: {
        eventId: event.id,
        [Op.or]: [
          { userId: req.user && req.userType === 'user' ? req.user.id : null },
          { email: req.body.email }
        ],
        status: { [Op.in]: ['pending', 'approved', 'scheduled'] }
      }
    });

    if (existingDonation) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already registered for this event' 
      });
    }

    // Check if already on waitlist
    const existingWaitlist = await EventWaitlist.findOne({
      where: {
        eventId: event.id,
        [Op.or]: [
          { userId: req.user && req.userType === 'user' ? req.user.id : null },
          { email: req.body.email }
        ],
        status: { [Op.in]: ['waiting', 'notified'] }
      }
    });

    if (existingWaitlist) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already on the waitlist for this event' 
      });
    }

    // Determine priority (higher priority for needed blood groups)
    let priority = 0;
    if (event.targetBloodGroups && Array.isArray(event.targetBloodGroups)) {
      if (event.targetBloodGroups.includes(req.body.bloodGroup)) {
        priority = 1;
      }
    }

    const waitlistEntry = await EventWaitlist.create({
      eventId: event.id,
      userId: req.user && req.userType === 'user' ? req.user.id : null,
      userEmail: req.user && req.userType === 'user' ? req.user.email : req.body.email,
      fullName: req.user && req.userType === 'user' ? req.user.fullName : req.body.fullName,
      phone: req.user && req.userType === 'user' ? req.user.phone : req.body.phone,
      bloodGroup: req.body.bloodGroup,
      priority
    });

    res.status(201).json({ 
      success: true, 
      message: 'You have been added to the waitlist',
      waitlistEntry 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get event waitlist
// @route   GET /api/events/:id/waitlist
// @access  Private (Organization)
exports.getWaitlist = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if organization owns this event
    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const waitlist = await EventWaitlist.findAll({
      where: { eventId: event.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup'],
          required: false
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC']
      ]
    });

    res.json({ success: true, waitlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove from waitlist
// @route   DELETE /api/events/:id/waitlist/:waitlistId
// @access  Public
exports.removeFromWaitlist = async (req, res) => {
  try {
    const waitlistEntry = await EventWaitlist.findByPk(req.params.waitlistId);
    if (!waitlistEntry) {
      return res.status(404).json({ success: false, message: 'Waitlist entry not found' });
    }

    // Check authorization
    if (req.userType === 'user') {
      if (waitlistEntry.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.userType === 'organization') {
      const event = await Event.findByPk(waitlistEntry.eventId);
      if (event.organizationId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    await waitlistEntry.update({ status: 'cancelled' });
    res.json({ success: true, message: 'Removed from waitlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process waitlist when spot opens (called when donation is cancelled)
// @route   POST /api/events/:id/process-waitlist
// @access  Private (Organization)
exports.processWaitlist = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const registrationCount = await Donation.count({
      where: {
        eventId: event.id,
        status: { [Op.in]: ['pending', 'approved', 'scheduled'] }
      }
    });

    const spotsAvailable = event.maxRegistrations - registrationCount;
    if (spotsAvailable <= 0) {
      return res.json({ 
        success: true, 
        message: 'No spots available',
        notified: 0 
      });
    }

    // Get next users from waitlist (priority first, then FIFO)
    const nextWaitlistEntries = await EventWaitlist.findAll({
      where: {
        eventId: event.id,
        status: 'waiting'
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC']
      ],
      limit: spotsAvailable
    });

    let notifiedCount = 0;
    for (const entry of nextWaitlistEntries) {
      // Create notification
      if (entry.userId) {
        await Notification.create({
          userId: entry.userId,
          type: 'EVENT_WAITLIST_SPOT_AVAILABLE',
          title: `🎉 Spot Available: ${event.name}`,
          message: `A spot has opened up for ${event.name} on ${new Date(event.eventDate).toLocaleDateString()}. Click to register now!`,
          isRead: false,
          referenceId: event.id
        });
      }

      await entry.update({
        status: 'notified',
        notifiedAt: new Date()
      });

      notifiedCount++;
    }

    res.json({ 
      success: true, 
      message: `Notified ${notifiedCount} users from waitlist`,
      notified: notifiedCount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
