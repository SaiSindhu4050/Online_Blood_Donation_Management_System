const express = require('express');
const router = express.Router();
const {
  cancelEvent,
  rescheduleEvent
} = require('../controllers/eventCancellation.controller');
const { protect, isOrganization } = require('../middleware/auth.middleware');

// Cancel event (organization only)
router.post('/events/:id/cancel', protect, isOrganization, cancelEvent);

// Reschedule event (organization only)
router.post('/events/:id/reschedule', protect, isOrganization, rescheduleEvent);

module.exports = router;
