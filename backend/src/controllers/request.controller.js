const { Request, User, Organization, Notification, Donation, sequelize } = require('../models');
const { Op, literal } = require('sequelize');
const { getCompatibleDonorGroups } = require('../utils/bloodGroupCompatibility');

// @desc    Create a new blood request
// @route   POST /api/requests
// @access  Public (optional auth)
exports.createRequest = async (req, res) => {
  try {
    // Create the request first with Donor-First Workflow initialization
    // Ensure hospitalCity is set (use hospitalCity from body, or fallback to city for backward compatibility)
    const requestData = {
      ...req.body,
      hospitalCity: req.body.hospitalCity || req.body.city, // Use hospitalCity, fallback to city
      userId: req.user && req.userType === 'user' ? req.user.id : null,
      userEmail: req.user && req.userType === 'user' ? req.user.email : req.body.email,
      // Initialize Donor-First Workflow
      workflowPhase: 'gathering',
      requestCreatedAt: new Date(),
      inventoryLocked: true, // Lock inventory initially (donor-first approach)
      unitsCollected: 0,
      status: req.body.urgency === 'emergency' ? 'IN_PROGRESS' : 'pending' // Emergency requests start as IN_PROGRESS
    };
    
    const request = await Request.create(requestData);

    // Determine compatible donor blood groups based on the requested blood group
    const compatibleBloodGroups = getCompatibleDonorGroups(request.bloodGroup);

    // Calculate eligibility dates based on request's requiredDate
    // Smart Logic: Check if donors will be eligible BY the required date, not just today
    const requiredDate = new Date(request.requiredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Calculate 56 days before the required date (not today)
    // This allows donors in cooling period today to be notified if they'll be eligible by the required date
    const fiftySixDaysBeforeRequired = new Date(requiredDate);
    fiftySixDaysBeforeRequired.setDate(fiftySixDaysBeforeRequired.getDate() - 56);
    
    // For emergency requests (required today), use today's date minus 56 days
    // For scheduled requests, use required date minus 56 days
    const eligibilityCutoffDate = requiredDate <= today 
      ? new Date(today.getTime() - (56 * 24 * 60 * 60 * 1000)) // 56 days ago from today
      : fiftySixDaysBeforeRequired; // 56 days before required date

    // GROUP A: Find compatible donors IN THE HOSPITAL'S CITY (for direct donation)
    // Use hospitalCity instead of requestor city for donor matching
    // Exclude the requestor from notifications
    const hospitalCity = request.hospitalCity || request.city; // Fallback to city for backward compatibility
    const sameCityWhere = {
      bloodGroup: { [Op.in]: compatibleBloodGroups },
      city: { [Op.like]: `%${hospitalCity}%` }, // Match donors in hospital city
      isActive: true,
      availableToDonate: true, // Only available users
      id: { [Op.ne]: request.userId || -1 }, // Exclude requestor
      [Op.or]: [
        { lastDonationAt: null },
        { lastDonationAt: { [Op.lte]: eligibilityCutoffDate } } // Eligible by required date
      ]
    };
    
    // Add state filter if provided
    if (request.state) {
      sameCityWhere.state = { [Op.like]: `%${request.state}%` };
    }
    
    const compatibleDonorsSameCity = await User.findAll({
      where: sameCityWhere,
      attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup', 'city', 'state', 'lastDonationAt'],
      order: [
        [literal('CASE WHEN lastDonationAt IS NULL THEN 0 ELSE 1 END'), 'ASC'],
        ['lastDonationAt', 'ASC']
      ]
    });

    // GROUP B: Find compatible donors IN DIFFERENT CITIES (for sharing)
    const compatibleDonorsDifferentCity = await User.findAll({
      where: {
        bloodGroup: { [Op.in]: compatibleBloodGroups },
        city: { [Op.notLike]: `%${hospitalCity}%` }, // Different from hospital city
        isActive: true,
        availableToDonate: true,
        id: { 
          [Op.notIn]: [
            ...compatibleDonorsSameCity.map(d => d.id),
            request.userId || -1 // Exclude requestor
          ]
        }
      },
      attributes: ['id', 'fullName', 'email', 'bloodGroup', 'city', 'state'],
      limit: 500 // Limit to prevent too many notifications
    });

    // GROUP D: Find compatible donors IN HOSPITAL CITY but IN COOLING PERIOD (for sharing)
    // These users can't donate directly but can still help by sharing
    const coolingPeriodWhere = {
      bloodGroup: { [Op.in]: compatibleBloodGroups },
      city: { [Op.like]: `%${hospitalCity}%` }, // Hospital city
      isActive: true,
      availableToDonate: true,
      lastDonationAt: { 
        [Op.and]: [
          { [Op.ne]: null }, // Has donated before
          { [Op.gt]: eligibilityCutoffDate } // But within cooling period (won't be eligible by required date)
        ]
      },
      id: { 
        [Op.notIn]: [
          ...compatibleDonorsSameCity.map(d => d.id),
          request.userId || -1 // Exclude requestor
        ]
      }
    };
    
    // Add state filter if provided
    if (request.state) {
      coolingPeriodWhere.state = { [Op.like]: `%${request.state}%` };
    }
    
    const compatibleDonorsCoolingPeriod = await User.findAll({
      where: coolingPeriodWhere,
      attributes: ['id', 'fullName', 'email', 'bloodGroup', 'city', 'state', 'lastDonationAt'],
      limit: 500
    });

    // GROUP C: Find ALL incompatible users (any location) for sharing
    const incompatibleUsers = await User.findAll({
      where: {
        bloodGroup: { [Op.notIn]: compatibleBloodGroups }, // Incompatible blood groups
        isActive: true,
        availableToDonate: true,
        id: { 
          [Op.notIn]: [
            ...compatibleDonorsSameCity.map(d => d.id),
            ...compatibleDonorsDifferentCity.map(d => d.id),
            ...compatibleDonorsCoolingPeriod.map(d => d.id),
            request.userId || -1 // Exclude requestor
          ]
        }
      },
      attributes: ['id', 'fullName', 'email', 'bloodGroup', 'city', 'state'],
      limit: 500 // Limit to prevent too many notifications
    });

    // Extract donor IDs for response
    const matchedDonorIds = compatibleDonorsSameCity.map(donor => donor.id);

    // Create THREE types of notifications

    // GROUP A: Compatible + Same City = Direct Donation Notification
    const directDonationNotifications = compatibleDonorsSameCity.map(donor => ({
      userId: donor.id,
      type: 'BLOOD_REQUEST',
      title: `🩸 URGENT: Your ${donor.bloodGroup} Blood is needed!`,
      message: `A patient near you needs ${request.bloodGroup} blood immediately. Click to respond.`,
      referenceId: request.id,
      isCompatible: true,
      isSameLocation: true,
      isRead: false
    }));

    // GROUP B: Compatible + Different City = Share Card Notification
    const shareNotificationsCompatible = compatibleDonorsDifferentCity.map(user => ({
      userId: user.id,
      type: 'SHARE_REQUEST',
      title: `📢 Help Needed: ${request.bloodGroup} Blood Shortage in ${hospitalCity}`,
      message: `We have an urgent request for ${request.bloodGroup} blood in ${hospitalCity}, ${request.state || ''}. You have ${user.bloodGroup} blood - do you know anyone there? Click to share.`,
      referenceId: request.id,
      isCompatible: true,
      isSameLocation: false,
      isRead: false
    }));

    // GROUP D: Compatible + Hospital City + Cooling Period = Share Card Notification
    const shareNotificationsCoolingPeriod = compatibleDonorsCoolingPeriod.map(user => ({
      userId: user.id,
      type: 'SHARE_REQUEST',
      title: `📢 Help Needed: ${request.bloodGroup} Blood Shortage in ${hospitalCity}`,
      message: `We have an urgent request for ${request.bloodGroup} blood in ${hospitalCity}, ${request.state || ''}. You recently donated, but you can still help by sharing this request with others who can donate. Click to share.`,
      referenceId: request.id,
      isCompatible: true,
      isSameLocation: true, // Same location but in cooling period
      isRead: false
    }));

    // GROUP C: Incompatible users - split by location (based on hospital city)
    // Same hospital city incompatible users
    const incompatibleUsersSameCity = incompatibleUsers.filter(user => 
      user.city && hospitalCity && user.city.toLowerCase().includes(hospitalCity.toLowerCase())
    );
    
    // Different city incompatible users (different from hospital city)
    const incompatibleUsersDifferentCity = incompatibleUsers.filter(user => 
      !user.city || !hospitalCity || !user.city.toLowerCase().includes(hospitalCity.toLowerCase())
    );
    
    // Same hospital city incompatible = Share Card Notification
    const shareNotificationsIncompatibleSameCity = incompatibleUsersSameCity.map(user => ({
      userId: user.id,
      type: 'SHARE_REQUEST',
      title: `📢 Help Needed: ${request.bloodGroup} Blood Shortage in ${hospitalCity}`,
      message: `We have an urgent request for ${request.bloodGroup} blood in ${hospitalCity}, ${request.state || ''}. Do you know anyone? Click to share.`,
      referenceId: request.id,
      isCompatible: false,
      isSameLocation: true,
      isRead: false
    }));
    
    // Different city incompatible = Share Card Notification
    const shareNotificationsIncompatibleDifferentCity = incompatibleUsersDifferentCity.map(user => ({
      userId: user.id,
      type: 'SHARE_REQUEST',
      title: `📢 Help Needed: ${request.bloodGroup} Blood Shortage`,
      message: `We have an urgent request for ${request.bloodGroup} blood. Do you know anyone? Click to share.`,
      referenceId: request.id,
      isCompatible: false,
      isSameLocation: false,
      isRead: false
    }));

    // Notification logic:
    // - Emergency/Urgent requests: 
    //   * Same city users: 
    //     - Compatible + no cooling period → Direct donation notification (can donate) + See in urgent section
    //     - Compatible + cooling period → Share card notification + See in urgent section
    //     - Incompatible → Share card notification + See in urgent section
    //   * Different city users: 
    //     - Compatible (any) → Share card notification
    //     - Incompatible → Share card notification
    // - Normal/Scheduled requests: Create notifications for all (same and different cities)
    const allNotifications = [];
    
    if (request.urgency === 'emergency' || request.urgency === 'urgent') {
      // For emergency/urgent:
      // Same city users get notifications (direct donation for compatible, share card for others)
      // Different city users get share card notifications
      // All same city users will ALSO see it in "Urgent Blood Requests Near You" section
      allNotifications.push(
        ...directDonationNotifications, // Same city compatible + no cooling period (can donate)
        ...shareNotificationsCoolingPeriod, // Same city compatible + cooling period (share card)
        ...shareNotificationsIncompatibleSameCity, // Same city incompatible (share card)
        ...shareNotificationsCompatible, // Different city compatible users (share card)
        ...shareNotificationsIncompatibleDifferentCity // Different city incompatible (share card)
      );
    } else {
      // For normal/scheduled requests: Create notifications for all
      allNotifications.push(
        ...directDonationNotifications,
        ...shareNotificationsCompatible,
        ...shareNotificationsCoolingPeriod,
        ...shareNotificationsIncompatibleSameCity,
        ...shareNotificationsIncompatibleDifferentCity
      );
    }

    if (allNotifications.length > 0) {
      await Notification.bulkCreate(allNotifications);
    }

    // Return response with matching information
    res.status(201).json({ 
      success: true, 
      request,
      potentialDonorsFound: compatibleDonorsSameCity.length,
      potentialDonorsCount: compatibleDonorsSameCity.length,
      matchedDonorIds: matchedDonorIds,
      notificationsCreated: allNotifications.length
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get all requests
// @route   GET /api/requests
// @access  Public
exports.getAllRequests = async (req, res) => {
  try {
    const { status, urgency, bloodGroup, city } = req.query;
    let where = {};
    const include = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email'],
        required: false
      },
      {
        model: User,
        as: 'matchedDonors',
        attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup', 'city'],
        required: false,
        through: { attributes: [] }
      }
    ];

    if (status) {
      where.status = status;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    if (bloodGroup) {
      where.bloodGroup = bloodGroup;
    }

    if (city) {
      where.city = { [Op.like]: `%${city}%` };
    }

    // If userId is explicitly provided in query, filter by that user
    // Otherwise, if user is logged in and no other filters, show only their requests
    // But if they're browsing urgent requests or filtering by city, show all matching requests EXCEPT their own
    const { userId } = req.query;
    if (userId) {
      where.userId = userId;
    } else if (req.user && req.userType === 'user') {
      if (!urgency && !city && !bloodGroup) {
        // Only filter to user's own requests if they're not browsing/filtering
        where.userId = req.user.id;
      } else {
        // When browsing/filtering, exclude user's own requests
        where.userId = { [Op.ne]: req.user.id };
      }
    }

    const requests = await Request.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single request
// @route   GET /api/requests/:id
// @access  Public
exports.getRequest = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email'],
          required: false
        },
        {
          model: User,
          as: 'matchedDonors',
          attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup', 'city'],
          required: false,
          through: { attributes: [] }
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update request status
// @route   PUT /api/requests/:id/status
// @access  Private
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const request = await Request.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Validate status value
    const validStatuses = ['pending', 'matched', 'fulfilled', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Authorization check: Only the request creator (user) can modify their own request
    // Organizations can also update status (to approve/fulfill), but regular users can only modify their own
    if (req.userType === 'user') {
      // Regular users can only modify their own requests
      if (!request.userId || request.userId !== req.user.id) {
        return res.status(403).json({ 
          success: false,
          message: 'Access denied. You can only modify your own requests.' 
        });
      }
    }
    // Organizations can update status (for approving/fulfilling requests)
    // No additional check needed for organizations

    // If status is being set to 'fulfilled', validate authorization
    // Note: Inventory deduction is handled automatically by the after_request_fulfillment trigger
    if (status === 'fulfilled' && request.status !== 'fulfilled') {
      // Only organizations can fulfill requests
      if (req.userType !== 'organization') {
        return res.status(403).json({ 
          success: false,
          message: 'Only organizations can fulfill requests and deduct from inventory.' 
        });
      }

      const organization = await Organization.findByPk(req.user.id);
      if (!organization) {
        return res.status(404).json({ 
          success: false,
          message: 'Organization not found' 
        });
      }

      // Note: The trigger will automatically deduct inventory when status changes to 'fulfilled'
      // The trigger finds an organization in the request's city with sufficient inventory
      // and uses FIFO (First In First Out) method for deduction
      
      // Update request status to fulfilled (trigger will handle inventory deduction)
      await request.update({
        status: 'fulfilled'
      });

      res.json({ 
        success: true, 
        message: 'Request fulfilled. Inventory deducted automatically by trigger.',
        request 
      });
      return;
    }

    // For other status updates, just update normally
    await request.update({
      status: status || request.status
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Match donors to request (user expresses interest in donating)
// @route   POST /api/requests/:id/match
// @access  Private (User)
exports.matchDonors = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // If user is logged in, create a donation record linked to this request
    if (req.user && req.userType === 'user') {
      const { Donation } = require('../models');
      const user = req.user;

      // Check if user already expressed interest (donation already exists for this request)
      const existingDonation = await Donation.findOne({
        where: {
          requestId: request.id,
          userId: user.id,
          status: { [Op.in]: ['pending', 'approved', 'scheduled'] }
        }
      });

      if (existingDonation) {
        return res.status(400).json({ 
          success: false,
          message: 'You have already expressed interest in this request' 
        });
      }

      // Check 56-day cooldown
      if (user.lastDonationAt) {
        const daysSince = Math.floor((Date.now() - new Date(user.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 56) {
          const daysRemaining = 56 - daysSince;
          return res.status(400).json({ 
            success: false,
            message: `You cannot donate within 56 days of your last donation. You need to wait ${daysRemaining} more days.` 
          });
        }
      }

      // Verify blood group compatibility using the compatibility function
      const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);
      if (!compatibleGroups.includes(user.bloodGroup)) {
        return res.status(400).json({ 
          success: false,
          message: `Blood group mismatch. Request requires ${request.bloodGroup}, but you have ${user.bloodGroup}` 
        });
      }

      // Create donation record linked to this request
      const donation = await Donation.create({
        userId: user.id,
        userEmail: user.email,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        age: user.age || 25, // Default age if not set
        bloodGroup: user.bloodGroup,
        address: user.address || '',
        city: user.city || request.hospitalCity || request.city, // Use hospital city for donation location
        state: user.state || request.state,
        zipCode: user.zipCode || request.zipCode || '',
        requestId: request.id,
        status: 'pending',
        selectedOrganization: null // Will be set when organization accepts
      });

      // Also add to RequestDonors for backward compatibility
      await request.addMatchedDonor(user);

      return res.json({ 
        success: true, 
        message: 'Thank you! Your interest has been recorded. The organization will review your donation.',
        donation,
        request
      });
    }

    // Legacy behavior: Find matching donors (for non-authenticated or admin use)
    // Use hospital city for donor matching
    const hospitalCityForMatch = request.hospitalCity || request.city; // Fallback for backward compatibility
    const donors = await User.findAll({
      where: {
        bloodGroup: request.bloodGroup,
        city: { [Op.like]: `%${hospitalCityForMatch}%` }, // Match by hospital city
        isActive: true,
        availableToDonate: true, // Only match users who are available to donate
        [Op.or]: [
          { lastDonationAt: null },
          { lastDonationAt: { [Op.lte]: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) } }
        ]
      },
      limit: 20
    });

    // Set matched donors
    await request.setMatchedDonors(donors);

    res.json({ 
      success: true, 
      request,
      matchedCount: donors.length
    });
  } catch (error) {
    console.error('Match donors error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update request details
// @route   PUT /api/requests/:id
// @access  Private (User only)
exports.updateRequest = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Authorization: Only the request creator can update their own request
    if (req.userType !== 'user' || !request.userId || request.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only modify your own requests.' 
      });
    }

    // Only allow updating certain fields (not status - use status endpoint for that)
    const allowedFields = [
      'patientName', 'contactPerson', 'email', 'phone', 'bloodGroup',
      'donationType', 'unitsRequired', 'urgency', 'requiredDate',
      'hospitalName', 'hospitalAddress', 'city', 'state', 'zipCode',
      'patientCondition', 'doctorName', 'doctorContact'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Don't allow updating if request is already fulfilled or cancelled
    if (request.status === 'fulfilled' || request.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot modify request with status: ${request.status}` 
      });
    }

    await request.update(updates);

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete request
// @route   DELETE /api/requests/:id
// @access  Private
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Authorization check: Only the request creator can delete their own request
    if (req.userType === 'user') {
      // Regular users can only delete their own requests
      if (!request.userId || request.userId !== req.user.id) {
        return res.status(403).json({ 
          success: false,
          message: 'Access denied. You can only delete your own requests.' 
        });
      }
    }
    // Organizations should not be able to delete requests (only users can delete their own)
    if (req.userType === 'organization') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Organizations cannot delete requests.' 
      });
    }

    const requestId = request.id;
    
    // Delete all notifications related to this request BEFORE deleting the request
    // This ensures notifications are cleaned up immediately
    try {
      const deletedCount = await Notification.destroy({
        where: {
          referenceId: requestId,
          type: { [Op.in]: ['BLOOD_REQUEST', 'SHARE_REQUEST'] }
        }
      });
      console.log(`Deleted ${deletedCount} notifications for request ${requestId}`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      // Continue with request deletion even if notification deletion fails
    }

    // Delete the request (this will cascade delete RequestDonors due to foreign key)
    await request.destroy();

    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Respond to a blood request (accept/reject)
// @route   POST /api/requests/:id/respond
// @access  Private (User)
exports.respondToRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;

    // Validate status
    if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be "ACCEPTED" or "REJECTED"' 
      });
    }

    // Check if user is authenticated
    if (!req.user || req.userType !== 'user') {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. Only users can respond to requests.' 
      });
    }

    const user = req.user;

    // Fetch the request
    const request = await Request.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Request not found' 
      });
    }

    // Check if request is already fulfilled
    if (request.status === 'fulfilled') {
      return res.status(400).json({ 
        success: false,
        message: 'Request already fulfilled.' 
      });
    }

    // If status is REJECTED, just return success (no action needed)
    if (status === 'REJECTED') {
      return res.json({ 
        success: true, 
        message: 'Response recorded. Thank you for your consideration.' 
      });
    }

    // Handle ACCEPTED status
    if (status === 'ACCEPTED') {
      // Check if user already responded to this request
      const existingDonation = await Donation.findOne({
        where: {
          requestId: request.id,
          userId: user.id
        }
      });

      if (existingDonation) {
        return res.status(400).json({ 
          success: false,
          message: 'You have already responded to this request.' 
        });
      }

      // Check 56-day cooldown
      if (user.lastDonationAt) {
        const daysSince = Math.floor((Date.now() - new Date(user.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 56) {
          const daysRemaining = 56 - daysSince;
          return res.status(400).json({ 
            success: false,
            message: `You cannot donate within 56 days of your last donation. You need to wait ${daysRemaining} more days.` 
          });
        }
      }

      // Verify blood group compatibility
      const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);
      if (!compatibleGroups.includes(user.bloodGroup)) {
        return res.status(400).json({ 
          success: false,
          message: `Blood group mismatch. Request requires ${request.bloodGroup}, but you have ${user.bloodGroup}` 
        });
      }

      // Use transaction to handle race conditions
      const transaction = await sequelize.transaction();

      try {
        // Re-fetch request with lock to prevent race conditions
        const lockedRequest = await Request.findByPk(requestId, {
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        // Double-check if request is still not fulfilled
        if (lockedRequest.status === 'fulfilled') {
          await transaction.rollback();
          return res.status(400).json({ 
            success: false,
            message: 'Request already fulfilled.' 
          });
        }

        // Create a Donation record for this user linked to this request
        const donation = await Donation.create({
          userId: user.id,
          userEmail: user.email,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          age: user.age || 25,
          bloodGroup: user.bloodGroup,
          address: user.address || '',
          city: user.city || request.hospitalCity || request.city, // Use hospital city for donation location
          state: user.state || request.state,
          zipCode: user.zipCode || request.zipCode || '',
          requestId: request.id,
          status: 'pending'
        }, { transaction });

        // Increment current_donors_count on the Request
        const newDonorsCount = (lockedRequest.currentDonorsCount || 0) + 1;
        
        // Check if we have enough donors
        if (newDonorsCount >= lockedRequest.unitsRequired) {
          // Update Request status to fulfilled
          await lockedRequest.update({
            status: 'fulfilled',
            currentDonorsCount: newDonorsCount
          }, { transaction });

          // Find the organization associated with this request (if any)
          // For now, we'll create a notification for the request creator
          // In a real system, you might want to find the organization by city/hospital
          if (lockedRequest.userId) {
            await Notification.create({
              userId: lockedRequest.userId,
              type: 'REQUEST_ACCEPTED',
              message: `Request #${lockedRequest.id} fully matched! All ${lockedRequest.unitsRequired} units have been secured.`,
              referenceId: lockedRequest.id,
              isRead: false
            }, { transaction });
          }

          await transaction.commit();

          return res.json({ 
            success: true, 
            message: 'Thank you! Your donation has been recorded. This request is now fully matched!',
            donation,
            requestStatus: 'fulfilled'
          });
        } else {
          // Update Request status to IN_PROGRESS
          await lockedRequest.update({
            status: 'IN_PROGRESS',
            currentDonorsCount: newDonorsCount
          }, { transaction });

          await transaction.commit();

          return res.json({ 
            success: true, 
            message: `Thank you! Your donation has been recorded. ${newDonorsCount} of ${lockedRequest.unitsRequired} units secured.`,
            donation,
            requestStatus: 'IN_PROGRESS',
            donorsCount: newDonorsCount,
            unitsRequired: lockedRequest.unitsRequired
          });
        }
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
