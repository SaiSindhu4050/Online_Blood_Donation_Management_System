import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../utils/storage';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const location = useLocation();
  const currentUser = getCurrentUser();
  const isDashboard = location.pathname === '/dashboard';
  const profileDropdownRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleProfileAction = (action) => {
    setIsProfileDropdownOpen(false);
    setIsMenuOpen(false);
    // Handle different profile actions
    if (action === 'profile') {
      // Navigate to profile page or show profile modal
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'profile' }));
    } else if (action === 'edit') {
      // Navigate to edit profile page or show edit modal
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'edit-profile' }));
    } else if (action === 'settings') {
      // Navigate to settings page or show settings modal
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'settings' }));
    }
  };

  // Only show dashboard/organizations buttons on dashboard page
  if (isDashboard && currentUser) {
    return (
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <span className="logo-icon">🩸</span>
            <span className="logo-text">Blood Life</span>
          </Link>

          <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
            <Link 
              to="/dashboard" 
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={(e) => {
                setIsMenuOpen(false);
                if (isDashboard) {
                  // If already on dashboard, prevent navigation and just switch tab
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: 'dashboard' }));
                } else {
                  // If not on dashboard, navigate and switch tab after navigation
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('switchTab', { detail: 'dashboard' }));
                  }, 100);
                }
              }}
            >
              Dashboard
            </Link>
            <button 
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setIsMenuOpen(false);
                // This will be handled by UserDashboard component to switch tabs
                window.dispatchEvent(new CustomEvent('switchTab', { detail: 'organizations' }));
              }}
            >
              Organizations
            </button>
            <div className="profile-dropdown-container" ref={profileDropdownRef}>
              <button 
                className="profile-button"
                onClick={handleProfileClick}
                aria-label="Profile menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </button>
              {isProfileDropdownOpen && (
                <div className="profile-dropdown">
                  <button 
                    className="profile-dropdown-item"
                    onClick={() => handleProfileAction('profile')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Profile
                  </button>
                  <button 
                    className="profile-dropdown-item"
                    onClick={() => handleProfileAction('edit')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit Profile
                  </button>
                  <button 
                    className="profile-dropdown-item"
                    onClick={() => handleProfileAction('settings')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                    </svg>
                    Settings
                  </button>
                </div>
              )}
            </div>
          </div>

          <button 
            className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🩸</span>
          <span className="logo-text">Blood Life</span>
        </Link>

        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
        </div>

        <button 
          className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

