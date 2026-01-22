import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { eventAPI, testimonialAPI } from '../../utils/api';
import { clearCurrentUser, clearCurrentOrganization } from '../../utils/storage';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [showLearnMore, setShowLearnMore] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = () => {
    const user = JSON.parse(localStorage.getItem('bl_current_user_v1') || 'null');
    const org = JSON.parse(localStorage.getItem('bl_current_org_v1') || 'null');
    return !!(user?.token || org?.token);
  };

  useEffect(() => {
    loadEvents();
    loadTestimonials();
    // Refresh events every 30 seconds to catch new ones
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTestimonials = async () => {
    try {
      setLoadingTestimonials(true);
      const response = await testimonialAPI.getPublicTestimonials(6, false);
      if (response.success) {
        setTestimonials(response.testimonials || []);
      }
    } catch (error) {
      console.error('Error loading testimonials:', error);
      // Fallback to empty array if API fails
      setTestimonials([]);
    } finally {
      setLoadingTestimonials(false);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call API to get all upcoming events from all organizations
      // No authentication required - public endpoint
      const response = await eventAPI.getAllEvents({ status: 'upcoming' });
      
      if (response.success && response.events) {
        const now = new Date();
        
        // Filter only upcoming events (date >= today) and not cancelled
        const upcomingEvents = response.events
          .filter(event => {
            // Skip cancelled events
            if (event.status === 'cancelled') return false;
            
            const eventDate = new Date(event.eventDate || event.date);
            eventDate.setHours(0, 0, 0, 0);
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            return eventDate >= today;
          })
          .sort((a, b) => new Date(a.eventDate || a.date) - new Date(b.eventDate || b.date))
          .slice(0, 6); // Limit to 6 most upcoming events
        
        setEvents(upcomingEvents);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events. Please try again later.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventBadge = (eventDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    const diffTime = event - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Today';
    if (diffDays <= 7) return 'This Week';
    if (diffDays <= 14) return 'Next Week';
    if (diffDays <= 30) return 'This Month';
    return 'Upcoming';
  };

  const formatEventDate = (dateString, startTime, endTime) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    return `${formattedDate}${startTime && endTime ? `, ${startTime} - ${endTime}` : ''}`;
  };

  const handleRegisterClick = (event, e) => {
    e.preventDefault();
    
    // Always logout if user is logged in (either user or organization)
    if (isAuthenticated()) {
      clearCurrentUser();
      clearCurrentOrganization();
    }
    
    // Always redirect to login with event parameters preserved
    const eventDate = event.eventDate || event.date;
    const params = new URLSearchParams({
      event: event.id,
      eventName: event.name,
      eventDate: eventDate,
      eventEndDate: event.eventEndDate || '',
      isMultiDay: event.isMultiDay ? 'true' : 'false',
      redirect: '/donate' // Tell login page where to redirect after login
    });
    navigate(`/login/form?type=user&${params.toString()}`);
  };

  const getEventLink = (event) => {
    const eventDate = event.eventDate || event.date;
    const params = new URLSearchParams({
      event: event.id,
      eventName: event.name,
      eventDate: eventDate,
      eventEndDate: event.eventEndDate || '',
      isMultiDay: event.isMultiDay ? 'true' : 'false'
    });
    return `/donate?${params.toString()}`;
  };

  return (
    <div className="home-container">
      {/* Top Right Auth Buttons */}
      <div className="home-auth-buttons">
        <Link to="/login?type=user" className="home-auth-btn home-login-btn">
          Login
        </Link>
        <Link to="/signup?type=user" className="home-auth-btn home-signup-btn">
          Sign Up
        </Link>
      </div>

      {/* Learn More Modal */}
      {showLearnMore && (
        <div className="modal-overlay" onClick={() => setShowLearnMore(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLearnMore(null)}>×</button>
            <div className="modal-icon">📅</div>
            <h3>{showLearnMore.name}</h3>
            <div style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
              <p><strong>Date:</strong> {new Date(showLearnMore.eventDate || showLearnMore.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              {showLearnMore.startTime && showLearnMore.endTime && (
                <p><strong>Time:</strong> {showLearnMore.startTime} - {showLearnMore.endTime}</p>
              )}
              <p><strong>Location:</strong> {showLearnMore.locationAddress || showLearnMore.location}</p>
              {showLearnMore.locationCity && (
                <p><strong>City:</strong> {showLearnMore.locationCity}, {showLearnMore.locationState || ''}</p>
              )}
              {showLearnMore.description && (
                <p><strong>Description:</strong> {showLearnMore.description}</p>
              )}
              {showLearnMore.organization && (
                <p><strong>Organized by:</strong> {showLearnMore.organization.name || showLearnMore.orgName}</p>
              )}
              {showLearnMore.maxRegistrations && (
                <p><strong>Registrations:</strong> {showLearnMore.registrationCount || 0} / {showLearnMore.maxRegistrations}
                  {showLearnMore.isFull && <span style={{ color: '#dc2626', fontWeight: 'bold' }}> (FULL)</span>}
                  {showLearnMore.spotsRemaining !== null && showLearnMore.spotsRemaining > 0 && !showLearnMore.isFull && 
                    <span style={{ color: '#059669' }}> ({showLearnMore.spotsRemaining} spots remaining)</span>}
                </p>
              )}
            </div>
            <button className="modal-btn" onClick={() => setShowLearnMore(null)}>Close</button>
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-inner">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line">Save a Life</span>
            <span className="title-line highlight">Give Blood</span>
          </h1>
          <p className="hero-subtitle">
            Every donation can save up to three lives. Your contribution matters.
          </p>
        </div>
        <div className="hero-image">
            <img 
              src="/blood-drop-character.png.png" 
              alt="Blood Life Character" 
              className="blood-drop-image" 
            />
          <div className="pulse-circle"></div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="events-section">
        <div className="section-container">
          <h2 className="section-title">Upcoming Blood Donation Events</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
              <p style={{ fontSize: '1.2rem' }}>Loading events...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#dc2626' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{error}</p>
              <button 
                onClick={loadEvents}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Try Again
              </button>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>No upcoming events at the moment.</p>
              <p>Check back soon for new blood donation drives!</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map(event => {
                const eventDate = event.eventDate || event.date;
                const isFull = event.isFull || false;
                
                return (
                  <div key={event.id} className="event-card">
                    <div className="event-badge">{getEventBadge(eventDate)}</div>
                    <h3>{event.name}</h3>
                    <p className="event-meta">
                      📍 {event.locationAddress || event.location} • 🗓️ {formatEventDate(eventDate, event.startTime, event.endTime)}
                    </p>
                    {event.locationCity && (
                      <p className="event-meta" style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '4px' }}>
                        {event.locationCity}, {event.locationState || ''}
                      </p>
                    )}
                    {event.description && (
                      <p className="event-desc">{event.description}</p>
                    )}
                    {!event.description && (
                      <p className="event-desc">Join us for this blood donation event. Help save lives!</p>
                    )}
                    {event.organization && (
                      <p className="event-org" style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '8px' }}>
                        <strong>Organized by:</strong> {event.organization.name}
                      </p>
                    )}
                    {event.maxRegistrations && (
                      <p className="event-registrations" style={{ 
                        fontSize: '0.9rem', 
                        color: isFull ? '#dc2626' : '#059669',
                        fontWeight: '600',
                        marginTop: '8px'
                      }}>
                        {event.registrationCount || 0} / {event.maxRegistrations} registered
                        {isFull && ' (FULL)'}
                        {event.spotsRemaining !== null && event.spotsRemaining > 0 && !isFull && 
                          ` (${event.spotsRemaining} spots remaining)`}
                      </p>
                    )}
                    <div className="event-actions">
                      <Link 
                        to={getEventLink(event)}
                        className={`btn btn-primary ${isFull ? 'disabled' : ''}`}
                        onClick={(e) => {
                          if (isFull) {
                            e.preventDefault();
                            alert('This event is full. Please choose another event.');
                          } else {
                            handleRegisterClick(event, e);
                          }
                        }}
                      >
                        {isFull ? 'Event Full' : 'Register to Donate'}
                      </Link>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setShowLearnMore(event)}
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Appreciation Comments */}
      <section className="testimonials-section">
        <div className="section-container">
          <h2 className="section-title">Appreciation from Our Community</h2>
          {loadingTestimonials ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <p>Loading testimonials...</p>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="testimonials-grid">
              {/* Fallback to static testimonials if no dynamic ones available */}
              <div className="testimonial-card">
                <div className="quote">"</div>
                <p>Thanks to the donors, my father received the blood he needed after surgery. Forever grateful.</p>
                <div className="author">
                  <div className="avatar">AK</div>
                  <div>
                    <h4>Anita Kumar</h4>
                    <span>Family Member</span>
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="quote">"</div>
                <p>Donating was quick and easy. Knowing it could save lives is an incredible feeling.</p>
                <div className="author">
                  <div className="avatar">RJ</div>
                  <div>
                    <h4>Rahul Jain</h4>
                    <span>Regular Donor</span>
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="quote">"</div>
                <p>Our hospital partnered for a drive and saw an amazing response. Thank you volunteers!</p>
                <div className="author">
                  <div className="avatar">SH</div>
                  <div>
                    <h4>Sunrise Hospital</h4>
                    <span>Partner</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="testimonials-grid">
              {testimonials.map(testimonial => {
                // Generate avatar initials from author name
                const initials = testimonial.authorName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div key={testimonial.id} className="testimonial-card">
                    <div className="quote">"</div>
                    <p>{testimonial.message}</p>
                    <div className="author">
                      <div className="avatar">{initials}</div>
                      <div>
                        <h4>{testimonial.authorName}</h4>
                        <span>{testimonial.authorRole}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Why Donate Section */}
      <section className="why-donate-section">
        <div className="section-container">
          <h2 className="section-title">Why Donate Blood?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">❤️</div>
              <h3>Save Lives</h3>
              <p>A single donation can help save up to three lives in emergency situations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🩸</div>
              <h3>Health Benefits</h3>
              <p>Regular donation helps maintain healthy iron levels and reduces risk of heart disease.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Quick Process</h3>
              <p>The entire donation process takes only 10-15 minutes and is completely safe.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>Make a Difference</h3>
              <p>Be part of a community that cares and makes a real impact in people's lives.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action & Footer - Unified Section */}
      <div className="cta-footer-wrapper">
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Make a Difference?</h2>
            <p>Join thousands of donors who are saving lives every day</p>
            <Link to="/login?type=user" className="btn btn-cta">
              Start Donating Today
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link to="/">About Us</Link>
            <Link to="/">Contact</Link>
            <Link to="/">Privacy Policy</Link>
            <Link to="/">Terms of Service</Link>
            <Link to="/admin/login" className="admin-link">Admin Login</Link>
          </div>
          <div className="footer-copyright">
            <p>&copy; {new Date().getFullYear()} Blood Life. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default Home;

