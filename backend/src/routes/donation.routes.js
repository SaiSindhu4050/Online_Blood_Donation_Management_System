const express = require('express');
const router = express.Router();
const {
  createDonation,
  getAllDonations,
  getDonation,
  updateDonationStatus,
  deleteDonation,
  requestReschedule,
  markDonationCompleted
} = require('../controllers/donation.controller');
const { protect, optionalAuth, isUser, isOrganization } = require('../middleware/auth.middleware');

// Create donation (public with optional auth)
router.post('/', optionalAuth, createDonation);

// Get all donations (protected)
router.get('/', protect, getAllDonations);

// Request reschedule (user only) - Must come before /:id route
router.post('/:id/request-reschedule', protect, isUser, requestReschedule);

// Mark donation as completed (organization only) - Must come before /:id/status
router.put('/:id/mark-completed', protect, isOrganization, markDonationCompleted);

// Update donation status (organization/admin only)
router.put('/:id/status', protect, isOrganization, updateDonationStatus);

// Get single donation (protected)
router.get('/:id', protect, getDonation);

// Delete donation (protected)
router.delete('/:id', protect, deleteDonation);

module.exports = router;

