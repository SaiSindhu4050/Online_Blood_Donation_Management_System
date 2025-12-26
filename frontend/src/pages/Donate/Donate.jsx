import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../utils/storage';
import { donationAPI, organizationAPI, authAPI } from '../../utils/api';
import './Donate.css';

const Donate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  const eventId = searchParams.get('event');
  const eventName = searchParams.get('eventName');
  const eventDate = searchParams.get('eventDate');
  const eventEndDate = searchParams.get('eventEndDate');
  const isMultiDay = searchParams.get('isMultiDay') === 'true';
  const isEventRegistration = !!eventId;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    bloodGroup: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    lastDonationDate: '',
    medicalConditions: '',
    availability: '',
    preferredDate: '',
    preferredTime: '',
    selectedEventDate: '',
    selectedOrganization: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [organizations, setOrganizations] = useState([]);

  // Pre-fill form data from logged-in user's saved data and load organizations
  useEffect(() => {
    const loadUserData = async () => {
      const current = getCurrentUser();
      if (current && current.token) {
        try {
          // Get user profile from API
          const userResponse = await authAPI.getMe();
          if (userResponse.success && userResponse.user) {
            const fullUser = userResponse.user;
            
            // Check 56-day cooldown before allowing form access
            if (fullUser.lastDonationAt) {
              const lastDonation = new Date(fullUser.lastDonationAt);
              const now = new Date();
              const daysSince = Math.floor((now - lastDonation) / (1000 * 60 * 60 * 24));
              
              if (daysSince < 56) {
                const daysRemaining = 56 - daysSince;
                setBlocked(true);
                setBlockMessage(`You cannot donate within 56 days of your last donation. You need to wait ${daysRemaining} more ${daysRemaining === 1 ? 'day' : 'days'}.`);
                return; // Don't load form if in cooldown
              }
            }
            
            // Also check donations to get most recent donation date
            try {
              const donationsResponse = await donationAPI.getAllDonations({ userId: fullUser.id });
              if (donationsResponse.success && donationsResponse.donations) {
                const completedDonations = donationsResponse.donations.filter(d => 
                  d.status === 'approved' || d.status === 'scheduled' || d.status === 'completed'
                );
                
                if (completedDonations.length > 0) {
                  const dates = completedDonations
                    .map(d => d.eventDate || d.scheduledDate || d.createdAt || d.updatedAt)
                    .filter(Boolean)
                    .map(date => new Date(date));
                  
                  if (dates.length > 0) {
                    const mostRecent = new Date(Math.max(...dates));
                    const now = new Date();
                    const daysSince = Math.floor((now - mostRecent) / (1000 * 60 * 60 * 24));
                    
                    if (daysSince < 56) {
                      const daysRemaining = 56 - daysSince;
                      setBlocked(true);
                      setBlockMessage(`You cannot donate within 56 days of your last donation. You need to wait ${daysRemaining} more ${daysRemaining === 1 ? 'day' : 'days'}.`);
                      return; // Don't load form if in cooldown
                    }
                  }
                }
              }
            } catch (donationError) {
              console.error('Error checking donations:', donationError);
              // Continue with form load even if donation check fails
            }
            
            setFormData(prev => ({
              ...prev,
              fullName: fullUser.fullName || prev.fullName,
              email: fullUser.email || prev.email,
              phone: fullUser.phone || prev.phone,
              age: fullUser.age ? String(fullUser.age) : prev.age,
              bloodGroup: fullUser.bloodGroup || prev.bloodGroup,
              address: fullUser.address || prev.address,
              city: fullUser.city || prev.city,
              state: fullUser.state || prev.state,
              zipCode: fullUser.zipCode || prev.zipCode
            }));
            
            // Load organizations near user
            const orgsResponse = await organizationAPI.getAllOrganizations(fullUser.city);
            if (orgsResponse.success) {
              setOrganizations(orgsResponse.organizations || []);
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        // Load all organizations if user is not logged in
        try {
          const orgsResponse = await organizationAPI.getAllOrganizations();
          if (orgsResponse.success) {
            setOrganizations(orgsResponse.organizations || []);
          }
        } catch (error) {
          console.error('Error loading organizations:', error);
        }
      }
    };
    
    loadUserData();
  }, []);

  // Generate date options for multi-day events
  const getEventDateOptions = () => {
    if (!isMultiDay || !eventDate || !eventEndDate) return [];
    const dates = [];
    const start = new Date(eventDate);
    const end = new Date(eventEndDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    return dates;
  };

  const eventDateOptions = getEventDateOptions();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // If date changes, clear the time slot
      if (name === 'preferredDate') {
        return {
          ...prev,
          [name]: value,
          preferredTime: '' // Clear time when date changes
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const current = getCurrentUser();

    const donationData = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      age: parseInt(formData.age),
      bloodGroup: formData.bloodGroup,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      lastDonationDate: formData.lastDonationDate || null,
      medicalConditions: formData.medicalConditions || null,
      preferredDate: !isEventRegistration ? formData.preferredDate : null,
      preferredTime: !isEventRegistration ? formData.preferredTime : null,
      selectedOrganization: formData.selectedOrganization || null,
      eventId: isEventRegistration ? parseInt(eventId) : null,
      eventName: isEventRegistration ? eventName : null,
      eventDate: isEventRegistration ? (isMultiDay ? formData.selectedEventDate : eventDate) : null
    };

    try {
      // Create donation via API
      const response = await donationAPI.createDonation(donationData);
      
      if (response.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({
            fullName: '',
            email: '',
            phone: '',
            age: '',
            bloodGroup: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            lastDonationDate: '',
            medicalConditions: '',
            availability: '',
            preferredDate: '',
            preferredTime: '',
            selectedEventDate: '',
            selectedOrganization: ''
          });
          
          // Redirect to login if not logged in, otherwise to dashboard
          if (!current?.token) {
            navigate('/login?type=user');
          } else {
            navigate('/dashboard');
          }
        }, 3000);
      }
    } catch (error) {
      // Handle 56-day cooldown error from backend
      if (error.message.includes('56 days') || error.message.includes('cooldown')) {
        setBlocked(true);
        setBlockMessage(error.message);
      } else {
        alert(error.message || 'Failed to submit donation. Please try again.');
      }
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  if (submitted) {
    return (
      <div className="donate-container">
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h2>Thank You for Your Donation!</h2>
          <p>Your information has been submitted successfully. We'll contact you soon to schedule your donation.</p>
        </div>
      </div>
    );
  }

  const current = getCurrentUser();
  const isLoggedIn = current && current.email;

  // If blocked, show only the cooldown message (prevent form access)
  if (blocked) {
    return (
      <div className="donate-container">
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="modal" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="modal-icon">⏳</div>
            <h3>Donation Cooldown Active</h3>
            <p>{blockMessage}</p>
            <p style={{ marginTop: '15px', fontSize: '0.9rem', color: '#666' }}>
              You can check your cooldown status and donation history on your dashboard.
            </p>
            <button 
              className="modal-btn" 
              onClick={() => navigate('/dashboard')} 
              style={{ marginTop: '20px', width: '100%' }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="donate-container">
      {isLoggedIn && (
        <button 
          className="form-exit-btn" 
          onClick={() => navigate('/dashboard')}
          title="Back to Dashboard"
        >
          ✕
        </button>
      )}
      <div className="donate-hero">
        <h1>{isEventRegistration ? `Register for ${eventName}` : 'Become a Blood Donor'}</h1>
        <p>
          {isEventRegistration 
            ? `Register to donate blood at ${eventName}. ${isMultiDay ? 'Select your preferred date below.' : `Event date: ${new Date(eventDate).toLocaleDateString()}.`}`
            : 'Your donation can save up to three lives. Fill out the form below to register as a donor.'}
        </p>
      </div>

      <div className="donate-content">
        <div className="donate-info">
          <h2>Why Donate?</h2>
          <div className="info-card">
            <h3>💉 Eligibility Requirements</h3>
            <ul>
              <li>Age: 18-65 years</li>
              <li>Weight: Minimum 50 kg</li>
              <li>Good health with no serious illnesses</li>
              <li>No tattoos in the last 6 months</li>
              <li>No recent surgeries</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>📋 What to Expect</h3>
            <ul>
              <li>Quick health screening</li>
              <li>10-15 minute donation process</li>
              <li>Refreshments provided</li>
              <li>Certificate of appreciation</li>
            </ul>
          </div>
        </div>

        <form className="donate-form" onSubmit={handleSubmit}>
          <h2>Donor Registration Form</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>
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
          </div>

          <div className="form-row">
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
            <div className="form-group">
              <label htmlFor="age">Age *</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                required
                min="18"
                max="65"
                placeholder="18-65"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bloodGroup">Blood Group *</label>
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
              <label htmlFor="lastDonationDate">Last Donation Date</label>
              <input
                type="date"
                id="lastDonationDate"
                name="lastDonationDate"
                value={formData.lastDonationDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address *</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
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

          {/* Organization Selection - Only show if NOT an event registration */}
          {!isEventRegistration && organizations.length > 0 && (
            <div className="form-group">
              <label htmlFor="selectedOrganization">Select Organization (Optional)</label>
              <select
                id="selectedOrganization"
                name="selectedOrganization"
                value={formData.selectedOrganization}
                onChange={handleChange}
              >
                <option value="">Select nearest organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.name}>
                    {org.name} - {org.address}, {org.city}, {org.state}
                  </option>
                ))}
              </select>
              <small>Choose the organization where you'd like to donate</small>
            </div>
          )}

          {/* Event Date Selection for Multi-Day Events */}
          {isEventRegistration && isMultiDay && (
            <div className="form-group">
              <label htmlFor="selectedEventDate">Select Event Date *</label>
              <select
                id="selectedEventDate"
                name="selectedEventDate"
                value={formData.selectedEventDate}
                onChange={handleChange}
                required
              >
                <option value="">Select a Date</option>
                {eventDateOptions.map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Availability - Only show if NOT an event registration */}
          {!isEventRegistration && (
            <>
              <div className="form-group">
                <label htmlFor="preferredDate">Preferred Date *</label>
                <input
                  type="date"
                  id="preferredDate"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              {formData.preferredDate && (
                <div className="form-group">
                  <label htmlFor="preferredTime">Preferred Time Slot *</label>
                  <select
                    id="preferredTime"
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Time Slot</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="09:30">9:30 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="12:30">12:30 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="13:30">1:30 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="14:30">2:30 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="15:30">3:30 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="16:30">4:30 PM</option>
                    <option value="17:00">5:00 PM</option>
                    <option value="17:30">5:30 PM</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label htmlFor="medicalConditions">Medical Conditions (if any)</label>
            <textarea
              id="medicalConditions"
              name="medicalConditions"
              value={formData.medicalConditions}
              onChange={handleChange}
              rows="4"
              placeholder="Please mention any medical conditions, medications, or health concerns"
            />
          </div>

          <div className="form-checkbox">
            <input type="checkbox" id="consent" required />
            <label htmlFor="consent">
              I confirm that all information provided is accurate and I meet the eligibility requirements for blood donation.
            </label>
          </div>

          <button type="submit" className="submit-btn">
            <span>Submit Donation Request</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Donate;

