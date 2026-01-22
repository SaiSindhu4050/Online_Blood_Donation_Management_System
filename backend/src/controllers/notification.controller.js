const { Notification, User, Request } = require('../models');
const { Op } = require('sequelize');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private (User)
exports.getNotifications = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || req.userType !== 'user') {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. Only users can view notifications.' 
      });
    }

    const userId = req.user.id;

    // Get all notifications for the user, ordered by most recent first
    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50 // Limit to last 50 notifications
    });

    // Filter out notifications for deleted requests
    // Get all request IDs referenced by notifications
    const requestRelatedNotifications = notifications.filter(
      n => n.referenceId && (n.type === 'BLOOD_REQUEST' || n.type === 'SHARE_REQUEST')
    );
    
    let validNotifications = notifications;
    
    if (requestRelatedNotifications.length > 0) {
      const requestIds = [...new Set(requestRelatedNotifications.map(n => n.referenceId))];
      
      // Check which requests still exist
      const existingRequests = await Request.findAll({
        where: { id: { [Op.in]: requestIds } },
        attributes: ['id']
      });
      
      const existingRequestIds = new Set(existingRequests.map(r => r.id));
      
      // Filter notifications to only include those with existing requests
      // Also delete notifications for non-existent requests from database
      const notificationsToDelete = [];
      
      validNotifications = notifications.filter(notification => {
        if (notification.referenceId && 
            (notification.type === 'BLOOD_REQUEST' || notification.type === 'SHARE_REQUEST')) {
          const exists = existingRequestIds.has(notification.referenceId);
          if (!exists) {
            // Mark for deletion
            notificationsToDelete.push(notification.id);
          }
          return exists;
        }
        return true; // Keep non-request notifications
      });

      // Delete notifications for deleted requests from database
      if (notificationsToDelete.length > 0) {
        await Notification.destroy({
          where: { id: { [Op.in]: notificationsToDelete } }
        });
      }
    }

    res.json({ 
      success: true, 
      notifications: validNotifications 
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private (User)
exports.markNotificationRead = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || req.userType !== 'user') {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    const notificationId = req.params.id;
    const userId = req.user.id;

    // Find the notification
    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: 'Notification not found' 
      });
    }

    // Verify the notification belongs to the user
    if (notification.userId !== userId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only mark your own notifications as read.' 
      });
    }

    // Update notification
    await notification.update({ isRead: true });

    res.json({ 
      success: true, 
      message: 'Notification marked as read',
      notification 
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private (User)
exports.markAllNotificationsRead = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || req.userType !== 'user') {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    const userId = req.user.id;

    // Update all unread notifications for the user
    const [updatedCount] = await Notification.update(
      { isRead: true },
      { 
        where: { 
          userId,
          isRead: false 
        } 
      }
    );

    res.json({ 
      success: true, 
      message: `${updatedCount} notification(s) marked as read`,
      updatedCount 
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
