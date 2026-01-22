import React, { useState, useEffect } from 'react';
import { requestAPI, userAPI } from '../../utils/api';
import './ShareCard.css';

const ShareCard = ({ notification, onClose }) => {
  const [request, setRequest] = useState(null);
  const [userBloodGroup, setUserBloodGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!notification.referenceId) {
        setError('Invalid request ID');
        setLoading(false);
        return;
      }

      try {
        // Fetch request details
        const requestResponse = await requestAPI.getRequest(notification.referenceId);
        if (requestResponse.success && requestResponse.request) {
          setRequest(requestResponse.request);
        } else {
          setError('This request has been deleted or is no longer available.');
        }

        // Fetch user profile to get blood group (for compatible users)
        if (notification.isCompatible) {
          try {
            const userResponse = await userAPI.getProfile();
            if (userResponse.success && userResponse.user) {
              setUserBloodGroup(userResponse.user.bloodGroup);
            }
          } catch (err) {
            console.warn('Could not fetch user profile:', err);
            // Extract from message as fallback
            const match = notification.message.match(/You have ([A-Z][+-]?) blood/);
            if (match) {
              setUserBloodGroup(match[1]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching request:', err);
        setError('Failed to load request details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [notification.referenceId, notification.isCompatible, notification.message]);

  // Generate share text
  const generateShareText = () => {
    if (!request) return '';

    const hospitalName = request.hospitalName || 'Hospital';
    const patientName = request.patientName || 'Emergency Patient';
    const bloodGroup = request.bloodGroup || '';
    const city = request.city || '';
    const state = request.state || '';
    // Use hospital/doctor contact phone ONLY (NOT user's personal phone)
    // doctorContact is the hospital/doctor contact number
    // phone is the user's personal number - we don't want to show that in share cards
    const phone = request.doctorContact || '';
    const shareLink = `${window.location.origin}/share/request/${request.id}`;

    let message = `🩸 URGENT: Blood Life needs ${bloodGroup} Blood\n\n`;
    message += `📍 Location: ${hospitalName}, ${city}${state ? `, ${state}` : ''}\n`;
    message += `👤 Patient: ${patientName}\n`;
    if (phone) {
      message += `📞 Contact: ${phone}\n`;
    }
    
    if (notification.isCompatible && !notification.isSameLocation) {
      message += `\n💡 You have ${userBloodGroup || 'compatible'} blood! Know someone in ${city} who can help?\n`;
    } else {
      message += `\n💡 Help us find ${bloodGroup} donors!\n`;
    }
    
    message += `\n🔗 Click here to help: ${shareLink}`;

    return message;
  };

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank');
  };

  // Share via SMS
  const handleShareSMS = () => {
    const text = encodeURIComponent(generateShareText());
    const smsUrl = `sms:?body=${text}`;
    window.location.href = smsUrl;
  };

  // Copy to clipboard
  const handleCopyLink = async () => {
    const shareLink = `${window.location.origin}/share/request/${request?.id || notification.referenceId}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Copy full message
  const handleCopyMessage = async () => {
    const text = generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="share-card-overlay">
        <div className="share-card">
          <div className="share-card-loading">Loading request details...</div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="share-card-overlay">
        <div className="share-card">
          <div className="share-card-error">
            <p>{error || 'Request not found'}</p>
            <button onClick={onClose} className="btn-close">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="share-card-overlay" onClick={onClose}>
      <div className="share-card" onClick={(e) => e.stopPropagation()}>
        <div className="share-card-header">
          <h3>{notification.title || 'Share Request'}</h3>
          <button className="btn-close-icon" onClick={onClose}>×</button>
        </div>

        <div className="share-card-content">
          <div className="share-card-info">
            <div className="info-item">
              <span className="info-label">🩸 Blood Group Needed:</span>
              <span className="info-value">{request.bloodGroup}</span>
            </div>
            <div className="info-item">
              <span className="info-label">📍 Location:</span>
              <span className="info-value">
                {request.hospitalName || 'Hospital'}, {request.city}
                {request.state ? `, ${request.state}` : ''}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">👤 Patient:</span>
              <span className="info-value">{request.patientName || 'Emergency Patient'}</span>
            </div>
            {request.doctorContact && (
              <div className="info-item">
                <span className="info-label">📞 Hospital Contact:</span>
                <span className="info-value">{request.doctorContact}</span>
              </div>
            )}
            {request.urgency === 'URGENT' && (
              <div className="info-item urgent-badge">
                <span className="info-label">⚡ Urgency:</span>
                <span className="info-value urgent">URGENT</span>
              </div>
            )}
          </div>

          <div className="share-card-message">
            <p className="message-preview">{generateShareText()}</p>
          </div>

          <div className="share-card-actions">
            <button 
              className="btn-share btn-whatsapp"
              onClick={handleShareWhatsApp}
            >
              📱 Share on WhatsApp
            </button>
            <button 
              className="btn-share btn-sms"
              onClick={handleShareSMS}
            >
              💬 Share via SMS
            </button>
            <button 
              className="btn-share btn-copy"
              onClick={handleCopyMessage}
            >
              {copied ? '✓ Copied!' : '📋 Copy Message'}
            </button>
            <button 
              className="btn-share btn-link"
              onClick={handleCopyLink}
            >
              {copied ? '✓ Link Copied!' : '🔗 Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
