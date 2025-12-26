import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../../utils/storage';
import './Home.css';

const Home = () => {
  const [showLearnMore, setShowLearnMore] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    loadEvents();
    // Refresh events every 30 seconds to catch new ones
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEvents = () => {
    const allEvents = getEvents(); // Get all events (no orgEmail filter)
    const now = new Date();
    
    // Filter only upcoming events (date >= today)
    const upcomingEvents = allEvents
      .filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6); // Limit to 6 most upcoming events
    
    setEvents(upcomingEvents);
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

  const getEventLink = (event) => {
    const params = new URLSearchParams({
      event: event.id,
      eventName: event.name,
      eventDate: event.date,
      isMultiDay: 'false'
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
              <p><strong>Date:</strong> {new Date(showLearnMore.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              {showLearnMore.startTime && showLearnMore.endTime && (
                <p><strong>Time:</strong> {showLearnMore.startTime} - {showLearnMore.endTime}</p>
              )}
              <p><strong>Location:</strong> {showLearnMore.location}</p>
              {showLearnMore.description && (
                <p><strong>Description:</strong> {showLearnMore.description}</p>
              )}
              {showLearnMore.orgName && (
                <p><strong>Organized by:</strong> {showLearnMore.orgName}</p>
              )}
            </div>
            <button className="modal-btn" onClick={() => setShowLearnMore(null)}>Close</button>
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className="hero-section">
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
          <div className="blood-drop"></div>
          <div className="pulse-circle"></div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="events-section">
        <div className="section-container">
          <h2 className="section-title">Upcoming Blood Donation Events</h2>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>No upcoming events at the moment.</p>
              <p>Check back soon for new blood donation drives!</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map(event => (
                <div key={event.id} className="event-card">
                  <div className="event-badge">{getEventBadge(event.date)}</div>
                  <h3>{event.name}</h3>
                  <p className="event-meta">
                    📍 {event.location} • 🗓️ {formatEventDate(event.date, event.startTime, event.endTime)}
                  </p>
                  {event.description && (
                    <p className="event-desc">{event.description}</p>
                  )}
                  {!event.description && (
                    <p className="event-desc">Join us for this blood donation event. Help save lives!</p>
                  )}
                  <div className="event-actions">
                    <Link 
                      to={getEventLink(event)}
                      className="btn btn-primary"
                    >
                      Register to Donate
                    </Link>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setShowLearnMore(event)}
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Appreciation Comments */}
      <section className="testimonials-section">
        <div className="section-container">
          <h2 className="section-title">Appreciation from Our Community</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="quote">“</div>
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
              <div className="quote">“</div>
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
              <div className="quote">“</div>
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

      {/* Call to Action */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Make a Difference?</h2>
          <p>Join thousands of donors who are saving lives every day</p>
          <Link to="/login?type=user" className="btn btn-cta">
            Start Donating Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

