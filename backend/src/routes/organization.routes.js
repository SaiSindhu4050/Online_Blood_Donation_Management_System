const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getDashboard,
  getAllOrganizations,
  acceptRequestAndDonation,
  getInventory,
  getRescheduleRequests,
  handleRescheduleRequest
} = require('../controllers/organization.controller');
const { protect, isOrganization } = require('../middleware/auth.middleware');

// Public route
router.get('/', getAllOrganizations);

// Protected routes
router.use(protect);
router.use(isOrganization);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/dashboard', getDashboard);
router.get('/inventory', getInventory);
router.post('/accept-request-donation', acceptRequestAndDonation);
router.get('/reschedule-requests', getRescheduleRequests);
router.put('/reschedule-requests/:id', handleRescheduleRequest);

module.exports = router;

