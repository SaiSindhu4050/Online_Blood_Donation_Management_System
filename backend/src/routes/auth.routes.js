const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  registerOrganization,
  loginOrganization,
  getMe
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// User routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Organization routes
router.post('/org/register', registerOrganization);
router.post('/org/login', loginOrganization);

// Get current user/organization
router.get('/me', protect, getMe);

module.exports = router;

