const { Organization, Event, Donation, Request, User, BloodInventory, DonationRescheduleRequest, Notification } = require('../models');
const { Op } = require('sequelize');

// @desc    Get organization profile
// @route   GET /api/organizations/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.user.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json({ success: true, organization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update organization profile
// @route   PUT /api/organizations/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      city,
      state,
      zipCode,
      description,
      website
    } = req.body;

    const organization = await Organization.findByPk(req.user.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    await organization.update({
      name,
      phone,
      address,
      city,
      state,
      zipCode,
      description,
      website
    });

    res.json({ success: true, organization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get organization dashboard data
// @route   GET /api/organizations/dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.user.id);
    
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Get organization's events
    const events = await Event.findAll({
      where: { organizationId: req.user.id },
      order: [['eventDate', 'DESC']],
      limit: 10
    });

    // Get event IDs for querying donations
    const eventIds = events.map(e => e.id);

    // Get all donations for this organization (pending, approved, scheduled, completed)
    // Check both selectedOrganization name match and donations linked to organization's events
    const donationsWhere = {};

    if (eventIds.length > 0) {
      donationsWhere[Op.or] = [
        { selectedOrganization: organization.name },
        { eventId: { [Op.in]: eventIds } }
      ];
    } else {
      donationsWhere.selectedOrganization = organization.name;
    }

    // Get all donations for this organization (all statuses)
    const allDonations = await Donation.findAll({
      where: donationsWhere,
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // Filter by status
    const pendingDonations = allDonations.filter(d => d.status === 'pending');
    const approvedDonations = allDonations.filter(d => d.status === 'approved' || d.status === 'scheduled');
    const completedDonations = allDonations.filter(d => d.status === 'completed');

    // Get pending requests in the organization's city
    // Organizations can see requests in their city to potentially fulfill
    const pendingRequests = await Request.findAll({
      where: {
        city: organization.city,
        status: 'pending'
      },
      include: [
        {
          model: Donation,
          as: 'interestedDonations',
          where: {
            status: 'pending'
          },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup', 'city'],
              required: false
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email'],
          required: false
        }
      ],
      order: [['urgency', 'ASC'], ['requiredDate', 'ASC']],
      limit: 20
    });

    // Calculate stats
    const totalEvents = await Event.count({
      where: { organizationId: req.user.id }
    });

    const upcomingEvents = await Event.count({
      where: {
        organizationId: req.user.id,
        status: { [Op.in]: ['upcoming', 'ongoing'] }
      }
    });

    const totalPendingDonations = pendingDonations.length;
    const totalPendingRequests = pendingRequests.length;

    res.json({
      success: true,
      dashboard: {
        pendingDonations: pendingDonations,
        approvedDonations: approvedDonations,
        completedDonations: completedDonations,
        pendingRequests: pendingRequests,
        events: events,
        stats: {
          totalEvents,
          upcomingEvents,
          totalPendingDonations,
          totalPendingRequests
        }
      }
    });
  } catch (error) {
    console.error('Organization dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept request and donation (peer-to-peer matching)
// @route   POST /api/organizations/accept-request-donation
// @access  Private (Organization)
exports.acceptRequestAndDonation = async (req, res) => {
  try {
    const { requestId, donationId } = req.body;

    if (!requestId || !donationId) {
      return res.status(400).json({ 
        success: false,
        message: 'Both requestId and donationId are required' 
      });
    }

    // Get the request and donation
    const request = await Request.findByPk(requestId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email'],
          required: false
        }
      ]
    });

    const donation = await Donation.findByPk(donationId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email'],
          required: false
        },
        {
          model: Request,
          as: 'request',
          required: false
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Request not found' 
      });
    }

    if (!donation) {
      return res.status(404).json({ 
        success: false,
        message: 'Donation not found' 
      });
    }

    // Verify donation is linked to this request
    if (donation.requestId !== request.id) {
      return res.status(400).json({ 
        success: false,
        message: 'Donation is not linked to this request' 
      });
    }

    // Verify request is in organization's city
    const organization = await Organization.findByPk(req.user.id);
    if (request.city !== organization.city) {
      return res.status(403).json({ 
        success: false,
        message: 'Request is not in your organization\'s city' 
      });
    }

    // Verify request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: `Request is already ${request.status}` 
      });
    }

    // Verify donation is still pending
    if (donation.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: `Donation is already ${donation.status}` 
      });
    }

    // Update request status to fulfilled
    await request.update({ 
      status: 'fulfilled' 
    });

    // For request-based donations (peer-to-peer), mark as completed immediately
    // because the donor is directly fulfilling the request - it's not just an appointment
    // Get current date in local timezone (not UTC) to avoid timezone conversion issues
    const now = new Date();
    // Extract date components in local timezone to ensure correct date is stored
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    // Create a date object in local timezone (not UTC) to avoid timezone conversion
    const localDateTime = new Date(`${localDateString}T${hours}:${minutes}:${seconds}`);
    
    await donation.update({ 
      status: 'completed',  // Mark as completed since this is a direct peer-to-peer donation
      selectedOrganization: organization.name,
      eventDate: localDateString  // Store as date string (YYYY-MM-DD) to avoid timezone issues
    });

    // Update donor's last donation date (peer-to-peer donation is completed)
    // This triggers the 56-day cooldown immediately
    if (donation.userId) {
      const { User } = require('../models');
      // Use the local date/time we just created to avoid timezone issues
      // Store as Date object for DATETIME field, but constructed from local timezone components
      await User.update(
        { lastDonationAt: localDateTime },
        { where: { id: donation.userId } }
      );
    }

    res.json({
      success: true,
      message: 'Request and donation accepted successfully. This is a peer-to-peer donation, so inventory remains unchanged.',
      request,
      donation
    });
  } catch (error) {
    console.error('Accept request and donation error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get blood inventory for organization
// @route   GET /api/organizations/inventory
// @access  Private (Organization)
exports.getInventory = async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.user.id);
    
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Get all inventory for this organization
    const inventory = await BloodInventory.findAll({
      where: {
        organizationId: req.user.id
      },
      order: [
        ['bloodGroup', 'ASC'],
        ['donationType', 'ASC'],
        ['expirationDate', 'ASC']
      ]
    });

    // Calculate summary statistics
    const now = new Date();
    const activeInventory = inventory.filter(item => {
      const expDate = new Date(item.expirationDate);
      return item.status === 'active' && expDate > now;
    });

    const expiredInventory = inventory.filter(item => {
      const expDate = new Date(item.expirationDate);
      return item.status === 'expired' || expDate <= now;
    });

    const totalUnits = activeInventory.reduce((sum, item) => sum + item.units, 0);
    const expiredUnits = expiredInventory.reduce((sum, item) => sum + item.units, 0);
    const uniqueBloodGroups = new Set(activeInventory.map(item => item.bloodGroup)).size;
    const uniqueDonationTypes = new Set(activeInventory.map(item => item.donationType)).size;

    res.json({
      success: true,
      inventory: inventory,
      summary: {
        totalUnits,
        expiredUnits,
        uniqueBloodGroups,
        uniqueDonationTypes,
        activeCount: activeInventory.length,
        expiredCount: expiredInventory.length
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all organizations
// @route   GET /api/organizations
// @access  Public
exports.getAllOrganizations = async (req, res) => {
  try {
    const { city } = req.query;
    let where = { isActive: true };
    
    if (city) {
      where.city = { [Op.like]: `%${city}%` };
    }

    const organizations = await Organization.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({ success: true, organizations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending reschedule requests for organization
// @route   GET /api/organizations/reschedule-requests
// @access  Private (Organization)
exports.getRescheduleRequests = async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.user.id);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const rescheduleRequests = await DonationRescheduleRequest.findAll({
      where: {
        organizationId: req.user.id,
        status: 'pending'
      },
      include: [
        {
          model: Donation,
          as: 'donation',
          include: [
            { model: Event, as: 'event' },
            { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, rescheduleRequests });
  } catch (error) {
    console.error('Get reschedule requests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or reject reschedule request
// @route   PUT /api/organizations/reschedule-requests/:id
// @access  Private (Organization)
exports.handleRescheduleRequest = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;
    const { id } = req.params;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action. Must be "approve" or "reject"' 
      });
    }

    const rescheduleRequest = await DonationRescheduleRequest.findByPk(id, {
      include: [
        {
          model: Donation,
          as: 'donation',
          include: [
            { model: User, as: 'user' }
          ]
        }
      ]
    });

    if (!rescheduleRequest) {
      return res.status(404).json({ success: false, message: 'Reschedule request not found' });
    }

    // Verify organization owns this request
    if (rescheduleRequest.organizationId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only handle reschedule requests for your organization.' 
      });
    }

    if (rescheduleRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Reschedule request is already ${rescheduleRequest.status}` 
      });
    }

    if (action === 'approve') {
      // Update donation with new date/time
      const donation = rescheduleRequest.donation;
      const newDateTime = new Date(`${rescheduleRequest.newDate}T${rescheduleRequest.newTime || '00:00:00'}`);
      
      await donation.update({
        eventDate: newDateTime,
        scheduledDate: rescheduleRequest.newDate,
        scheduledTime: rescheduleRequest.newTime || donation.scheduledTime
      });

      // Update reschedule request status
      await rescheduleRequest.update({
        status: 'approved'
      });

      // Create notification for user
      if (donation.user) {
        await Notification.create({
          userId: donation.user.id,
          type: 'reschedule_approved',
          title: 'Reschedule Request Approved',
          message: `Your donation reschedule request has been approved. New appointment: ${rescheduleRequest.newDate}${rescheduleRequest.newTime ? ' at ' + rescheduleRequest.newTime : ''}`,
          read: false,
          relatedId: donation.id,
          relatedType: 'donation'
        });
      }

      res.json({ 
        success: true, 
        message: 'Reschedule request approved successfully',
        rescheduleRequest 
      });
    } else if (action === 'reject') {
      // Update reschedule request status
      await rescheduleRequest.update({
        status: 'rejected',
        rejectionReason: rejectionReason || null
      });

      // Create notification for user
      const donation = rescheduleRequest.donation;
      if (donation && donation.user) {
        await Notification.create({
          userId: donation.user.id,
          type: 'reschedule_rejected',
          title: 'Reschedule Request Rejected',
          message: `Your donation reschedule request has been rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
          read: false,
          relatedId: donation.id,
          relatedType: 'donation'
        });
      }

      res.json({ 
        success: true, 
        message: 'Reschedule request rejected',
        rescheduleRequest 
      });
    }
  } catch (error) {
    console.error('Handle reschedule request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
