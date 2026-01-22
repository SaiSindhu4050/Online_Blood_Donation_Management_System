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
  handleRescheduleRequest,
  getAvailableDonors,
  markPatientReady,
  waitForDonors,
  emergencyOverride,
  getWorkflowStatus
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
router.get('/available-donors', getAvailableDonors);
router.post('/accept-request-donation', acceptRequestAndDonation);
router.get('/reschedule-requests', getRescheduleRequests);
router.put('/reschedule-requests/:id', handleRescheduleRequest);

// Donor-First Workflow endpoints
router.post('/requests/:id/patient-ready', markPatientReady);
router.post('/requests/:id/wait-for-donors', waitForDonors);
router.post('/requests/:id/emergency-override', emergencyOverride);
router.get('/requests/:id/workflow-status', getWorkflowStatus);

module.exports = router;

