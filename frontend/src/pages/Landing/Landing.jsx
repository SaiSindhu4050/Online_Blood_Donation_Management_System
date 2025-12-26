import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Landing.css';

const Landing = ({ mode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine mode from URL path if not provided as prop
  const currentMode = mode || (location.pathname.includes('/signup') ? 'signup' : 'login');

  const handleChooseUser = () => {
    if (currentMode === 'signup') {
      navigate('/signup/form?type=user');
    } else {
      navigate('/login/form?type=user');
    }
  };

  const handleChooseOrganization = () => {
    if (currentMode === 'signup') {
      navigate('/org-signup');
    } else {
      navigate('/org-login');
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        <div className="landing-header">
          <span className="logo-icon">🩸</span>
          <h1>{currentMode === 'signup' ? 'Create Account' : 'Sign In'}</h1>
          <p>Please select your account type</p>
        </div>
        <div className="landing-options">
          <button className="landing-btn user" onClick={handleChooseUser}>
            <span className="emoji">👤</span>
            <div className="content">
              <span className="title">User</span>
              <span className="desc">Donate or request blood</span>
            </div>
          </button>
          <button className="landing-btn org" onClick={handleChooseOrganization}>
            <span className="emoji">🏥</span>
            <div className="content">
              <span className="title">Organization</span>
              <span className="desc">Manage blood drives and requests</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;


