const express = require('express');
const router = express.Router();
const {
  createRequest,
  getAllRequests,
  getRequest,
  updateRequest,
  updateRequestStatus,
  matchDonors,
  deleteRequest,
  respondToRequest
} = require('../controllers/request.controller');
const { protect, optionalAuth, isUser } = require('../middleware/auth.middleware');

// Create request (public with optional auth)
router.post('/', optionalAuth, createRequest);

// Get all requests (public)
router.get('/', getAllRequests);

// Get single request (public)
router.get('/:id', getRequest);

// Match donors to request (protected - user only, for expressing interest)
// Optional auth for backward compatibility (legacy behavior for admin use)
router.post('/:id/match', optionalAuth, matchDonors);

// Respond to request (accept/reject) - protected - user only
router.post('/:id/respond', protect, isUser, respondToRequest);

// Update request details (protected - user only)
router.put('/:id', protect, isUser, updateRequest);

// Update request status (protected)
router.put('/:id/status', protect, updateRequestStatus);

// Delete request (protected - user only)
router.delete('/:id', protect, isUser, deleteRequest);

module.exports = router;

