import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { setAuthToken } from '../../utils/storage';
import { authAPI } from '../../utils/api';
import Landing from '../Landing/Landing';
import './Signup.css';

const Signup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    password: '',
    confirmPassword: '',
    bloodGroup: '',
    acceptTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const userType = searchParams.get('type');
  
  // If on /signup (not /signup/form) or no type selected, show Landing selection
  if (location.pathname === '/signup' || !userType) {
    return <Landing mode="signup" />;
  }

  // Redirect organizations to their signup page
  if (userType === 'organization') {
    navigate('/org-signup', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      
      if (actualAge < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old to donate blood';
      } else if (actualAge > 65) {
        newErrors.dateOfBirth = 'You must be 65 years or younger to donate blood';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.address) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    if (!formData.state) {
      newErrors.state = 'State is required';
    }

    if (!formData.zipCode) {
      newErrors.zipCode = 'Zip code is required';
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

    if (!formData.bloodGroup) {
      newErrors.bloodGroup = 'Blood group is required';
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
      // Prepare user data for API
      const userData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        bloodGroup: formData.bloodGroup,
        password: formData.password
      };

      // Register user via API
      const response = await authAPI.registerUser(userData);

      if (response.success && response.token) {
        // Store token and user data
        setAuthToken(response.token, {
          id: response.user.id,
          fullName: response.user.fullName,
          email: response.user.email,
          bloodGroup: response.user.bloodGroup
        });

        setIsLoading(false);
        // Check if user type is user, redirect to dashboard
        const searchParams = new URLSearchParams(location.search);
        const userType = searchParams.get('type');
        if (userType === 'user') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      setIsLoading(false);
      // Handle different error types
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        setErrors(prev => ({ ...prev, email: 'An account with this email already exists' }));
      } else if (error.message.includes('Age must be')) {
        setErrors(prev => ({ ...prev, dateOfBirth: error.message }));
      } else {
        setErrors(prev => ({ ...prev, email: error.message || 'Registration failed. Please try again.' }));
      }
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        <div className="signup-left">
          <div className="signup-hero">
            <div className="signup-logo">
              <span className="logo-icon">🩸</span>
              <h1>Blood Life</h1>
            </div>
            <h2>Join Our Mission</h2>
            <p>Create an account to become part of a community that saves lives every day.</p>
            
            <div className="signup-benefits">
              <div className="benefit-item">
                <div className="benefit-icon">✓</div>
                <span>Access to donation dashboard</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">✓</div>
                <span>Get matched with blood requests</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">✓</div>
                <span>Track your impact and donations</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">✓</div>
                <span>Receive important notifications</span>
              </div>
            </div>
          </div>
        </div>

        <div className="signup-right">
          <div className="signup-form-container">
            <div className="signup-header">
              <h2>Create Account</h2>
              <p>Fill in your details to get started</p>
            </div>

            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 12.5C5.58172 12.5 2 13.6196 2 15C2 16.3804 5.58172 17.5 10 17.5C14.4183 17.5 18 16.3804 18 15C18 13.6196 14.4183 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={errors.fullName ? 'error' : ''}
                  />
                </div>
                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
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
                      placeholder="your.email@example.com"
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M15.8333 3.33333H4.16667C3.24619 3.33333 2.5 4.07952 2.5 4.99999V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7528 18.3333 17.5 17.5871 17.5 16.6667V4.99999C17.5 4.07952 16.7528 3.33333 15.8333 3.33333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.3333 1.66667V5M6.66667 1.66667V5M2.5 8.33333H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      min={new Date(new Date().setFullYear(new Date().getFullYear() - 65)).toISOString().split('T')[0]}
                      className={errors.dateOfBirth ? 'error' : ''}
                    />
                  </div>
                  {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Gender *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M10 12.5C5.58172 12.5 2 13.6196 2 15C2 16.3804 5.58172 17.5 10 17.5C14.4183 17.5 18 16.3804 18 15C18 13.6196 14.4183 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={errors.gender ? 'error' : ''}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                  {errors.gender && <span className="error-message">{errors.gender}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18.3333C10 18.3333 15 13.8889 15 9.16667C15 5.65143 12.3137 2.91667 10 2.91667C7.68629 2.91667 5 5.65143 5 9.16667C5 13.8889 10 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 11.6667C11.3807 11.6667 12.5 10.5474 12.5 9.16667C12.5 7.78595 11.3807 6.66667 10 6.66667C8.61929 6.66667 7.5 7.78595 7.5 9.16667C7.5 10.5474 8.61929 11.6667 10 11.6667Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Street address"
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

                <div className="form-group">
                  <label htmlFor="zipCode">Zip Code *</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 18.3333C10 18.3333 15 13.8889 15 9.16667C15 5.65143 12.3137 2.91667 10 2.91667C7.68629 2.91667 5 5.65143 5 9.16667C5 13.8889 10 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      placeholder="12345"
                      className={errors.zipCode ? 'error' : ''}
                    />
                  </div>
                  {errors.zipCode && <span className="error-message">{errors.zipCode}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bloodGroup">Blood Group *</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 6.66666V13.3333M6.66667 10H13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <select
                    id="bloodGroup"
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className={errors.bloodGroup ? 'error' : ''}
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
                {errors.bloodGroup && <span className="error-message">{errors.bloodGroup}</span>}
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

              <div className="divider">
                <span>OR</span>
              </div>

              

              <p className="login-link">
                Already have an account?{' '}
                <Link to="/login">Sign in</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

