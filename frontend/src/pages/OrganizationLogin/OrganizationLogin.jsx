import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setOrgAuthToken, clearCurrentUser } from '../../utils/storage';
import { authAPI } from '../../utils/api';
import './OrganizationLogin.css';

const OrganizationLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved password when component mounts or email changes
  useEffect(() => {
    const savedPasswords = JSON.parse(localStorage.getItem('bl_saved_org_passwords_v1') || '{}');
    if (formData.email && savedPasswords[formData.email]) {
      setFormData(prev => ({
        ...prev,
        password: savedPasswords[formData.email]
      }));
      setRememberMe(true);
    }
  }, [formData.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      const response = await authAPI.loginOrganization(formData.email, formData.password);
      
      if (response.success && response.token) {
        // Clear any existing user session
        clearCurrentUser();
        
        // Store token and organization data
        setOrgAuthToken(response.token, {
          id: response.organization.id,
          name: response.organization.name,
          email: response.organization.email
        });

        // Save password if "Remember me" is checked
        if (rememberMe) {
          const savedPasswords = JSON.parse(localStorage.getItem('bl_saved_org_passwords_v1') || '{}');
          savedPasswords[formData.email] = formData.password;
          localStorage.setItem('bl_saved_org_passwords_v1', JSON.stringify(savedPasswords));
        } else {
          // Remove saved password if "Remember me" is unchecked
          const savedPasswords = JSON.parse(localStorage.getItem('bl_saved_org_passwords_v1') || '{}');
          delete savedPasswords[formData.email];
          localStorage.setItem('bl_saved_org_passwords_v1', JSON.stringify(savedPasswords));
        }

        setIsLoading(false);
        navigate('/org-dashboard');
      }
    } catch (error) {
      setIsLoading(false);
      // Handle different error types
      if (error.message.includes('Invalid credentials') || error.message.includes('not found')) {
        setErrors(prev => ({ ...prev, email: 'No organization account found with this email' }));
      } else if (error.message.includes('password')) {
        setErrors(prev => ({ ...prev, password: 'Incorrect password' }));
      } else {
        setErrors(prev => ({ ...prev, email: error.message || 'Login failed. Please try again.' }));
      }
    }
  };

  return (
    <div className="org-login-container">
      <div className="org-login-wrapper">
        <div className="org-login-left">
          <div className="org-login-hero">
            <div className="org-login-logo">
              <span className="logo-icon">🏥</span>
              <h1>Blood Life</h1>
            </div>
            <h2>Organization Portal</h2>
            <p>Manage donations, requests, and events from your organization dashboard.</p>
            
            <div className="org-login-features">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <div>
                  <h4>Approve Donations</h4>
                  <p>Review and approve pending donation appointments</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <div>
                  <h4>Manage Requests</h4>
                  <p>Handle blood requests and coordinate with donors</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <div>
                  <h4>Create Events</h4>
                  <p>Organize blood donation drives and track registrations</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <div>
                  <h4>View Analytics</h4>
                  <p>Track donation statistics and organization performance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="org-login-right">
          <div className="org-login-form-container">
            <div className="org-login-header">
              <h2>Sign In</h2>
              <p>Welcome back! Please sign in to your organization account</p>
            </div>

            <form className="org-login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Organization Email *</label>
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
                    placeholder="Enter your password"
                    className={errors.password ? 'error' : ''}
                  />
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-options" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <label className="remember-me" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>

              <p className="signup-link">
                Don't have an organization account?{' '}
                <Link to="/org-signup">Sign up</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationLogin;

