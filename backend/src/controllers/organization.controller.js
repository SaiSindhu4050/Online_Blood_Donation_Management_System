const { Organization, Event, Donation, Request, User, BloodInventory, DonationRescheduleRequest, Notification, sequelize } = require('../models');
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

    // Get pending and active/IN_PROGRESS requests in the organization's city
    // Organizations can see requests for hospitals in their city to potentially fulfill
    // Match by HOSPITAL city, not requestor city
    // Use case-insensitive LIKE matching for hospital city
    const cityFilter = organization.city 
      ? { [Op.like]: `%${organization.city}%` } 
      : { [Op.ne]: null };
    
    const pendingRequests = await Request.findAll({
      where: {
        [Op.or]: [
          { hospitalCity: cityFilter }, // Match by hospital city (preferred)
          { city: cityFilter } // Fallback to legacy city field
        ],
        status: { [Op.in]: ['pending', 'IN_PROGRESS', 'matched'] } // Include active/in-progress requests
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
              attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup', 'city', 'showPhoneNumber', 'availableToDonate'],
              required: false
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'showPhoneNumber', 'availableToDonate'],
          required: false
        }
      ],
      order: [['urgency', 'ASC'], ['requiredDate', 'ASC']],
      limit: 20
    });

    // Filter out users who are not available to donate and conditionally hide phone numbers
    const filteredRequests = pendingRequests.map(request => {
      // Filter interested donations to only include available donors
      if (request.interestedDonations) {
        request.interestedDonations = request.interestedDonations.filter(donation => {
          if (donation.user && !donation.user.availableToDonate) {
            return false; // Exclude unavailable donors
          }
          // Hide phone if user doesn't want to show it
          if (donation.user && !donation.user.showPhoneNumber) {
            donation.user.phone = null;
          }
          return true;
        });
      }
      
      // Hide phone for request user if they don't want to show it
      if (request.user && !request.user.showPhoneNumber) {
        request.user.phone = null;
      }
      
      // Exclude requests from users who are not available (if applicable)
      // Note: We still show the request, but filter out unavailable donors
      
      return request;
    });

    // Debug logging (can be removed in production)
    console.log(`Organization ${organization.name} (city: ${organization.city}) found ${filteredRequests.length} requests`);

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

    // Filter pending donations to exclude unavailable users and hide phone numbers
    const filteredPendingDonations = pendingDonations.map(donation => {
      const donationObj = donation.toJSON ? donation.toJSON() : donation;
      
      // If donation has user info, check privacy settings
      if (donationObj.user) {
        // Hide phone if user doesn't want to show it
        if (!donationObj.user.showPhoneNumber) {
          donationObj.user.phone = null;
        }
      }
      
      return donationObj;
    }).filter(donation => {
      // Filter out donations from users who are not available
      if (donation.user && donation.user.availableToDonate === false) {
        return false;
      }
      return true;
    });

    res.json({
      success: true,
      dashboard: {
        pendingDonations: filteredPendingDonations,
        approvedDonations: approvedDonations,
        completedDonations: completedDonations,
        pendingRequests: filteredRequests,
        events: events,
        stats: {
          totalEvents,
          upcomingEvents,
          totalPendingDonations: filteredPendingDonations.length,
          totalPendingRequests: filteredRequests.length
        }
      }
    });
  } catch (error) {
    console.error('Organization dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get available donors in organization's city
// @route   GET /api/organizations/available-donors
// @access  Private
exports.getAvailableDonors = async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.user.id);
    
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Get query parameters for filtering
    const { bloodGroup, city, state } = req.query;

    // Build where clause
    // Handle availableToDonate: treat NULL as TRUE (default for users created before privacy settings)
    const whereClause = {
      isActive: true,
      [Op.or]: [
        { availableToDonate: true },
        { availableToDonate: null } // Include users with NULL (created before privacy settings migration)
      ],
      role: 'user'
    };

    // Filter by organization's city if no city specified
    // Use case-insensitive LIKE for city matching to handle case variations
    if (city) {
      whereClause.city = { [Op.like]: `%${city}%` };
    } else if (organization.city) {
      whereClause.city = { [Op.like]: `%${organization.city}%` };
    }

    // Filter by state if provided (case-insensitive)
    if (state) {
      whereClause.state = { [Op.like]: `%${state}%` };
    }

    // Filter by blood group if provided
    if (bloodGroup) {
      whereClause.bloodGroup = bloodGroup;
    }

    // Get available donors
    const donors = await User.findAll({
      where: whereClause,
      attributes: [
        'id',
        'fullName',
        'email',
        'phone',
        'bloodGroup',
        'city',
        'state',
        'lastDonationAt',
        'showPhoneNumber',
        'anonymousMode'
      ],
      order: [
        [sequelize.literal('CASE WHEN lastDonationAt IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['lastDonationAt', 'DESC'],
        ['fullName', 'ASC']
      ],
      limit: 100
    });

    // Process donors to respect privacy settings
    const processedDonors = donors.map(donor => {
      const donorObj = donor.toJSON ? donor.toJSON() : donor;
      
      // Hide phone if user doesn't want to show it
      if (!donorObj.showPhoneNumber) {
        donorObj.phone = null;
      }
      
      // Hide name if anonymous mode is enabled
      if (donorObj.anonymousMode) {
        donorObj.fullName = `Anonymous Donor #${donorObj.id}`;
      }
      
      return donorObj;
    });

    res.json({
      success: true,
      donors: processedDonors,
      count: processedDonors.length,
      filters: {
        city: city || organization.city,
        state: state || null,
        bloodGroup: bloodGroup || null
      }
    });
  } catch (error) {
    console.error('Get available donors error:', error);
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

    // Verify request is in organization's city (check hospital city, not requestor city)
    // Use case-insensitive matching
    const organization = await Organization.findByPk(req.user.id);
    const hospitalCity = (request.hospitalCity || request.city || '').toLowerCase().trim();
    const orgCity = (organization.city || '').toLowerCase().trim();
    
    if (hospitalCity && orgCity && hospitalCity !== orgCity && 
        !hospitalCity.includes(orgCity) && !orgCity.includes(hospitalCity)) {
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

// @desc    Get all organizations (supports filtering by zipCode, city, or search term)
// @route   GET /api/organizations
// @access  Public
exports.getAllOrganizations = async (req, res) => {
  try {
    const { city, zipCode, search } = req.query;
    let where = { isActive: true };
    
    if (search) {
      // Flexible search: match by name, city, or zipCode (case-insensitive for text fields)
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { zipCode: { [Op.like]: `%${search}%` } }
      ];
    } else if (zipCode) {
      // Default precise filter: exact ZIP match
      where.zipCode = zipCode;
    } else if (city) {
      // Fallback: city-based search
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

// @desc    Mark patient as ready (Phase 2: Critical Wait)
// @route   POST /api/organizations/requests/:id/patient-ready
// @access  Private (Organization)
exports.markPatientReady = async (req, res) => {
  try {
    const { donorETAs } = req.body; // Array of {donorId, eta, status}
    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if organization is in same city (check hospital city, not requestor city)
    // Use case-insensitive matching
    const organization = await Organization.findByPk(req.user.id);
    const hospitalCity = (request.hospitalCity || request.city || '').toLowerCase().trim();
    const orgCity = (organization.city || '').toLowerCase().trim();
    
    if (hospitalCity && orgCity && hospitalCity !== orgCity && 
        !hospitalCity.includes(orgCity) && !orgCity.includes(hospitalCity)) {
      return res.status(403).json({ success: false, message: 'You can only manage requests in your city' });
    }

    // Update request to Phase 2: Critical Wait
    const now = new Date();
    const waitEndsAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

    await request.update({
      workflowPhase: 'critical_wait',
      patientReadyAt: now,
      waitForDonorsStartedAt: now,
      waitForDonorsEndsAt: waitEndsAt,
      donorETAs: donorETAs || []
    });

    res.json({
      success: true,
      message: 'Patient marked as ready. 30-minute countdown started.',
      request: request,
      waitEndsAt: waitEndsAt
    });
  } catch (error) {
    console.error('Mark patient ready error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Wait for donors (Phase 2: Continue waiting)
// @route   POST /api/organizations/requests/:id/wait-for-donors
// @access  Private (Organization)
exports.waitForDonors = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if organization is in same city (check hospital city, not requestor city)
    // Use case-insensitive matching
    const organization = await Organization.findByPk(req.user.id);
    const hospitalCity = (request.hospitalCity || request.city || '').toLowerCase().trim();
    const orgCity = (organization.city || '').toLowerCase().trim();
    
    if (hospitalCity && orgCity && hospitalCity !== orgCity && 
        !hospitalCity.includes(orgCity) && !orgCity.includes(hospitalCity)) {
      return res.status(403).json({ success: false, message: 'You can only manage requests in your city' });
    }

    // Extend wait time by 30 minutes
    const now = new Date();
    const waitEndsAt = new Date(now.getTime() + 30 * 60 * 1000);

    await request.update({
      waitForDonorsStartedAt: now,
      waitForDonorsEndsAt: waitEndsAt
    });

    res.json({
      success: true,
      message: 'Waiting for donors. 30-minute countdown extended.',
      waitEndsAt: waitEndsAt
    });
  } catch (error) {
    console.error('Wait for donors error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Emergency override to unlock inventory immediately
// @route   POST /api/organizations/requests/:id/emergency-override
// @access  Private (Organization)
exports.emergencyOverride = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if organization is in same city (check hospital city, not requestor city)
    // Use case-insensitive matching
    const organization = await Organization.findByPk(req.user.id);
    const hospitalCity = (request.hospitalCity || request.city || '').toLowerCase().trim();
    const orgCity = (organization.city || '').toLowerCase().trim();
    
    if (hospitalCity && orgCity && hospitalCity !== orgCity && 
        !hospitalCity.includes(orgCity) && !orgCity.includes(hospitalCity)) {
      return res.status(403).json({ success: false, message: 'You can only manage requests in your city' });
    }

    // Unlock inventory immediately
    const now = new Date();
    await request.update({
      inventoryLocked: false,
      emergencyOverride: true,
      inventoryUnlockedAt: now,
      workflowPhase: 'hard_stop'
    });

    res.json({
      success: true,
      message: 'Emergency override activated. Inventory unlocked.',
      request: request
    });
  } catch (error) {
    console.error('Emergency override error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get workflow status for a request
// @route   GET /api/organizations/requests/:id/workflow-status
// @access  Private (Organization)
exports.getWorkflowStatus = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id, {
      include: [
        {
          model: Donation,
          as: 'interestedDonations',
          where: { status: { [Op.in]: ['approved', 'scheduled', 'completed'] } },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup']
            }
          ]
        }
      ]
    });
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Calculate time remaining for each phase
    const now = new Date();
    const requestAge = (now - new Date(request.requestCreatedAt || request.createdAt)) / (1000 * 60); // minutes
    const timeUntilAssessment = Math.max(0, 60 - requestAge); // 1 hour = 60 minutes
    const timeUntilHardStop = Math.max(0, 120 - requestAge); // 2 hours = 120 minutes

    let waitTimeRemaining = null;
    if (request.waitForDonorsEndsAt) {
      waitTimeRemaining = Math.max(0, (new Date(request.waitForDonorsEndsAt) - now) / (1000 * 60)); // minutes
    }

    res.json({
      success: true,
      workflow: {
        phase: request.workflowPhase,
        inventoryLocked: request.inventoryLocked,
        unitsRequired: request.unitsRequired,
        unitsCollected: request.unitsCollected || 0,
        unitsNeeded: Math.max(0, request.unitsRequired - (request.unitsCollected || 0)),
        emergencyOverride: request.emergencyOverride,
        requestAge: requestAge,
        timeUntilAssessment: timeUntilAssessment,
        timeUntilHardStop: timeUntilHardStop,
        waitTimeRemaining: waitTimeRemaining,
        donorETAs: request.donorETAs || [],
        finalCallSent: request.finalCallSent
      },
      request: request
    });
  } catch (error) {
    console.error('Get workflow status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
