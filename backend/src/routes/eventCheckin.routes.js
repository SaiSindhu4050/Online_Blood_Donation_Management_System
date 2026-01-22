const express = require('express');
const router = express.Router();
const {
  generateCheckInCode,
  checkInDonor,
  getEventCheckins,
  getCheckInStats
} = require('../controllers/eventCheckin.controller');
const { protect, isOrganization } = require('../middleware/auth.middleware');

// Generate check-in code (organization only)
router.post('/donations/:id/generate-checkin-code', protect, isOrganization, generateCheckInCode);

// Check in donor (organization or public for QR code - checkInCode can be used without auth)
router.post('/events/:id/checkin', checkInDonor);

// Get event check-ins (organization only)
router.get('/events/:id/checkins', protect, isOrganization, getEventCheckins);

// Get check-in statistics (organization only)
router.get('/events/:id/checkin-stats', protect, isOrganization, getCheckInStats);

module.exports = router;
