const express = require('express');
const router = express.Router();
const {
  joinWaitlist,
  getWaitlist,
  removeFromWaitlist,
  processWaitlist
} = require('../controllers/eventWaitlist.controller');
const { protect, isOrganization } = require('../middleware/auth.middleware');

// Join waitlist (public)
router.post('/events/:id/waitlist', joinWaitlist);

// Get waitlist (organization only)
router.get('/events/:id/waitlist', protect, isOrganization, getWaitlist);

// Remove from waitlist
router.delete('/events/:id/waitlist/:waitlistId', protect, removeFromWaitlist);

// Process waitlist manually (organization only)
router.post('/events/:id/process-waitlist', protect, isOrganization, processWaitlist);

module.exports = router;
