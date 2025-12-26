const { Request, User, BloodInventory, Organization } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a new blood request
// @route   POST /api/requests
// @access  Public (optional auth)
exports.createRequest = async (req, res) => {
  try {
    const request = await Request.create({
      ...req.body,
      userId: req.user && req.userType === 'user' ? req.user.id : null,
      userEmail: req.user && req.userType === 'user' ? req.user.email : req.body.email
    });

    // Find potential donors based on blood group and location
    const potentialDonors = await User.findAll({
      where: {
        bloodGroup: request.bloodGroup,
        city: { [Op.like]: `%${request.city}%` },
        isActive: true,
        [Op.or]: [
          { lastDonationAt: null },
          { lastDonationAt: { [Op.lte]: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) } }
        ]
      },
      limit: 10
    });

    res.status(201).json({ 
      success: true, 
      request,
      potentialDonors: potentialDonors.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    // If status is being set to 'fulfilled', deduct from inventory
    if (status === 'fulfilled' && request.status !== 'fulfilled') {
      // Only organizations can fulfill requests (deduct from their inventory)
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

      // Check available inventory
      const availableInventory = await BloodInventory.findAll({
        where: {
          organizationId: organization.id,
          bloodGroup: request.bloodGroup,
          donationType: request.donationType || 'Whole Blood',
          status: 'active',
          expirationDate: { [Op.gte]: new Date() } // Not expired
        },
        order: [['expirationDate', 'ASC'], ['id', 'ASC']] // FIFO: oldest expiration first
      });

      // Calculate total available units
      const totalAvailable = availableInventory.reduce((sum, item) => sum + item.units, 0);

      if (totalAvailable < request.unitsRequired) {
        return res.status(400).json({ 
          success: false,
          message: `Insufficient inventory. Available: ${totalAvailable} units, Required: ${request.unitsRequired} units.` 
        });
      }

      // Deduct from inventory using FIFO (First In First Out)
      let unitsRemaining = request.unitsRequired;
      
      for (const inventoryItem of availableInventory) {
        if (unitsRemaining <= 0) break;

        if (inventoryItem.units <= unitsRemaining) {
          // Fully consume this inventory item
          unitsRemaining -= inventoryItem.units;
          
          // Delete the inventory record (fully consumed)
          await inventoryItem.destroy();
        } else {
          // Partially consume this inventory item
          await inventoryItem.update({
            units: inventoryItem.units - unitsRemaining
          });
          unitsRemaining = 0;
        }
      }

      // Update request status to fulfilled
      await request.update({
        status: 'fulfilled'
      });

      res.json({ 
        success: true, 
        message: 'Request fulfilled and inventory deducted successfully',
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

      // Verify blood group compatibility
      if (user.bloodGroup !== request.bloodGroup) {
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
        city: user.city || request.city,
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
    const donors = await User.findAll({
      where: {
        bloodGroup: request.bloodGroup,
        city: { [Op.like]: `%${request.city}%` },
        isActive: true,
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

    await request.destroy();

    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
