import React, { useState, useEffect } from 'react';
import { eventAPI } from '../../utils/api';
import './EventCalendar.css';

const EventCalendar = ({ userCity, onEventClick }) => {
  const [events, setEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [currentMonth, userCity]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.getAllEvents({ 
        city: userCity,
        status: 'upcoming'
      });
      if (response.success) {
        setEvents(response.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.eventDate);
      const eventDateStr = eventDate.toISOString().split('T')[0];
      
      // Check if event is on this date or spans this date (for multi-day events)
      if (eventDateStr === dateStr) return true;
      if (event.eventEndDate) {
        const eventEndDate = new Date(event.eventEndDate);
        const eventEndDateStr = eventEndDate.toISOString().split('T')[0];
        return dateStr >= eventDateStr && dateStr <= eventEndDateStr;
      }
      return false;
    });
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return <div className="event-calendar-loading">Loading calendar...</div>;
  }

  return (
    <div className="event-calendar">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>
          ← Prev
        </button>
        <h3 className="calendar-month-year">{formatMonthYear(currentMonth)}</h3>
        <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>
          Next →
        </button>
        <button className="calendar-today-btn" onClick={goToToday}>
          Today
        </button>
      </div>

      <div className="calendar-grid">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}

        {/* Calendar days */}
        {days.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const isCurrentDay = isToday(date);
          
          return (
            <div
              key={index}
              className={`calendar-day ${!date ? 'empty' : ''} ${isCurrentDay ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
            >
              {date && (
                <>
                  <div className="calendar-day-number">{date.getDate()}</div>
                  {dayEvents.length > 0 && (
                    <div className="calendar-events">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className="calendar-event-dot"
                          title={`${event.name} - ${new Date(event.eventDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEventClick) {
                              onEventClick(event);
                            }
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="calendar-event-more">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Event legend */}
      {events.length > 0 && (
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-dot"></div>
            <span>Event scheduled</span>
          </div>
        </div>
      )}

      {/* Upcoming events list */}
      {events.length > 0 && (
        <div className="calendar-events-list">
          <h4>Upcoming Events This Month</h4>
          {events
            .filter(event => {
              const eventDate = new Date(event.eventDate);
              return eventDate >= new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1) &&
                     eventDate < new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
            })
            .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
            .map(event => (
              <div
                key={event.id}
                className="calendar-event-item"
                onClick={() => onEventClick && onEventClick(event)}
              >
                <div className="event-item-date">
                  {new Date(event.eventDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="event-item-name">{event.name}</div>
                <div className="event-item-location">
                  📍 {event.locationCity}, {event.locationState}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
