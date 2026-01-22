const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controllers/notification.controller');
const { protect, isUser } = require('../middleware/auth.middleware');

// Get user notifications (protected - user only)
router.get('/', protect, isUser, getNotifications);

// Mark notification as read (protected - user only)
router.put('/:id/read', protect, isUser, markNotificationRead);

// Mark all notifications as read (protected - user only)
router.put('/read-all', protect, isUser, markAllNotificationsRead);

module.exports = router;
