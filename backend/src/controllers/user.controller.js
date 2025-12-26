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

    // Get urgent requests in user's city (exclude user's own requests)
    // Exclude user's own requests and filter by city
    // Op.ne will exclude user's own requests and include null userIds (anonymous requests)
    const urgentRequests = await Request.findAll({
      where: {
        urgency: { [Op.in]: ['emergency', 'urgent'] },
        status: { [Op.ne]: 'fulfilled' },
        city: user.city, // Match city exactly
        userId: { [Op.ne]: req.user.id } // Exclude user's own requests (includes null userIds)
      },
      order: [['urgency', 'ASC'], ['requiredDate', 'ASC']],
      limit: 20
    });

    // Get organizations in user's city
    const organizations = await Organization.findAll({
      where: { 
        city: user.city,
        isActive: true,
        isVerified: true
      },
      limit: 10,
      attributes: ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'website', 'description']
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
