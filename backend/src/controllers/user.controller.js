const { User, Donation, Request, Organization, Event } = require('../models');
const { Op } = require('sequelize');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      address,
      city,
      state,
      zipCode,
      bloodGroup
    } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({
      fullName,
      phone,
      address,
      city,
      state,
      zipCode,
      bloodGroup
    });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's donations
    const donations = await Donation.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get user's requests
    const requests = await Request.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get urgent requests in user's city (exclude user's own requests and cancelled/deleted)
    // Match by HOSPITAL city, not requestor city - donors should see requests for hospitals in their city
    // This includes ALL users in same hospital city, even those who would get share card
    // Exclude user's own requests and filter by hospital city
    // Op.ne will exclude user's own requests and include null userIds (anonymous requests)
    // Note: Deleted requests won't appear since they're physically removed from database
    // Use case-insensitive LIKE for hospital city matching
    const urgentRequests = await Request.findAll({
      where: {
        urgency: { [Op.in]: ['emergency', 'urgent'] },
        status: { [Op.notIn]: ['fulfilled', 'cancelled'] }, // Exclude fulfilled and cancelled
        [Op.or]: [
          { hospitalCity: { [Op.like]: `%${user.city}%` } }, // Match by hospital city (preferred)
          { city: { [Op.like]: `%${user.city}%` } } // Fallback to legacy city field
        ],
        userId: { [Op.ne]: req.user.id } // Exclude user's own requests (includes null userIds)
      },
      order: [['urgency', 'ASC'], ['requiredDate', 'ASC']],
      limit: 20
    });

    // Get organizations near user:
    // 1) Prefer exact ZIP code match (most precise)
    // 2) Fallback to city match (case-insensitive, partial)
    const orgWhere = {
      isActive: true
    };

    if (user.zipCode) {
      orgWhere.zipCode = user.zipCode;
    } else if (user.city) {
      orgWhere.city = { [Op.like]: `%${user.city}%` };
    }

    const organizations = await Organization.findAll({
      where: orgWhere,
      limit: 10,
      attributes: ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'website', 'description']
    });

    // Get upcoming events in user's city
    const events = await Event.findAll({
      where: {
        status: { [Op.in]: ['upcoming', 'ongoing'] },
        eventDate: { [Op.gte]: new Date() },
        locationCity: user.city
      },
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'city']
      }],
      order: [['eventDate', 'ASC']],
      limit: 10
    });

    // Calculate stats
    // Only count 'completed' donations - donations are only counted after customer actually shows up and donates
    // 'approved' and 'scheduled' are just appointments, not actual donations yet
    const totalDonations = await Donation.count({
      where: {
        userId: req.user.id,
        status: 'completed'
      }
    });

    const pendingDonations = await Donation.count({
      where: {
        userId: req.user.id,
        status: 'pending'
      }
    });

    const totalRequests = await Request.count({
      where: { userId: req.user.id }
    });

    res.json({
      success: true,
      dashboard: {
        donations: donations,
        requests: requests,
        urgentRequests: urgentRequests,
        organizations: organizations,
        events: events,
        stats: {
          totalDonations,
          pendingDonations,
          totalRequests
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user privacy settings
// @route   PUT /api/users/privacy-settings
// @access  Private
exports.updatePrivacySettings = async (req, res) => {
  try {
    const {
      availableToDonate,
      showPhoneNumber,
      anonymousMode
    } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update privacy settings
    const updateData = {};
    if (availableToDonate !== undefined) updateData.availableToDonate = availableToDonate;
    if (showPhoneNumber !== undefined) updateData.showPhoneNumber = showPhoneNumber;
    if (anonymousMode !== undefined) updateData.anonymousMode = anonymousMode;

    await user.update(updateData);

    res.json({ 
      success: true, 
      message: 'Privacy settings updated successfully',
      privacySettings: {
        availableToDonate: user.availableToDonate,
        showPhoneNumber: user.showPhoneNumber,
        anonymousMode: user.anonymousMode
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
