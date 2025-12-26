import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { setAuthToken } from '../../utils/storage';
import { authAPI } from '../../utils/api';
import Landing from '../Landing/Landing';
import './Login.css';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const userType = searchParams.get('type');

  // Load saved password when component mounts or email changes
  // This must be called before any early returns (React Hooks rule)
  useEffect(() => {
    // Only load password if we're on the actual login form (not landing page)
    if (location.pathname === '/login/form' && userType === 'user') {
      const savedPasswords = JSON.parse(localStorage.getItem('bl_saved_passwords_v1') || '{}');
      if (formData.email && savedPasswords[formData.email]) {
        setFormData(prev => ({
          ...prev,
          password: savedPasswords[formData.email]
        }));
        setRememberMe(true);
      }
    }
  }, [formData.email, location.pathname, userType]);
  
  // If on /login (not /login/form) or no type selected, show Landing selection
  if (location.pathname === '/login' || !userType) {
    return <Landing mode="login" />;
  }

  // Redirect organizations to their login page
  if (userType === 'organization') {
    navigate('/org-login', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
      const response = await authAPI.loginUser(formData.email, formData.password);
      
      if (response.success && response.token) {
        // Store token and user data
        setAuthToken(response.token, {
          id: response.user.id,
          fullName: response.user.fullName,
          email: response.user.email,
          bloodGroup: response.user.bloodGroup
        });

        // Save password if "Remember me" is checked
        if (rememberMe) {
          const savedPasswords = JSON.parse(localStorage.getItem('bl_saved_passwords_v1') || '{}');
          savedPasswords[formData.email] = formData.password;
          localStorage.setItem('bl_saved_passwords_v1', JSON.stringify(savedPasswords));
        } else {
          // Remove saved password if "Remember me" is unchecked
          const savedPasswords = JSON.parse(localStorage.getItem('bl_saved_passwords_v1') || '{}');
          delete savedPasswords[formData.email];
          localStorage.setItem('bl_saved_passwords_v1', JSON.stringify(savedPasswords));
        }

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
      if (error.message.includes('Invalid credentials') || error.message.includes('not found')) {
        setErrors(prev => ({ ...prev, email: 'No account found with this email' }));
      } else if (error.message.includes('password')) {
        setErrors(prev => ({ ...prev, password: 'Incorrect password' }));
      } else {
        setErrors(prev => ({ ...prev, email: error.message || 'Login failed. Please try again.' }));
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-left">
          <div className="login-hero">
            <div className="login-logo">
              <span className="logo-icon">🩸</span>
              <h1>Blood Life</h1>
            </div>
            <h2>Welcome Back!</h2>
            <p>Sign in to continue saving lives and making a difference in your community.</p>
            
            <div className="login-features">
              <div className="feature-item">
                <span className="feature-icon">💉</span>
                <div>
                  <h4>Track Your Donations</h4>
                  <p>View your donation history and impact</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔔</span>
                <div>
                  <h4>Get Notifications</h4>
                  <p>Receive alerts for blood requests near you</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <div>
                  <h4>Your Dashboard</h4>
                  <p>Manage your profile and preferences</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-container">
            <div className="login-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to access your account</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
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
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15.8333 9.16667V5.83333C15.8333 3.53215 13.9681 1.66667 11.6667 1.66667C9.36548 1.66667 7.5 3.53215 7.5 5.83333V9.16667M11.6667 12.5V14.1667M5.83333 9.16667H17.5C18.4205 9.16667 19.1667 9.91286 19.1667 10.8333V16.6667C19.1667 17.5871 18.4205 18.3333 17.5 18.3333H5.83333C4.91286 18.3333 4.16667 17.5871 4.16667 16.6667V10.8333C4.16667 9.91286 4.91286 9.16667 5.83333 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

              <div className="form-options">
                <label className="remember-me">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="forgot-password">
                  Forgot Password?
                </Link>
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

              <div className="divider">
                <span>OR</span>
              </div>

              <button type="button" className="social-btn google-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M18.1719 8.36719H17.5V8.33334H10V11.6667H14.8453C14.415 13.0975 13.3052 14.1692 11.875 14.6042V16.875H15.2542C17.3833 14.8875 18.75 12.0208 18.75 8.33334C18.75 7.97084 18.7208 7.61667 18.6875 7.27084L18.1719 8.36719Z" fill="#4285F4"/>
                  <path d="M10 18.3333C12.975 18.3333 15.4708 17.2792 17.2542 15.625L13.875 12.7458C12.8 13.4708 11.4042 13.8542 10 13.8542C7.12083 13.8542 4.72083 11.8458 3.82917 9.10417H0.341667V11.4208C2.15833 15.0917 5.77917 18.3333 10 18.3333Z" fill="#34A853"/>
                  <path d="M3.82917 9.10417C3.54583 8.29584 3.3875 7.42917 3.3875 6.54167C3.3875 5.65417 3.54583 4.7875 3.82917 3.97917V1.6625H0.341667C-0.1125 2.625 -0.1125 3.77083 -0.1125 6.54167C-0.1125 9.3125 -0.1125 10.4583 0.341667 11.4208L3.82917 9.10417Z" fill="#FBBC05"/>
                  <path d="M10 3.22917C11.4792 3.22917 12.8042 3.70417 13.85 4.62083L17.3417 1.12917C15.4583 -0.375 12.975 -1.1125 10 -1.1125C5.77917 -1.1125 2.15833 2.12917 0.341667 5.8L3.82917 8.11667C4.72083 5.375 7.12083 3.22917 10 3.22917Z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <p className="signup-link">
                Don't have an account?{' '}
                <Link to="/signup">Sign up for free</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

