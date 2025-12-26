import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setOrgAuthToken, clearCurrentUser } from '../../utils/storage';
import { authAPI } from '../../utils/api';
import './OrganizationSignup.css';

const OrganizationSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    specialty: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    if (!formData.state) {
      newErrors.state = 'State is required';
    }

    if (!formData.address) {
      newErrors.address = 'Address is required';
    }

    if (!formData.specialty) {
      newErrors.specialty = 'Specialty is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Prepare organization data for API
      const orgData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode || '',
        password: formData.password,
        description: formData.specialty || ''
      };

      // Register organization via API
      const response = await authAPI.registerOrganization(orgData);

      if (response.success && response.token) {
        // Clear any existing user session
        clearCurrentUser();
        
        // Store token and organization data
        setOrgAuthToken(response.token, {
          id: response.organization.id,
          name: response.organization.name,
          email: response.organization.email
        });

        setIsLoading(false);
        navigate('/org-dashboard');
      }
    } catch (error) {
      setIsLoading(false);
      // Handle different error types
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        setErrors(prev => ({ ...prev, email: 'An organization account with this email already exists' }));
      } else {
        setErrors(prev => ({ ...prev, email: error.message || 'Registration failed. Please try again.' }));
      }
    }
  };

  const specialties = [
    'Blood Collection & Storage',
    'Emergency Blood Supply',
    'Transfusion Services',
    'Blood Bank Services',
    'Community Health Center',
    'Hospital Blood Services',
    'Red Cross Chapter',
    'Other'
  ];

  return (
    <div className="org-signup-container">
      <div className="org-signup-wrapper">
        <div className="org-signup-left">
          <div className="org-signup-hero">
            <div className="org-signup-logo">
              <span className="logo-icon">🏥</span>
              <h1>Blood Life</h1>
            </div>
            <h2>Join as Organization</h2>
            <p>Register your organization to manage donations, requests, and organize events.</p>
            
            <div className="org-signup-benefits">
              <div className="benefit-item">
                <div className="benefit-icon">✓</div>
                <span>Manage donation appointments</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">✓</div>
                <span>Process blood requests</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">✓</div>
                <span>Create and manage events</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">✓</div>
                <span>Track donation statistics</span>
              </div>
            </div>
          </div>
        </div>

        <div className="org-signup-right">
          <div className="org-signup-form-container">
            <div className="org-signup-header">
              <h2>Create Organization Account</h2>
              <p>Fill in your organization details to get started</p>
            </div>

            <form className="org-signup-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Organization Name *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 12.5C5.58172 12.5 2 13.6196 2 15C2 16.3804 5.58172 17.5 10 17.5C14.4183 17.5 18 16.3804 18 15C18 13.6196 14.4183 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="City Blood Bank"
                    className={errors.name ? 'error' : ''}
                  />
                </div>
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2.5 6.66667L10 11.6667L17.5 6.66667M3.33333 15H16.6667C17.5871 15 18.3333 14.2538 18.3333 13.3333V6.66667C18.3333 5.74619 17.5871 5 16.6667 5H3.33333C2.41286 5 1.66667 5.74619 1.66667 6.66667V13.3333C1.66667 14.2538 2.41286 15 3.33333 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="org@example.com"
                      className={errors.email ? 'error' : ''}
                    />
                  </div>
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M15.8333 14.1667V16.6667C15.8333 17.5871 15.0871 18.3333 14.1667 18.3333H5.83333C4.91286 18.3333 4.16667 17.5871 4.16667 16.6667V3.33333C4.16667 2.41286 4.91286 1.66667 5.83333 1.66667H8.33333M15.8333 7.5H12.5M15.8333 10.8333H12.5M11.6667 1.66667H17.5C18.4205 1.66667 19.1667 2.41286 19.1667 3.33333V9.16667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className={errors.phone ? 'error' : ''}
                    />
                  </div>
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 18.3333C13.3333 15 16.6667 12.0152 16.6667 8.33333C16.6667 4.65143 13.6819 1.66667 10 1.66667C6.3181 1.66667 3.33333 4.65143 3.33333 8.33333C3.33333 12.0152 6.66667 15 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main Street"
                    className={errors.address ? 'error' : ''}
                  />
                </div>
                {errors.address && <span className="error-message">{errors.address}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 18.3333C10 18.3333 15 13.8889 15 9.16667C15 5.65143 12.3137 2.91667 10 2.91667C7.68629 2.91667 5 5.65143 5 9.16667C5 13.8889 10 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M10 11.6667C11.3807 11.6667 12.5 10.5474 12.5 9.16667C12.5 7.78595 11.3807 6.66667 10 6.66667C8.61929 6.66667 7.5 7.78595 7.5 9.16667C7.5 10.5474 8.61929 11.6667 10 11.6667Z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="New York"
                      className={errors.city ? 'error' : ''}
                    />
                  </div>
                  {errors.city && <span className="error-message">{errors.city}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="state">State *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 18.3333C10 18.3333 15 13.8889 15 9.16667C15 5.65143 12.3137 2.91667 10 2.91667C7.68629 2.91667 5 5.65143 5 9.16667C5 13.8889 10 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="New York"
                      className={errors.state ? 'error' : ''}
                    />
                  </div>
                  {errors.state && <span className="error-message">{errors.state}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="specialty">Specialty *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <select
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    className={errors.specialty ? 'error' : ''}
                  >
                    <option value="">Select Specialty</option>
                    {specialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>
                {errors.specialty && <span className="error-message">{errors.specialty}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M15.8333 9.16667V5.83333C15.8333 3.53215 13.9681 1.66667 11.6667 1.66667C9.36548 1.66667 7.5 3.53215 7.5 5.83333V9.16667M5.83333 9.16667H17.5C18.4205 9.16667 19.1667 9.91286 19.1667 10.8333V16.6667C19.1667 17.5871 18.4205 18.3333 17.5 18.3333H5.83333C4.91286 18.3333 4.16667 17.5871 4.16667 16.6667V10.8333C4.16667 9.91286 4.91286 9.16667 5.83333 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      className={errors.password ? 'error' : ''}
                    />
                  </div>
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M15.8333 9.16667V5.83333C15.8333 3.53215 13.9681 1.66667 11.6667 1.66667C9.36548 1.66667 7.5 3.53215 7.5 5.83333V9.16667M5.83333 9.16667H17.5C18.4205 9.16667 19.1667 9.91286 19.1667 10.8333V16.6667C19.1667 17.5871 18.4205 18.3333 17.5 18.3333H5.83333C4.91286 18.3333 4.16667 17.5871 4.16667 16.6667V10.8333C4.16667 9.91286 4.91286 9.16667 5.83333 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className={errors.confirmPassword ? 'error' : ''}
                    />
                  </div>
                  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className={errors.acceptTerms ? 'error' : ''}
                />
                <label htmlFor="acceptTerms">
                  I agree to the <Link to="/terms">Terms and Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>
                </label>
              </div>
              {errors.acceptTerms && <span className="error-message">{errors.acceptTerms}</span>}

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>

              <p className="login-link">
                Already have an account?{' '}
                <Link to="/org-login">Sign in</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSignup;

