const { Testimonial, User, Donation, Request } = require('../models');
const { Op } = require('sequelize');

// Create a new testimonial
exports.createTestimonial = async (req, res) => {
  try {
    const { message, authorName, authorRole, userType, donationId, requestId } = req.body;

    if (!message || !authorName || !authorRole || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Message, author name, author role, and user type are required'
      });
    }

    // Validate userType
    if (!['donor', 'requestor', 'family_member'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be donor, requestor, or family_member'
      });
    }

    // If userId is provided (from authenticated user), use it
    const userId = req.user && req.userType === 'user' ? req.user.id : null;

    // Validate donationId or requestId if provided
    if (donationId) {
      const donation = await Donation.findByPk(donationId);
      if (!donation) {
        return res.status(404).json({
          success: false,
          message: 'Donation not found'
        });
      }
    }

    if (requestId) {
      const request = await Request.findByPk(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }
    }

    const testimonial = await Testimonial.create({
      userId,
      donationId: donationId || null,
      requestId: requestId || null,
      userType,
      message,
      authorName,
      authorRole,
      status: 'pending' // New testimonials start as pending
    });

    res.status(201).json({
      success: true,
      message: 'Testimonial submitted successfully. It will be reviewed before being published.',
      testimonial
    });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create testimonial'
    });
  }
};

// Get user's testimonials
exports.getUserTestimonials = async (req, res) => {
  try {
    if (!req.user || req.userType !== 'user') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Use userId from params if provided, otherwise use authenticated user
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;
    
    // If using params userId, verify it matches authenticated user
    if (req.params.userId && parseInt(req.params.userId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own testimonials'
      });
    }

    const testimonials = await Testimonial.findAll({
      where: {
        userId: userId
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      testimonials
    });
  } catch (error) {
    console.error('Error fetching user testimonials:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch testimonials'
    });
  }
};

// Get public testimonials (approved only)
exports.getPublicTestimonials = async (req, res) => {
  try {
    const { limit = 6, featured = false } = req.query;

    const whereClause = {
      status: 'approved'
    };

    // If featured is requested, prioritize featured testimonials
    if (featured === 'true') {
      whereClause.isFeatured = true;
    }

    const testimonials = await Testimonial.findAll({
      where: whereClause,
      order: [
        ['isFeatured', 'DESC'], // Featured first
        ['createdAt', 'DESC'] // Then by newest
      ],
      limit: parseInt(limit),
      attributes: ['id', 'message', 'authorName', 'authorRole', 'createdAt', 'isFeatured']
    });

    res.json({
      success: true,
      testimonials
    });
  } catch (error) {
    console.error('Error fetching public testimonials:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch testimonials'
    });
  }
};

// Update testimonial (by author)
exports.updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, authorName, authorRole } = req.body;

    const testimonial = await Testimonial.findByPk(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Check if user is the author
    if (req.user && req.userType === 'user' && testimonial.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own testimonials'
      });
    }

    // Only allow updates to pending testimonials
    if (testimonial.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You can only update pending testimonials'
      });
    }

    // Update fields
    if (message) testimonial.message = message;
    if (authorName) testimonial.authorName = authorName;
    if (authorRole) testimonial.authorRole = authorRole;

    await testimonial.save();

    res.json({
      success: true,
      message: 'Testimonial updated successfully',
      testimonial
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update testimonial'
    });
  }
};

// Delete testimonial (by author)
exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findByPk(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Check if user is the author
    if (req.user && req.userType === 'user' && testimonial.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own testimonials'
      });
    }

    await testimonial.destroy();

    res.json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete testimonial'
    });
  }
};

// Approve testimonial (admin/org)
exports.approveTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is organization or admin
    if (!req.user || req.userType !== 'organization') {
      return res.status(403).json({
        success: false,
        message: 'Only organizations can approve testimonials'
      });
    }

    const testimonial = await Testimonial.findByPk(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    testimonial.status = 'approved';
    await testimonial.save();

    res.json({
      success: true,
      message: 'Testimonial approved successfully',
      testimonial
    });
  } catch (error) {
    console.error('Error approving testimonial:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve testimonial'
    });
  }
};

// Feature testimonial (admin/org)
exports.featureTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    // Check if user is organization or admin
    if (!req.user || req.userType !== 'organization') {
      return res.status(403).json({
        success: false,
        message: 'Only organizations can feature testimonials'
      });
    }

    const testimonial = await Testimonial.findByPk(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Only allow featuring approved testimonials
    if (testimonial.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved testimonials can be featured'
      });
    }

    testimonial.isFeatured = isFeatured === true || isFeatured === 'true';
    await testimonial.save();

    res.json({
      success: true,
      message: `Testimonial ${testimonial.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      testimonial
    });
  } catch (error) {
    console.error('Error featuring testimonial:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to feature testimonial'
    });
  }
};
