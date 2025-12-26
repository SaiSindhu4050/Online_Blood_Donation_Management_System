const { Event, Organization, Donation, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Organization)
exports.createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      organizationId: req.user.id,
      locationAddress: req.body.location?.address || req.body.locationAddress,
      locationCity: req.body.location?.city || req.body.locationCity,
      locationState: req.body.location?.state || req.body.locationState,
      locationZipCode: req.body.location?.zipCode || req.body.locationZipCode
    };

    const event = await Event.create(eventData);

    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getAllEvents = async (req, res) => {
  try {
    const { organization, status, city } = req.query;
    let where = {};
    const include = [
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'email', 'city'],
        required: false
      }
    ];

    if (organization) {
      where.organizationId = organization;
    }

    if (status) {
      where.status = status;
    }

    if (city) {
      where.locationCity = { [Op.like]: `%${city}%` };
    }

    // If organization is logged in, show only their events
    if (req.user && req.userType === 'organization') {
      where.organizationId = req.user.id;
    }

    const events = await Event.findAll({
      where,
      include,
      order: [['eventDate', 'ASC']]
    });

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'email', 'phone', 'address', 'city', 'state'],
          required: false
        },
        {
          model: Donation,
          as: 'donations',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'fullName', 'email', 'bloodGroup'],
              required: false
            }
          ],
          required: false
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organization)
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if organization owns this event
    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = { ...req.body };
    if (req.body.location) {
      updateData.locationAddress = req.body.location.address;
      updateData.locationCity = req.body.location.city;
      updateData.locationState = req.body.location.state;
      updateData.locationZipCode = req.body.location.zipCode;
    }

    await event.update(updateData);

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organization)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if organization owns this event
    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await event.destroy();

    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get event registrations
// @route   GET /api/events/:id/registrations
// @access  Private (Organization)
exports.getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if organization owns this event
    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const donations = await Donation.findAll({
      where: { eventId: event.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'phone', 'bloodGroup'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, donations, event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
