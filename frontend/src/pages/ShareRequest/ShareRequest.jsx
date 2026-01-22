import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { requestAPI } from '../../utils/api';
import './ShareRequest.css';

const ShareRequest = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) {
        setError('Invalid request ID');
        setLoading(false);
        return;
      }

      try {
        const response = await requestAPI.getRequest(id);
        if (response.success && response.request) {
          setRequest(response.request);
        } else {
          setError('Request not found');
        }
      } catch (err) {
        console.error('Error fetching request:', err);
        setError('Failed to load request details');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🩸 URGENT: Blood Life needs ${request.bloodGroup} Blood\n\n` +
      `📍 Location: ${request.hospitalName}, ${request.city}${request.state ? `, ${request.state}` : ''}\n` +
      `👤 Patient: ${request.patientName || 'Emergency Patient'}\n` +
      (request.phone ? `📞 Contact: ${request.phone}\n` : '') +
      `\n💡 Help us find ${request.bloodGroup} donors!\n` +
      `\n🔗 ${window.location.href}`
    );
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareSMS = () => {
    const text = encodeURIComponent(
      `🩸 URGENT: Blood Life needs ${request.bloodGroup} Blood\n\n` +
      `📍 Location: ${request.hospitalName}, ${request.city}${request.state ? `, ${request.state}` : ''}\n` +
      `👤 Patient: ${request.patientName || 'Emergency Patient'}\n` +
      (request.phone ? `📞 Contact: ${request.phone}\n` : '') +
      `\n💡 Help us find ${request.bloodGroup} donors!\n` +
      `\n🔗 ${window.location.href}`
    );
    const smsUrl = `sms:?body=${text}`;
    window.location.href = smsUrl;
  };

  if (loading) {
    return (
      <div className="share-request-page">
        <div className="share-request-container">
          <div className="loading">Loading request details...</div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="share-request-page">
        <div className="share-request-container">
          <div className="error">
            <h2>Request Not Found</h2>
            <p>{error || 'The requested blood donation request could not be found.'}</p>
            <a href="/" className="btn-home">Go to Home</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="share-request-page">
      <div className="share-request-container">
        <div className="share-request-header">
          <h1>🩸 Urgent Blood Request</h1>
          <p className="subtitle">Your help can save a life</p>
        </div>

        <div className="request-details-card">
          <div className="detail-section">
            <h2>Blood Group Needed</h2>
            <div className="blood-group-badge">{request.bloodGroup}</div>
          </div>

          <div className="detail-section">
            <h3>📍 Location</h3>
            <p>{request.hospitalName}</p>
            <p>{request.hospitalAddress}</p>
            <p>{request.city}{request.state ? `, ${request.state}` : ''} {request.zipCode}</p>
          </div>

          <div className="detail-section">
            <h3>👤 Patient Information</h3>
            <p><strong>Name:</strong> {request.patientName || 'Emergency Patient'}</p>
            {request.contactPerson && (
              <p><strong>Contact Person:</strong> {request.contactPerson}</p>
            )}
          </div>

          <div className="detail-section">
            <h3>📞 Contact Information</h3>
            {request.phone && (
              <p><strong>Phone:</strong> <a href={`tel:${request.phone}`}>{request.phone}</a></p>
            )}
            {request.email && (
              <p><strong>Email:</strong> <a href={`mailto:${request.email}`}>{request.email}</a></p>
            )}
          </div>

          {(request.urgency === 'URGENT' || request.urgency === 'emergency') && (
            <div className="urgency-badge">
              <span>⚡ URGENT</span>
            </div>
          )}

          {request.requiredDate && (
            <div className="detail-section">
              <h3>📅 Required Date</h3>
              <p>{new Date(request.requiredDate).toLocaleDateString()}</p>
            </div>
          )}

          {request.unitsRequired && (
            <div className="detail-section">
              <h3>💉 Units Required</h3>
              <p>{request.unitsRequired} unit{request.unitsRequired > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        <div className="share-actions">
          <h3>Share this request</h3>
          <div className="action-buttons">
            <button className="btn-share btn-whatsapp" onClick={handleShareWhatsApp}>
              📱 Share on WhatsApp
            </button>
            <button className="btn-share btn-sms" onClick={handleShareSMS}>
              💬 Share via SMS
            </button>
          </div>
        </div>

        <div className="help-section">
          <h3>How to Help</h3>
          <ul>
            <li>If you have {request.bloodGroup} blood and are eligible to donate, contact the organization directly.</li>
            <li>Share this request with friends and family who might be able to help.</li>
            <li>Even if you can't donate, sharing helps spread the word and find potential donors.</li>
          </ul>
        </div>

        <div className="footer-actions">
          <a href="/" className="btn-home">Visit Blood Life</a>
          <a href="/signup" className="btn-signup">Sign Up to Help</a>
        </div>
      </div>
    </div>
  );
};

export default ShareRequest;
