import React, { useState, useEffect, useMemo } from 'react';
import { notificationAPI, requestAPI } from '../../utils/api';
import ShareCard from '../ShareCard/ShareCard';
import './NotificationList.css';

const NotificationList = ({
  onNotificationUpdate,
  mode = 'banner', // 'banner' (show recent) | 'full' (show all)
  maxAgeHours = 24,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState(new Set());
  const [showShareCard, setShowShareCard] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await notificationAPI.getNotifications();
      if (response.success && response.notifications) {
        // Backend should already filter out notifications for deleted requests
        // But we'll do a quick validation here as a safeguard
        setNotifications(response.notifications);
        if (onUnreadCountChange) {
          const unreadCount = (response.notifications || []).filter(n => !n.isRead).length;
          onUnreadCountChange(unreadCount);
        }
      } else if (Array.isArray(response)) {
        // Handle case where API returns array directly
        setNotifications(response);
        if (onUnreadCountChange) {
          const unreadCount = (response || []).filter(n => !n.isRead).length;
          onUnreadCountChange(unreadCount);
        }
      } else {
        setNotifications([]);
        if (onUnreadCountChange) {
          onUnreadCountChange(0);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      setNotifications([]);
      if (onUnreadCountChange) {
        onUnreadCountChange(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Poll for notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle Accept button click
  const handleAccept = async (notification) => {
    if (!notification.referenceId) {
      setError('Invalid notification: missing request ID');
      return;
    }

    const requestId = notification.referenceId;
    
    // Prevent duplicate clicks
    if (processingIds.has(notification.id)) {
      return;
    }

    setProcessingIds(prev => new Set(prev).add(notification.id));

    try {
      // First verify the request still exists
      const requestCheck = await requestAPI.getRequest(requestId);
      if (!requestCheck.success || !requestCheck.request) {
        showToast('This request has been deleted or is no longer available.', 'error');
        // Remove the notification from the list
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        return;
      }

      const response = await notificationAPI.respondToRequest(requestId, 'ACCEPTED');
      
      if (response.success) {
        // Mark notification as read
        try {
          await notificationAPI.markNotificationRead(notification.id);
        } catch (err) {
          console.error('Error marking notification as read:', err);
        }

        // Show success message
        showToast(response.message || 'Request accepted successfully!', 'success');
        
        // Refresh notifications
        await fetchNotifications();
        
        // Notify parent component
        if (onNotificationUpdate) {
          onNotificationUpdate();
        }
      } else {
        throw new Error(response.message || 'Failed to accept request');
      }
    } catch (err) {
      console.error('Error accepting request:', err);
      const errorMessage = err.message || 'Failed to accept request. It may already be fulfilled.';
      showToast(errorMessage, 'error');
      
      // Refresh notifications to get updated status
      await fetchNotifications();
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  // Handle Decline button click
  const handleDecline = async (notification) => {
    if (!notification.referenceId) {
      setError('Invalid notification: missing request ID');
      return;
    }

    const requestId = notification.referenceId;
    
    // Prevent duplicate clicks
    if (processingIds.has(notification.id)) {
      return;
    }

    setProcessingIds(prev => new Set(prev).add(notification.id));

    try {
      const response = await notificationAPI.respondToRequest(requestId, 'REJECTED');
      
      if (response.success) {
        // Mark notification as read
        try {
          await notificationAPI.markNotificationRead(notification.id);
        } catch (err) {
          console.error('Error marking notification as read:', err);
        }

        showToast('Response recorded. Thank you for your consideration.', 'success');
        
        // Refresh notifications
        await fetchNotifications();
      } else {
        throw new Error(response.message || 'Failed to decline request');
      }
    } catch (err) {
      console.error('Error declining request:', err);
      showToast(err.message || 'Failed to decline request', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  // Simple toast notification function
  const showToast = (message, type = 'info') => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-toast-${type}`;
    toast.textContent = message;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 5000);
  };

  // Handle Share button click
  const handleShare = (notification) => {
    setSelectedNotification(notification);
    setShowShareCard(true);
  };

  const displayedNotifications = useMemo(() => {
    const sorted = [...(notifications || [])].filter(n => n && n.id).sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    if (mode === 'full') {
      return sorted;
    }

    const maxAgeMs = (maxAgeHours || 24) * 60 * 60 * 1000;
    const now = Date.now();
    return sorted.filter(n => {
      const t = new Date(n.createdAt || 0).getTime();
      return t && (now - t <= maxAgeMs);
    });
  }, [notifications, mode, maxAgeHours]);

  if (loading && notifications.length === 0) {
    return (
      <div className="notification-list-container">
        <div className="notification-list-loading">Loading notifications...</div>
      </div>
    );
  }

  if (displayedNotifications.length === 0 && !loading) {
    // Banner should disappear if nothing recent; full view should show empty state
    if (mode !== 'full') return null;
    return (
      <div className="notification-list-container">
        <div className="notification-list-header">
          <h3>Notifications</h3>
        </div>
        <div className="notification-list-loading">You have no notifications.</div>
      </div>
    );
  }

  return (
    <div className="notification-list-container">
      <div className="notification-list-header">
        <h3>{mode === 'full' ? 'Notifications' : 'Notifications (last 24 hours)'}</h3>
        {displayedNotifications.length > 0 && (
          <span className="notification-badge">{displayedNotifications.length}</span>
        )}
      </div>

      {error && (
        <div className="notification-error">{error}</div>
      )}

      <div className="notification-list">
        {displayedNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
          >
            <div className="notification-content">
              {notification.title && (
                <h4 className="notification-title">{notification.title}</h4>
              )}
              <p className="notification-message">{notification.message}</p>
              <span className="notification-time">
                {new Date(notification.createdAt).toLocaleString()}
              </span>
            </div>

            {notification.type === 'BLOOD_REQUEST' && notification.isSameLocation && (
              <div className="notification-actions">
                <button
                  className="btn-accept"
                  onClick={() => handleAccept(notification)}
                  disabled={processingIds.has(notification.id)}
                >
                  {processingIds.has(notification.id) ? 'Processing...' : 'Accept'}
                </button>
                <button
                  className="btn-decline"
                  onClick={() => handleDecline(notification)}
                  disabled={processingIds.has(notification.id)}
                >
                  {processingIds.has(notification.id) ? 'Processing...' : 'Decline'}
                </button>
              </div>
            )}

            {notification.type === 'SHARE_REQUEST' && (
              <div className="notification-actions">
                <button
                  className="btn-share-notification"
                  onClick={() => handleShare(notification)}
                >
                  {notification.isCompatible && !notification.isSameLocation
                    ? `📢 Share with ${notification.message.match(/in ([^,]+)/)?.[1] || 'contacts'}`
                    : '📢 Share Request'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showShareCard && selectedNotification && (
        <ShareCard
          notification={selectedNotification}
          onClose={() => {
            setShowShareCard(false);
            setSelectedNotification(null);
            // Mark notification as read after viewing share card
            if (selectedNotification.id) {
              notificationAPI.markNotificationRead(selectedNotification.id).catch(err => {
                console.error('Error marking notification as read:', err);
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default NotificationList;
