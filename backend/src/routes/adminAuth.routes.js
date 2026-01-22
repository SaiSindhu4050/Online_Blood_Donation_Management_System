const express = require('express');
const router = express.Router();
const { loginAdmin, getMe } = require('../controllers/adminAuth.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');

// Public routes
router.post('/login', loginAdmin);

// Protected routes
router.get('/me', protect, isAdmin, getMe);

module.exports = router;
