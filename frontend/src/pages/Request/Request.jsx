import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../utils/storage';
import { requestAPI, authAPI } from '../../utils/api';
import './Request.css';

const Request = () => {
  const [formData, setFormData] = useState({
    requestType: 'self', // 'self' or 'others'
    patientName: '',
    contactPerson: '',
    email: '',
    phone: '',
    bloodGroup: '',
    donationType: 'Whole Blood',
    unitsRequired: '',
    urgency: '',
    hospitalName: '',
    hospitalAddress: '',
    city: '',
    state: '',
    zipCode: '',
    requiredDate: '',
    patientCondition: '',
    doctorName: '',
    doctorContact: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  // Pre-fill form data when requestType is 'self' and user is logged in
  useEffect(() => {
    const loadUserData = async () => {
      if (formData.requestType === 'self') {
        const current = getCurrentUser();
        if (current && current.token) {
          try {
            // Get user profile from API
            const userResponse = await authAPI.getMe();
            if (userResponse.success && userResponse.user) {
              const fullUser = userResponse.user;
              setFormData(prev => ({
                ...prev,
                patientName: fullUser.fullName || prev.patientName,
                email: fullUser.email || prev.email,
                phone: fullUser.phone || prev.phone,
                bloodGroup: fullUser.bloodGroup || prev.bloodGroup,
                city: fullUser.city || prev.city,
                state: fullUser.state || prev.state
              }));
            }
          } catch (error) {
            console.error('Error loading user data:', error);
          }
        }
      } else {
        // Clear user-specific fields when switching to 'others'
        setFormData(prev => ({
          ...prev,
          patientName: '',
          email: '',
          phone: '',
          bloodGroup: '',
          city: '',
          state: ''
        }));
      }
    };
    
    loadUserData();
  }, [formData.requestType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const current = getCurrentUser();
    
    const requestData = {
      requestType: formData.requestType,
      patientName: formData.patientName,
      contactPerson: formData.contactPerson || null,
      email: formData.email,
      phone: formData.phone,
      bloodGroup: formData.bloodGroup,
      donationType: formData.donationType,
      unitsRequired: parseInt(formData.unitsRequired),
      urgency: formData.urgency,
      requiredDate: formData.requiredDate,
      hospitalName: formData.hospitalName,
      hospitalAddress: formData.hospitalAddress,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      patientCondition: formData.patientCondition || null,
      doctorName: formData.doctorName || null,
      doctorContact: formData.doctorContact || null
    };

    try {
      // Create request via API
      const response = await requestAPI.createRequest(requestData);
      
      if (response.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({
            requestType: 'self',
            patientName: '',
            contactPerson: '',
            email: '',
            phone: '',
            bloodGroup: '',
            donationType: 'Whole Blood',
            unitsRequired: '',
            urgency: '',
            hospitalName: '',
            hospitalAddress: '',
            city: '',
            state: '',
            zipCode: '',
            requiredDate: '',
            patientCondition: '',
            doctorName: '',
            doctorContact: ''
          });
          if (current?.token) {
            navigate('/dashboard');
          }
        }, 3000);
      }
    } catch (error) {
      alert(error.message || 'Failed to submit request. Please try again.');
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  if (submitted) {
    return (
      <div className="request-container">
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h2>Request Submitted Successfully!</h2>
          <p>Your blood request has been received. We'll work to connect you with potential donors as soon as possible.</p>
          <div className="emergency-contact">
            <p><strong>For emergencies, please call:</strong></p>
            <p className="phone-number">📞 1-800-BLOOD-HELP</p>
          </div>
        </div>
      </div>
    );
  }

  const current = getCurrentUser();
  const isLoggedIn = current && current.email;

  return (
    <div className="request-container">
      {isLoggedIn && (
        <button 
          className="form-exit-btn" 
          onClick={() => navigate('/dashboard')}
          title="Back to Dashboard"
        >
          ✕
        </button>
      )}
      <div className="request-hero">
        <h1>Request Blood</h1>
        <p>Need blood? We're here to help connect you with donors. Fill out the form below to submit your request.</p>
      </div>

      <div className="request-content">
        <div className="request-info">
          <h2>Need Help?</h2>
          <div className="info-card emergency">
            <h3>🚨 Emergency?</h3>
            <p>For urgent blood requirements, please call our emergency helpline:</p>
            <p className="phone-number">📞 1-800-BLOOD-HELP</p>
          </div>
          <div className="info-card">
            <h3>⏱️ Response Time</h3>
            <ul>
              <li>Emergency: Within 2 hours</li>
              <li>Urgent: Within 6 hours</li>
              <li>Normal: Within 24 hours</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>💡 How It Works</h3>
            <ul>
              <li>Submit your request</li>
              <li>We match you with donors</li>
              <li>Donors contact you directly</li>
              <li>Schedule donation at hospital</li>
            </ul>
          </div>
        </div>

        <form className="request-form" onSubmit={handleSubmit}>
          <h2>Blood Request Form</h2>

          <div className="form-section">
            <h3>Request Type</h3>
            <div className="form-group">
              <label htmlFor="requestType">Who needs blood? *</label>
              <select
                id="requestType"
                name="requestType"
                value={formData.requestType}
                onChange={handleChange}
                required
              >
                <option value="self">For Myself</option>
                <option value="others">For Someone Else</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Patient Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="patientName">Patient Name *</label>
                <input
                  type="text"
                  id="patientName"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  required
                  placeholder="Enter patient's full name"
                />
              </div>
              {formData.requestType === 'others' && (
                <div className="form-group">
                  <label htmlFor="contactPerson">Contact Person Name *</label>
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    required={formData.requestType === 'others'}
                    placeholder="Your name"
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bloodGroup">Blood Group Required *</label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Blood Group</option>
                  {bloodGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="donationType">Donation Type *</label>
                <select
                  id="donationType"
                  name="donationType"
                  value={formData.donationType}
                  onChange={handleChange}
                  required
                >
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Red Blood Cells">Red Blood Cells</option>
                  <option value="Platelets">Platelets</option>
                  <option value="Double Red Cells">Double Red Cells</option>
                  <option value="Cryo">Cryo (Cryoprecipitate)</option>
                  <option value="White Cells">White Cells</option>
                  <option value="Granulocytes">Granulocytes</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="unitsRequired">Units Required *</label>
                <input
                  type="number"
                  id="unitsRequired"
                  name="unitsRequired"
                  value={formData.unitsRequired}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="Number of units"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="urgency">Urgency Level *</label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleChange}
                required
              >
                <option value="">Select Urgency</option>
                <option value="emergency">Emergency (Within 2 hours)</option>
                <option value="urgent">Urgent (Within 6 hours)</option>
                <option value="normal">Normal (Within 24 hours)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="requiredDate">Required Date *</label>
              <input
                type="date"
                id="requiredDate"
                name="requiredDate"
                value={formData.requiredDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="patientCondition">Patient Condition</label>
              <textarea
                id="patientCondition"
                name="patientCondition"
                value={formData.patientCondition}
                onChange={handleChange}
                rows="4"
                placeholder="Brief description of patient's condition"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Hospital Information</h3>

            <div className="form-group">
              <label htmlFor="hospitalName">Hospital Name *</label>
              <input
                type="text"
                id="hospitalName"
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleChange}
                required
                placeholder="Hospital name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="hospitalAddress">Hospital Address *</label>
              <input
                type="text"
                id="hospitalAddress"
                name="hospitalAddress"
                value={formData.hospitalAddress}
                onChange={handleChange}
                required
                placeholder="Street address"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  placeholder="City"
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">State *</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  placeholder="State"
                />
              </div>
              <div className="form-group">
                <label htmlFor="zipCode">Zip Code *</label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  required
                  placeholder="Zip Code"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Doctor Information (Optional)</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="doctorName">Doctor Name</label>
                <input
                  type="text"
                  id="doctorName"
                  name="doctorName"
                  value={formData.doctorName}
                  onChange={handleChange}
                  placeholder="Doctor's name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="doctorContact">Doctor Contact</label>
                <input
                  type="tel"
                  id="doctorContact"
                  name="doctorContact"
                  value={formData.doctorContact}
                  onChange={handleChange}
                  placeholder="Doctor's contact"
                />
              </div>
            </div>
          </div>

          <div className="form-checkbox">
            <input type="checkbox" id="consent" required />
            <label htmlFor="consent">
              I confirm that all information provided is accurate and I understand that this is a request for blood donation assistance.
            </label>
          </div>

          <button type="submit" className="submit-btn">
            <span>Submit Blood Request</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Request;

