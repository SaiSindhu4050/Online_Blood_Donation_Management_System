const { Donation, User, Event, DonationRescheduleRequest, Organization, Notification, BloodInventory } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a new donation
// @route   POST /api/donations
// @access  Public (optional auth)
exports.createDonation = async (req, res) => {
  try {
    // Check 56-day cooldown if user is logged in
    if (req.user && req.userType === 'user') {
      const user = await User.findByPk(req.user.id);
      if (user.lastDonationAt) {
        const daysSince = Math.floor((Date.now() - new Date(user.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 56) {
          const daysRemaining = 56 - daysSince;
          return res.status(400).json({ 
            message: `You cannot donate within 56 days of your last donation. You need to wait ${daysRemaining} more days.` 
          });
        }
      }
    }

    const donation = await Donation.create({
      ...req.body,
      userId: req.user && req.userType === 'user' ? req.user.id : null,
      userEmail: req.user && req.userType === 'user' ? req.user.email : req.body.email
    });

    res.status(201).json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all donations
// @route   GET /api/donations
// @access  Private (Organization/Admin)
exports.getAllDonations = async (req, res) => {
  try {
    const { status, organization, eventId, userId, organizationId } = req.query;
    let where = {};
    const include = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'bloodGroup'],
        required: false
      },
      {
        model: Event,
        as: 'event',
        attributes: ['id', 'name', 'eventDate'],
        required: false
      },
      {
        model: DonationRescheduleRequest,
        as: 'rescheduleRequests',
        required: false,
        order: [['createdAt', 'DESC']],
        limit: 1 // Get only the most recent reschedule request
      }
    ];

    if (status) {
      where.status = status;
    }

    if (organization) {
      where.selectedOrganization = organization;
    }

    if (eventId) {
      where.eventId = eventId;
    }

    // Priority: Use userId from query param if provided, otherwise use authenticated user's id
    // This ensures users can only see their own donations
    if (userId) {
      // If userId is provided in query, use it (but verify it matches authenticated user for security)
      const requestedUserId = parseInt(userId);
      if (req.user && req.userType === 'user' && requestedUserId !== req.user.id) {
        // User trying to access another user's donations - deny access
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only view your own donations.' 
        });
      }
      where.userId = requestedUserId;
    } else if (req.user && req.userType === 'user') {
      // If no userId in query but user is logged in, show only their donations
      where.userId = req.user.id;
    } else if (req.user && req.userType === 'organization') {
      // If organization is accessing, filter donations to only show their organization's donations
      const { Organization, Event } = require('../models');
      const org = await Organization.findByPk(req.user.id);
      
      if (org) {
        // Get organization's events
        const events = await Event.findAll({
          where: { organizationId: org.id },
          attributes: ['id']
        });
        const eventIds = events.map(e => e.id);
        
        // Filter donations: selectedOrganization matches OR eventId is in organization's events
        if (eventIds.length > 0) {
          where[Op.or] = [
            { selectedOrganization: org.name },
            { eventId: { [Op.in]: eventIds } }
          ];
        } else {
          where.selectedOrganization = org.name;
        }
      }
    }
    // If admin is accessing, they can see all donations (no filter)

    const donations = await Donation.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, donations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single donation
// @route   GET /api/donations/:id
// @access  Private
exports.getDonation = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'bloodGroup'],
          required: false
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'eventDate'],
          required: false
        },
        {
          model: DonationRescheduleRequest,
          as: 'rescheduleRequests',
          required: false,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Check if user has access
    if (req.userType === 'user' && donation.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update donation status
// @route   PUT /api/donations/:id/status
// @access  Private (Organization/Admin)
exports.updateDonationStatus = async (req, res) => {
  try {
    const { status, scheduledDate, scheduledTime } = req.body;

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

    // Authorization check: Organizations can only update donations related to their organization
    if (req.userType === 'organization') {
      const { Organization } = require('../models');
      const organization = await Organization.findByPk(req.user.id);
      
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      // Check if donation belongs to this organization
      let belongsToOrg = donation.selectedOrganization === organization.name;
      
      // Check if donation is linked to organization's event
      if (!belongsToOrg && donation.eventId) {
        if (donation.event && donation.event.organizationId === organization.id) {
          belongsToOrg = true;
        } else {
          // If event not loaded, check by loading event
          const event = await Event.findByPk(donation.eventId);
          if (event && event.organizationId === organization.id) {
            belongsToOrg = true;
          }
        }
      }

      if (!belongsToOrg) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only update donations related to your organization.' 
        });
      }
    }

    // Validate status value
    const validStatuses = ['pending', 'approved', 'scheduled', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // For regular donations (no requestId, no eventId), when approving:
    // Copy preferredDate/preferredTime to scheduledDate/scheduledTime if not provided
    let finalScheduledDate = scheduledDate || donation.scheduledDate;
    let finalScheduledTime = scheduledTime || donation.scheduledTime;
    let finalEventDate = donation.eventDate;

    // Only apply this logic for regular donations (not request-based or event-based)
    const isRegularDonation = !donation.requestId && !donation.eventId;
    
    if (status === 'approved' && isRegularDonation) {
      // If scheduledDate/scheduledTime not provided, use preferredDate/preferredTime
      if (!finalScheduledDate && donation.preferredDate) {
        finalScheduledDate = donation.preferredDate;
      }
      if (!finalScheduledTime && donation.preferredTime) {
        finalScheduledTime = donation.preferredTime;
      }
      
      // Set eventDate by combining scheduledDate and scheduledTime
      if (finalScheduledDate && !finalEventDate) {
        if (finalScheduledTime) {
          // Combine date and time
          const [hours, minutes] = finalScheduledTime.split(':');
          const combinedDate = new Date(finalScheduledDate);
          combinedDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
          finalEventDate = combinedDate;
        } else {
          // If no time, use start of day
          const dateOnly = new Date(finalScheduledDate);
          dateOnly.setHours(0, 0, 0, 0);
          finalEventDate = dateOnly;
        }
      }
    }

    await donation.update({
      status: status || donation.status,
      scheduledDate: finalScheduledDate,
      scheduledTime: finalScheduledTime,
      eventDate: finalEventDate || donation.eventDate
    });

    // Update user's last donation date ONLY when donation is completed
    // 'approved' status is just an appointment - customer hasn't shown up yet
    // Only 'completed' means the customer actually donated
    if (donation.userId && status === 'completed') {
      // Use the donation's eventDate or scheduledDate if available, otherwise use current date
      const donationDate = donation.eventDate || donation.scheduledDate || new Date();
      await User.update(
        { lastDonationAt: donationDate },
        { where: { id: donation.userId } }
      );
    }

    res.json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete donation
// @route   DELETE /api/donations/:id
// @access  Private
exports.deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Check if user has access
    if (req.userType === 'user' && donation.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await donation.destroy();

    res.json({ success: true, message: 'Donation deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request donation reschedule
// @route   POST /api/donations/:id/request-reschedule
// @access  Private (User)
exports.requestReschedule = async (req, res) => {
  try {
    const { newDate, newTime, reason } = req.body;
    const donation = await Donation.findByPk(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Verify user owns this donation
    if (req.userType !== 'user' || donation.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only reschedule your own donations.' 
      });
    }

    // Check if donation is approved or scheduled (can only reschedule these)
    if (donation.status !== 'approved' && donation.status !== 'scheduled') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot reschedule donation with status: ${donation.status}` 
      });
    }

    // Check 24-hour rule - must be more than 24 hours before appointment
    const appointmentDate = donation.eventDate || donation.scheduledDate;
    if (appointmentDate) {
      const appointmentDateTime = new Date(appointmentDate);
      if (donation.scheduledTime || donation.preferredTime) {
        const [hours, minutes] = (donation.scheduledTime || donation.preferredTime).split(':');
        appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      const now = new Date();
      const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60);
      
      if (hoursUntil <= 24) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot reschedule within 24 hours of appointment. Please contact the organization directly.' 
        });
      }
    }

    // Check if there's already a pending reschedule request
    const existingRequest = await DonationRescheduleRequest.findOne({
      where: {
        donationId: donation.id,
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have a pending reschedule request for this donation.' 
      });
    }

    // Find organization that needs to approve (from selectedOrganization or event)
    let organizationId = null;
    if (donation.selectedOrganization) {
      const org = await Organization.findOne({
        where: { name: donation.selectedOrganization }
      });
      if (org) organizationId = org.id;
    } else if (donation.eventId) {
      const event = await Event.findByPk(donation.eventId, {
        include: [{ model: Organization, as: 'organization' }]
      });
      if (event && event.organization) {
        organizationId = event.organization.id;
      }
    }

    // Create reschedule request
    const rescheduleRequest = await DonationRescheduleRequest.create({
      donationId: donation.id,
      userId: req.user.id,
      organizationId: organizationId,
      oldDate: appointmentDate ? new Date(appointmentDate).toISOString().split('T')[0] : null,
      oldTime: donation.scheduledTime || donation.preferredTime || null,
      newDate: newDate,
      newTime: newTime || null,
      reason: reason || null,
      status: 'pending'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Reschedule request submitted successfully. You will be notified once the organization reviews it.',
      rescheduleRequest 
    });
  } catch (error) {
    console.error('Request reschedule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark donation as completed (customer present)
// @route   PUT /api/donations/:id/mark-completed
// @access  Private (Organization)
// @note    Can only mark completed from 1 hour before appointment to 2 days after appointment
exports.markDonationCompleted = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'eventDate', 'organizationId'],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Authorization check: Organizations can only mark donations related to their organization
    if (req.userType === 'organization') {
      const organization = await Organization.findByPk(req.user.id);
      
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      // Check if donation belongs to this organization
      let belongsToOrg = donation.selectedOrganization === organization.name;
      
      // Check if donation is linked to organization's event
      if (!belongsToOrg && donation.eventId) {
        if (donation.event && donation.event.organizationId === organization.id) {
          belongsToOrg = true;
        } else {
          // If event not loaded, check by loading event
          const event = await Event.findByPk(donation.eventId);
          if (event && event.organizationId === organization.id) {
            belongsToOrg = true;
          }
        }
      }

      if (!belongsToOrg) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only mark donations as completed for your organization.' 
        });
      }
    }

    // Verify donation is approved or scheduled (can't mark pending as completed)
    if (donation.status !== 'approved' && donation.status !== 'scheduled') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot mark donation as completed. Current status: ${donation.status}. Donation must be approved or scheduled first.` 
      });
    }

    // Get appointment date/time
    const appointmentDate = donation.eventDate || donation.scheduledDate;
    if (!appointmentDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot mark as completed. Donation does not have a scheduled date.' 
      });
    }

    // Calculate appointment datetime (include time if available)
    const appointmentDateTime = new Date(appointmentDate);
    const appointmentTime = donation.scheduledTime || donation.preferredTime;
    if (appointmentTime) {
      const [hours, minutes] = appointmentTime.split(':');
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      // If no time specified, use start of day (00:00)
      appointmentDateTime.setHours(0, 0, 0, 0);
    }

    // Check time restriction: 1 hour before to 2 days after appointment
    const now = new Date();
    const oneHourBefore = new Date(appointmentDateTime);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    
    const twoDaysAfter = new Date(appointmentDateTime);
    twoDaysAfter.setDate(twoDaysAfter.getDate() + 2);
    twoDaysAfter.setHours(23, 59, 59, 999); // End of day

    if (now < oneHourBefore) {
      const hoursUntil = Math.ceil((oneHourBefore - now) / (1000 * 60 * 60));
      return res.status(400).json({ 
        success: false, 
        message: `Cannot mark as completed yet. You can mark customer present from 1 hour before the appointment. Appointment is in ${hoursUntil} hours.` 
      });
    }

    if (now > twoDaysAfter) {
      const daysPast = Math.floor((now - twoDaysAfter) / (1000 * 60 * 60 * 24));
      return res.status(400).json({ 
        success: false, 
        message: `Cannot mark as completed. The time window has passed. You can only mark customer present up to 2 days after the appointment. It has been ${daysPast} days since the deadline.` 
      });
    }

    // Update donation status to completed and set eventDate to actual completion date
    // This ensures the completion date is recorded correctly for history/cooldown calculations
    const completionDate = new Date();
    await donation.update({
      status: 'completed',
      eventDate: completionDate  // Update to actual completion date/time
    });

    // Update user's last donation date to the completion date
    if (donation.userId) {
      // Use the completion date we just set (actual donation date)
      await User.update(
        { lastDonationAt: completionDate },
        { where: { id: donation.userId } }
      );
    }

    // Add blood to inventory
    try {
      // Get organization from donation
      let organization = null;
      if (donation.selectedOrganization) {
        organization = await Organization.findOne({
          where: { name: donation.selectedOrganization }
        });
      } else if (donation.event && donation.event.organization) {
        // Get organization from event (already loaded in include)
        organization = donation.event.organization;
      } else if (donation.eventId) {
        // Fallback: Load event with organization if not already loaded
        const event = await Event.findByPk(donation.eventId, {
          include: [{ model: Organization, as: 'organization' }]
        });
        if (event && event.organization) {
          organization = event.organization;
        }
      }

      // If organization found, add to inventory
      if (organization) {
        // Check if there's already an inventory record for this donation
        let inventoryRecord = await BloodInventory.findOne({
          where: { donationId: donation.id }
        });

        if (inventoryRecord) {
          // If exists, activate it (in case it was created but not activated)
          await inventoryRecord.update({
            status: 'active'
          });
        } else {
          // Create new inventory record
          // Use default values: 1 unit, Whole Blood (since donationType/units not stored in donation model)
          const donationType = 'Whole Blood';
          const units = 1;
          
          // Calculate expiration date based on donation type
          const today = new Date();
          let daysToExpire = 42; // Default for Whole Blood
          
          // Note: Since we don't have donationType stored, we use default
          // In future, could store donationType/units when approving, or require it when marking completed
          
          today.setDate(today.getDate() + daysToExpire);
          const expirationDate = today.toISOString().split('T')[0];

          // Check if inventory item with same blood group, type, and expiration exists
          const existingInventory = await BloodInventory.findOne({
            where: {
              organizationId: organization.id,
              bloodGroup: donation.bloodGroup,
              donationType: donationType,
              expirationDate: expirationDate,
              status: 'active'
            }
          });

          if (existingInventory) {
            // Increment existing inventory
            await existingInventory.update({
              units: existingInventory.units + units
            });
          } else {
            // Create new inventory record
            await BloodInventory.create({
              organizationId: organization.id,
              donationId: donation.id,
              bloodGroup: donation.bloodGroup,
              donationType: donationType,
              units: units,
              expirationDate: expirationDate,
              status: 'active'
            });
          }
        }
      }
    } catch (inventoryError) {
      console.error('Error adding to inventory:', inventoryError);
      // Don't fail the request if inventory update fails, but log it
    }

    // Create notification for user
    if (donation.user) {
      await Notification.create({
        userId: donation.user.id,
        type: 'donation_completed',
        title: 'Donation Completed',
        message: `Your donation has been marked as completed. Thank you for your contribution!`,
        read: false,
        relatedId: donation.id,
        relatedType: 'donation'
      });
    }

    res.json({ 
      success: true, 
      message: 'Donation marked as completed successfully',
      donation 
    });
  } catch (error) {
    console.error('Mark donation completed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
