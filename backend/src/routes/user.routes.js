const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getDashboard
} = require('../controllers/user.controller');
const { protect, isUser } = require('../middleware/auth.middleware');

// All routes require authentication and user role
router.use(protect);
router.use(isUser);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/dashboard', getDashboard);

module.exports = router;

