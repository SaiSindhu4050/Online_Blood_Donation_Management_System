const express = require('express');
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations
} = require('../controllers/event.controller');
const { protect, isOrganization } = require('../middleware/auth.middleware');

// Get all events (public)
router.get('/', getAllEvents);

// Get single event (public)
router.get('/:id', getEvent);

// Create event (organization only)
router.post('/', protect, isOrganization, createEvent);

// Update event (organization only)
router.put('/:id', protect, isOrganization, updateEvent);

// Delete event (organization only)
router.delete('/:id', protect, isOrganization, deleteEvent);

// Get event registrations (organization only)
router.get('/:id/registrations', protect, isOrganization, getEventRegistrations);

module.exports = router;

