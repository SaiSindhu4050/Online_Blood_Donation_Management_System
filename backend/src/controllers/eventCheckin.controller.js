const { EventCheckin, Event, Donation, User, Organization, Notification } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

// @desc    Generate check-in code for donation
// @route   POST /api/donations/:id/generate-checkin-code
// @access  Private (Organization)
exports.generateCheckInCode = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'organizationId'],
          required: false
        }
      ]
    });

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Check authorization
    if (req.userType === 'organization') {
      let belongsToOrg = donation.selectedOrganization === req.user.name;
      if (!belongsToOrg && donation.eventId && donation.event) {
        belongsToOrg = donation.event.organizationId === req.user.id;
      }
      if (!belongsToOrg) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Generate unique check-in code
    const checkInCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    
    await donation.update({
      checkInCode,
      checkInCodeGeneratedAt: new Date()
    });

    res.json({ 
      success: true, 
      checkInCode,
      message: 'Check-in code generated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check in donor at event (QR code or manual)
// @route   POST /api/events/:id/checkin
// @access  Private (Organization) or Public (for QR code)
exports.checkInDonor = async (req, res) => {
  try {
    const { donationId, checkInCode, checkInMethod, notes } = req.body;
    const eventId = req.params.id;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    let donation;
    if (checkInCode) {
      // QR code check-in
      donation = await Donation.findOne({
        where: {
          checkInCode,
          eventId,
          status: { [Op.in]: ['approved', 'scheduled'] }
        }
      });
    } else if (donationId) {
      // Manual check-in
      donation = await Donation.findByPk(donationId, {
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'organizationId'],
            required: false
          }
        ]
      });

      // Check authorization for manual check-in
      if (req.userType === 'organization') {
        if (donation.event && donation.event.organizationId !== req.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Either donationId or checkInCode is required' 
      });
    }

    if (!donation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Donation not found or invalid check-in code' 
      });
    }

    // Check if already checked in
    const existingCheckin = await EventCheckin.findOne({
      where: { donationId: donation.id }
    });

    if (existingCheckin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Donor already checked in',
        checkin: existingCheckin
      });
    }

    // Create check-in record
    const checkin = await EventCheckin.create({
      eventId,
      donationId: donation.id,
      userId: donation.userId,
      checkInMethod: checkInMethod || (checkInCode ? 'qr_code' : 'manual'),
      checkedInBy: req.userType === 'organization' ? req.user.id : null,
      notes
    });

    // Send notification to user
    if (donation.userId) {
      await Notification.create({
        userId: donation.userId,
        type: 'EVENT_CHECKIN_CONFIRMED',
        title: `✅ Checked In: ${event.name}`,
        message: `You have been checked in for ${event.name}. Thank you for your donation!`,
        isRead: false,
        referenceId: event.id
      });
    }

    res.json({ 
      success: true, 
      message: 'Donor checked in successfully',
      checkin 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get event check-ins
// @route   GET /api/events/:id/checkins
// @access  Private (Organization)
exports.getEventCheckins = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const checkins = await EventCheckin.findAll({
      where: { eventId: event.id },
      include: [
        {
          model: Donation,
          as: 'donation',
          attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup'],
          required: false
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email'],
          required: false
        }
      ],
      order: [['checkedInAt', 'DESC']]
    });

    res.json({ success: true, checkins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get check-in statistics
// @route   GET /api/events/:id/checkin-stats
// @access  Private (Organization)
exports.getCheckInStats = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const totalRegistrations = await Donation.count({
      where: {
        eventId: event.id,
        status: { [Op.in]: ['approved', 'scheduled'] }
      }
    });

    const checkedInCount = await EventCheckin.count({
      where: { eventId: event.id }
    });

    const attendanceRate = totalRegistrations > 0 
      ? ((checkedInCount / totalRegistrations) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      stats: {
        totalRegistrations,
        checkedInCount,
        notCheckedIn: totalRegistrations - checkedInCount,
        attendanceRate: parseFloat(attendanceRate)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
