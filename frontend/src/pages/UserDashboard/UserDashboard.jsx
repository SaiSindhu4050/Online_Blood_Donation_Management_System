import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser } from '../../utils/storage';
import { 
  userAPI, 
  donationAPI, 
  requestAPI, 
  eventAPI, 
  organizationAPI, 
  authAPI 
} from '../../utils/api';
import Navbar from '../../components/Navbar/Navbar';
import './UserDashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [urgentRequests, setUrgentRequests] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [scheduledAppointments, setScheduledAppointments] = useState([]);
  const [events, setEvents] = useState([]);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateError, setDonateError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [dailyHealthBenefit, setDailyHealthBenefit] = useState('');
  const [editProfileData, setEditProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    bloodGroup: '',
    password: '',
    confirmPassword: ''
  });
  const [editProfileErrors, setEditProfileErrors] = useState({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDonationsHistoryModal, setShowDonationsHistoryModal] = useState(false);
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [showRescheduleSuccessModal, setShowRescheduleSuccessModal] = useState(false);

  // Daily health benefits
  const healthBenefits = [
    'Regular blood donation can reduce the risk of heart disease and stroke.',
    'Donating blood helps lower your iron levels, reducing the risk of iron overload.',
    'Each donation can help save up to three lives!',
    'Blood donation stimulates the production of new blood cells, keeping you healthy.',
    'Regular donors receive free health screenings during each donation.',
    'Donating blood can improve your cardiovascular health and reduce cancer risk.',
    'Your body replaces the donated blood within 24-48 hours.',
    'Blood donation is a simple way to give back to your community.',
    'Regular donors are less likely to have high blood pressure.',
    'Donating blood can help reduce harmful cholesterol levels.',
    'Your single donation can be separated into red cells, platelets, and plasma.',
    'Blood donors often report feeling happier and more fulfilled.',
    'Donating blood helps maintain healthy iron levels in your body.',
    'Regular blood donation can improve your mental well-being.',
    'Each donation takes only 10-15 minutes but can save lives for years.'
  ];

  useEffect(() => {
    // Listen for tab switch events from navbar
    const handleTabSwitch = (event) => {
      setActiveTab(event.detail);
      // Refresh events when switching to events tab
      const user = getCurrentUser();
      const dataToUse = userData || user;
      if (event.detail === 'events' && dataToUse) {
        loadEventsForUser(dataToUse);
      }
    };
    window.addEventListener('switchTab', handleTabSwitch);
    
    // Set daily health benefit based on day of year
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const benefitIndex = dayOfYear % healthBenefits.length;
    setDailyHealthBenefit(healthBenefits[benefitIndex]);

    const loadDashboardData = async () => {
      const user = getCurrentUser();
      if (!user || !user.token) {
        navigate('/login');
        return;
      }

      try {
        setCurrentUser(user);
        
        // Set userData from localStorage user as fallback (in case API fails)
        // This ensures the component can render even if API calls fail
        if (user.fullName || user.email) {
          setUserData({
            ...user,
            fullName: user.fullName || user.email,
            email: user.email,
            city: user.city || '',
            state: user.state || '',
            bloodGroup: user.bloodGroup || '',
            rewardPoints: user.rewardPoints || 0,
            lastDonationAt: user.lastDonationAt || null
          });
        }
        
        // Get user profile and dashboard data from API
        let profileResponse = null;
        let dashboardResponse = null;
        
        try {
          [profileResponse, dashboardResponse] = await Promise.all([
            authAPI.getMe(),
            userAPI.getDashboard()
          ]);
        } catch (apiError) {
          console.error('API call failed:', apiError);
          // Continue with fallback data from localStorage
        }

        // Update userData if API call succeeded
        if (profileResponse?.success && profileResponse?.user) {
          const fullUser = profileResponse.user;
          setUserData(fullUser);
        } else if (profileResponse && !profileResponse.success) {
          console.warn('Profile API call failed, using localStorage data');
        }

        // Use the most up-to-date user data (from API or localStorage)
        const currentUserData = profileResponse?.success && profileResponse?.user 
          ? profileResponse.user 
          : (user.fullName || user.email ? {
              ...user,
              fullName: user.fullName || user.email,
              email: user.email,
              city: user.city || '',
              state: user.state || '',
              bloodGroup: user.bloodGroup || '',
              rewardPoints: user.rewardPoints || 0,
              lastDonationAt: user.lastDonationAt || null
            } : null);

        if (dashboardResponse?.success) {
          const dashboard = dashboardResponse.dashboard;
          // Ensure donations are filtered by current user (safety check)
          const userDonations = (dashboard.donations || []).filter(d => 
            d.userId === currentUserData?.id || d.userId === user?.id
          );
          setDonations(userDonations);
          // Ensure requests are filtered by current user (safety check)
          const userReqs = (dashboard.requests || []).filter(r => 
            r.userId === currentUserData?.id || r.userId === user?.id
          );
          setUserRequests(userReqs);
          setUrgentRequests(dashboard.urgentRequests || []);
          setOrganizations(dashboard.organizations || []);
          setEvents(dashboard.events || []);
          // Note: messages and notifications may need separate endpoints
          setMessages([]);
          setNotifications([]);
        } else {
          // Fallback: Load user's donations and requests if dashboard fails
          try {
            const userIdToUse = currentUserData?.id || user?.id;
            if (!userIdToUse) {
              console.error('No user ID available for filtering donations');
              return;
            }
            
            const [donationsResponse, requestsResponse] = await Promise.all([
              donationAPI.getAllDonations({ userId: userIdToUse }),
              requestAPI.getAllRequests({ userId: userIdToUse })
            ]);

            if (donationsResponse?.success) {
              // Double-check: filter donations by user ID (safety check)
              const userDonations = (donationsResponse.donations || []).filter(d => 
                d.userId === userIdToUse
              );
              setDonations(userDonations);
            }

            if (requestsResponse?.success) {
              // Double-check: filter requests by user ID (safety check)
              const userReqs = (requestsResponse.requests || []).filter(r => 
                r.userId === userIdToUse
              );
              setUserRequests(userReqs);
            }
          } catch (fallbackError) {
            console.error('Error loading fallback data:', fallbackError);
          }
        }

        // Load urgent requests - use dashboard data if available, otherwise load separately
        // The backend will automatically exclude user's own requests
        if (dashboardResponse?.success && dashboardResponse.dashboard?.urgentRequests?.length > 0) {
          // Use dashboard data (already filtered by backend)
          setUrgentRequests(dashboardResponse.dashboard.urgentRequests);
        } else {
          // Fallback: Load urgent requests separately if dashboard didn't provide them
          // Use currentUserData or user as fallback
          const city = currentUserData?.city || user?.city;
          if (city) {
            try {
              // Load both emergency and urgent requests
              // Backend will exclude user's own requests automatically
              const urgentResponse = await requestAPI.getAllRequests({ 
                city: city
              });
              
              if (urgentResponse?.success && urgentResponse.requests) {
                // Filter for urgent/emergency and exclude user's own requests
                const filtered = urgentResponse.requests.filter(
                  req => req.userId !== user.id && 
                         req.status !== 'fulfilled' && 
                         req.status !== 'cancelled' &&
                         (req.urgency === 'emergency' || req.urgency === 'urgent')
                );
                
                // Sort by urgency (emergency first) and required date
                filtered.sort((a, b) => {
                  if (a.urgency === 'emergency' && b.urgency !== 'emergency') return -1;
                  if (a.urgency !== 'emergency' && b.urgency === 'emergency') return 1;
                  return new Date(a.requiredDate) - new Date(b.requiredDate);
                });
                
                setUrgentRequests(filtered);
              }
            } catch (error) {
              console.error('Error loading urgent requests:', error);
            }
          }
        }

        // Load organizations - use currentUserData or user
        const cityForOrgs = currentUserData?.city || user?.city;
        if (cityForOrgs) {
          try {
            const orgsResponse = await organizationAPI.getAllOrganizations(cityForOrgs);
            if (orgsResponse?.success) {
              setOrganizations(orgsResponse.organizations || []);
            }
          } catch (error) {
            console.error('Error loading organizations:', error);
          }
        }

        // Load events - use currentUserData or user
        if (currentUserData) {
          try {
            loadEventsForUser(currentUserData);
          } catch (error) {
            console.error('Error loading events:', error);
          }
        } else if (user?.city) {
          try {
            loadEventsForUser({
              ...user,
              city: user.city
            });
          } catch (error) {
            console.error('Error loading events with user data:', error);
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Even if everything fails, try to set basic user data so component can render
        if (user && (user.fullName || user.email)) {
          setUserData({
            ...user,
            fullName: user.fullName || user.email,
            email: user.email,
            city: user.city || '',
            state: user.state || '',
            bloodGroup: user.bloodGroup || '',
            rewardPoints: user.rewardPoints || 0,
            lastDonationAt: user.lastDonationAt || null
          });
        }
        if (error.message?.includes('Unauthorized') || error.message?.includes('token')) {
          navigate('/login');
        }
      }
    };

    loadDashboardData();

    return () => {
      window.removeEventListener('switchTab', handleTabSwitch);
    };
  }, [navigate]);

  // Helper function to refresh request data
  const refreshRequestData = async () => {
    const user = currentUser || getCurrentUser();
    if (!user?.id) return;
    
    try {
      const [requestsResponse, dashboardResponse] = await Promise.all([
        requestAPI.getAllRequests({ userId: user.id }),
        userAPI.getDashboard()
      ]);
      
      // Use dashboard data if available (more complete), otherwise use direct API response
      if (dashboardResponse.success && dashboardResponse.dashboard) {
        setUserRequests(dashboardResponse.dashboard.requests || []);
        // Also update other dashboard data (already filtered by city and excludes user's own)
        setUrgentRequests(dashboardResponse.dashboard.urgentRequests || []);
      } else if (requestsResponse.success) {
        setUserRequests(requestsResponse.requests || []);
      }
    } catch (error) {
      console.error('Error refreshing request data:', error);
    }
  };

  // Helper function to refresh urgent requests
  const refreshUrgentRequests = async () => {
    const user = currentUser || getCurrentUser();
    if (!user?.id) return;
    
    try {
      // Try dashboard first (properly filtered by backend - excludes user's own requests)
      const dashboardResponse = await userAPI.getDashboard();
      if (dashboardResponse.success && dashboardResponse.dashboard?.urgentRequests) {
        setUrgentRequests(dashboardResponse.dashboard.urgentRequests || []);
        return;
      }
      
      // Fallback: Load urgent requests in user's city
      // Backend will automatically exclude user's own requests
      const city = userData?.city || user.city;
      if (!city) return;
      
      const urgentResponse = await requestAPI.getAllRequests({ city });
      
      if (urgentResponse.success && urgentResponse.requests) {
        // Filter for urgent/emergency and exclude user's own requests (backend should do this, but double-check)
        const filtered = urgentResponse.requests.filter(
          req => req.userId !== user.id && 
                 req.status !== 'fulfilled' && 
                 req.status !== 'cancelled' &&
                 (req.urgency === 'emergency' || req.urgency === 'urgent')
        );
        
        // Sort by urgency (emergency first) and required date
        filtered.sort((a, b) => {
          if (a.urgency === 'emergency' && b.urgency !== 'emergency') return -1;
          if (a.urgency !== 'emergency' && b.urgency === 'emergency') return 1;
          return new Date(a.requiredDate) - new Date(b.requiredDate);
        });
        
        setUrgentRequests(filtered);
      }
    } catch (error) {
      console.error('Error refreshing urgent requests:', error);
    }
  };

  // Refresh events when switching to events tab
  useEffect(() => {
    const dataToUse = userData || currentUser;
    if (activeTab === 'events' && dataToUse) {
      loadEventsForUser(dataToUse);
    }
  }, [activeTab, userData, currentUser]);

  // Load user data into edit profile form when switching to edit-profile tab
  useEffect(() => {
    const dataToUse = userData || currentUser;
    if (activeTab === 'edit-profile' && dataToUse) {
      setEditProfileData({
        fullName: dataToUse.fullName || '',
        email: dataToUse.email || '',
        phone: dataToUse.phone || '',
        dateOfBirth: dataToUse.dateOfBirth || '',
        gender: dataToUse.gender || '',
        address: dataToUse.address || '',
        city: dataToUse.city || '',
        state: dataToUse.state || '',
        zipCode: dataToUse.zipCode || '',
        bloodGroup: dataToUse.bloodGroup || '',
        password: '',
        confirmPassword: ''
      });
      setEditProfileErrors({});
    }
  }, [activeTab, userData, currentUser]);

  const loadEventsForUser = async (userData) => {
    if (!userData || !userData.city) {
      setEvents([]);
      return;
    }

    try {
      // Load events filtered by city
      const eventsResponse = await eventAPI.getAllEvents({ city: userData.city });
      if (eventsResponse.success) {
        const now = new Date();
        const relevantEvents = (eventsResponse.events || [])
          .filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            return eventDate >= today;
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        setEvents(relevantEvents);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    }
  };

  // Calculate the most recent donation date from completed donations only
  // Note: 'approved' and 'scheduled' are just appointments, not actual donations
  // Only 'completed' means the user actually donated and should trigger cooldown
  const getMostRecentDonationDate = () => {
    // Get current user ID for filtering
    const currentUserId = userData?.id || currentUser?.id;
    if (!currentUserId) return null;
    
    // Get only completed donations (filtered by user)
    // Approved/scheduled donations are appointments, not completed donations
    const completedDonations = donations.filter(d => 
      d.userId === currentUserId &&
      d.status === 'completed'
    );
    
    if (completedDonations.length === 0) {
      // Fallback to lastDonationAt from user data
      return displayUserData?.lastDonationAt || currentUser?.lastDonationAt || null;
    }
    
    // Find the most recent donation date
    const dates = completedDonations
      .map(d => d.eventDate || d.scheduledDate || d.createdAt || d.updatedAt)
      .filter(Boolean)
      .map(date => new Date(date));
    
    if (dates.length === 0) {
      return displayUserData?.lastDonationAt || currentUser?.lastDonationAt || null;
    }
    
    // Return the most recent date
    const mostRecent = new Date(Math.max(...dates));
    return mostRecent.toISOString();
  };

  // Calculate days remaining in cooldown
  const getCooldownDaysRemaining = () => {
    const lastDonationDate = getMostRecentDonationDate();
    if (!lastDonationDate) return null;
    
    const lastDonation = new Date(lastDonationDate);
    const now = new Date();
    
    // If donation is in the future (including same day but future time), return null (no cooldown yet)
    // This handles cases where the donation date is today but time hasn't passed yet
    if (lastDonation > now) return null;
    
    // Calculate days since last donation
    const daysSince = Math.floor((now - lastDonation) / (1000 * 60 * 60 * 24));
    
    const daysRemaining = 56 - daysSince;
    
    // Only return if cooldown is still active (daysRemaining > 0)
    return daysRemaining > 0 ? daysRemaining : null;
  };

  const handleDonateClick = () => {
    const userDataToCheck = userData || currentUser;
    if (!userDataToCheck) return;
    
    // Check if user can donate (56-day cooldown)
    const daysRemaining = getCooldownDaysRemaining();
    
    if (daysRemaining !== null && daysRemaining > 0) {
      setDonateError(`You cannot donate within 56 days of your last donation. You need to wait ${daysRemaining} more ${daysRemaining === 1 ? 'day' : 'days'}.`);
      setShowDonateModal(true);
      return;
    }
    
    navigate('/donate');
  };

  const handleAcceptUrgentRequest = async (requestId) => {
    if (!currentUser?.id) return;
    
    try {
      // Match donor to request via API
      await requestAPI.matchDonors(requestId);
      
      // Refresh urgent requests using helper function
      await refreshUrgentRequests();
      
      // Show success message
      alert('Thank you! The hospital has been notified that you are ready to donate.');
    } catch (error) {
      alert(error.message || 'Failed to accept request. Please try again.');
    }
  };

  const handleReviewClick = (type, itemId, itemName) => {
    // Note: Review functionality needs backend API support
    // For now, just show the modal
    setReviewItem({ type, itemId, itemName });
    setShowReviewModal(true);
    setReviewRating(5);
    setReviewComment('');
  };

  const handleSubmitReview = async () => {
    if (!reviewItem || !currentUser?.id) return;

    // Note: Review functionality needs backend API support
    // For now, just show a message
    alert('Review functionality will be available soon. Thank you for your feedback!');
    
    setShowReviewModal(false);
    setReviewItem(null);
    
    // Refresh user data
    try {
      const profileResponse = await authAPI.getMe();
      if (profileResponse.success && profileResponse.user) {
        setUserData(profileResponse.user);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const handleAppointmentClick = async () => {
    // Get appointments from donations and requests
    try {
      const [donationsResponse, requestsResponse] = await Promise.all([
        donationAPI.getAllDonations({ userId: currentUser.id }),
        requestAPI.getAllRequests({ userId: currentUser.id })
      ]);

      const appointments = [];
      
      if (donationsResponse.success) {
        donationsResponse.donations?.forEach(donation => {
          if (donation.status === 'approved' || donation.status === 'pending') {
            appointments.push({
              id: donation.id,
              type: 'donation',
              eventName: donation.eventName || 'Blood Donation',
              date: donation.eventDate || donation.preferredDate,
              time: donation.preferredTime,
              status: donation.status,
              data: donation
            });
          }
        });
      }

      if (requestsResponse.success) {
        requestsResponse.requests?.forEach(request => {
          if (request.status === 'fulfilled' || request.status === 'matched' || request.status === 'pending') {
            appointments.push({
              id: request.id,
              type: 'request',
              eventName: `Blood Request - ${request.bloodGroup}`,
              date: request.requiredDate,
              status: request.status,
              data: request
            });
          }
        });
      }

      if (appointments.length === 0) {
        alert('You have no scheduled appointments.');
        return;
      }

      setScheduledAppointments(appointments);
      setShowAppointmentModal(true);
    } catch (error) {
      console.error('Error loading appointments:', error);
      alert('Failed to load appointments. Please try again.');
    }
  };

  const handleCancelAppointment = async (appointment) => {
    if (!window.confirm(`Are you sure you want to cancel this appointment: ${appointment.eventName}?`)) {
      return;
    }

    try {
      if (appointment.type === 'donation') {
        await donationAPI.deleteDonation(appointment.id);
        // Refresh donations
        const donationsResponse = await donationAPI.getAllDonations({ userId: currentUser.id });
        if (donationsResponse.success) {
          setDonations(donationsResponse.donations || []);
        }
      } else {
        await requestAPI.deleteRequest(appointment.id);
        // Refresh requests
        const requestsResponse = await requestAPI.getAllRequests({ userId: currentUser.id });
        if (requestsResponse.success) {
          setUserRequests(requestsResponse.requests || []);
        }
      }
      
      setShowAppointmentModal(false);
      alert('Appointment cancelled successfully.');
    } catch (error) {
      alert(error.message || 'Failed to cancel appointment. Please try again.');
    }
  };

  const handleRescheduleAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    // Pre-fill with current date/time if available
    if (appointment.date) {
      const dateStr = appointment.date.includes('T') 
        ? appointment.date.split('T')[0] 
        : appointment.date;
      setRescheduleDate(dateStr);
    }
    if (appointment.time) {
      setRescheduleTime(appointment.time);
    }
  };

  const handleSubmitReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate) {
      alert('Please select a new date.');
      return;
    }

    // Only handle donation reschedules (requests can be handled differently if needed)
    if (selectedAppointment.type !== 'donation') {
      alert('Reschedule requests are currently only available for donations.');
      return;
    }

    try {
      // Check 24-hour rule
      const appointmentDate = selectedAppointment.data.eventDate || selectedAppointment.data.scheduledDate;
      if (appointmentDate) {
        const appointmentDateTime = new Date(appointmentDate);
        const appointmentTime = selectedAppointment.data.scheduledTime || selectedAppointment.data.preferredTime;
        if (appointmentTime) {
          const [hours, minutes] = appointmentTime.split(':');
          appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        const now = new Date();
        const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60);
        
        if (hoursUntil <= 24) {
          alert('Cannot reschedule within 24 hours of appointment. Please contact the organization directly.');
          return;
        }
      }

      // Create reschedule request instead of updating directly
      const response = await donationAPI.requestReschedule(selectedAppointment.id, {
        newDate: rescheduleDate,
        newTime: rescheduleTime || selectedAppointment.data.scheduledTime || selectedAppointment.data.preferredTime || null,
        reason: null // Can add reason field later if needed
      });

      if (response.success) {
        // Show success modal
        setShowRescheduleSuccessModal(true);
        
        // Close appointment modal and reset form
        setShowAppointmentModal(false);
        setSelectedAppointment(null);
        setRescheduleDate('');
        setRescheduleTime('');
        
        // Refresh donations to get updated reschedule request info
        const donationsResponse = await donationAPI.getAllDonations({ userId: currentUser.id });
        if (donationsResponse.success) {
          setDonations(donationsResponse.donations || []);
        }
      }
    } catch (error) {
      alert(error.message || 'Failed to submit reschedule request. Please try again.');
    }
  };

  // Get active donation (pending or approved with future eventDate)
  const getActiveDonation = () => {
    const currentUserId = userData?.id || currentUser?.id;
    if (!currentUserId) return null;
    
    const now = new Date();
    return donations.find(d => {
      // Filter by user ID first
      if (d.userId !== currentUserId) return false;
      
      if (d.status === 'approved' && d.eventDate) {
        return new Date(d.eventDate) > now;
      }
      return d.status === 'pending';
    });
  };

  // Get upcoming donation (approved or scheduled with future date)
  const getUpcomingDonation = () => {
    const currentUserId = userData?.id || currentUser?.id;
    if (!currentUserId) return null;
    
    const now = new Date();
    const upcomingDonations = donations.filter(d => {
      // Filter by user ID first
      if (d.userId !== currentUserId) return false;
      
      const donationDate = d.eventDate || d.scheduledDate;
      return (d.status === 'approved' || d.status === 'scheduled') && 
             donationDate && 
             new Date(donationDate) > now;
    });
    
    // Return the most upcoming one (earliest date)
    if (upcomingDonations.length === 0) return null;
    
    return upcomingDonations.sort((a, b) => {
      const dateA = new Date(a.eventDate || a.scheduledDate);
      const dateB = new Date(b.eventDate || b.scheduledDate);
      return dateA - dateB;
    })[0];
  };

  // Check if last donation was more than 56 days ago
  const isLastDonationOld = () => {
    const lastDonationDate = getMostRecentDonationDate();
    if (!lastDonationDate) return true; // No donation = consider it "old"
    
    const lastDonation = new Date(lastDonationDate);
    const now = new Date();
    const daysSince = Math.floor((now - lastDonation) / (1000 * 60 * 60 * 24));
    return daysSince > 56;
  };

  // Calculate days until upcoming donation
  const getDaysUntilUpcomingDonation = (donation) => {
    if (!donation) return null;
    const donationDate = donation.eventDate || donation.scheduledDate;
    if (!donationDate) return null;
    
    const eventDate = new Date(donationDate);
    const now = new Date();
    const diffTime = eventDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  // Calculate countdown timer for upcoming donation (days, hours, minutes)
  const getDonationCountdown = (donation) => {
    if (!donation) return null;
    const donationDate = donation.eventDate || donation.scheduledDate;
    if (!donationDate) return null;
    
    const eventDate = new Date(donationDate);
    const now = new Date();
    const diffMs = eventDate - now;
    
    if (diffMs <= 0) return null; // Donation date has passed
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days: diffDays, hours: diffHours, minutes: diffMinutes };
  };

  // Format date and time for display
  const formatDonationDateTime = (donation) => {
    const donationDate = donation.eventDate || donation.scheduledDate;
    if (!donationDate) return { date: 'Not scheduled', time: '' };
    
    const date = new Date(donationDate);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const time = donation.preferredTime || donation.scheduledTime || '';
    const formattedTime = time ? ` at ${time}` : '';
    
    return { date: formattedDate, time: formattedTime };
  };

  const activeDonation = getActiveDonation();
  const upcomingDonation = getUpcomingDonation();
  const unreadMessagesCount = messages.filter(m => !m.read).length;
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  // Calculate donation count from actual donations array
  // Only count 'completed' donations - donations are only counted after customer actually shows up and donates
  // 'approved' and 'scheduled' are just appointments, not actual donations yet
  // Filter by current user ID to ensure only user's own donations are counted
  const currentUserId = userData?.id || currentUser?.id;
  const donationCount = donations.filter(d => 
    d.userId === currentUserId &&
    d.status === 'completed'
  ).length;
  const rewardPoints = userData?.rewardPoints || currentUser?.rewardPoints || 0;

  // Calculate days until upcoming donation (for backward compatibility)
  const getDaysUntilDonation = () => {
    if (!activeDonation || !activeDonation.eventDate) return null;
    const eventDate = new Date(activeDonation.eventDate);
    const now = new Date();
    const diffTime = eventDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  const daysUntilDonation = getDaysUntilDonation();

  const handleEditProfileChange = (e) => {
    const { name, value } = e.target;
    setEditProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (editProfileErrors[name]) {
      setEditProfileErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateEditProfile = () => {
    const newErrors = {};

    if (!editProfileData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!editProfileData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editProfileData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!editProfileData.phone) {
      newErrors.phone = 'Phone number is required';
    }

    if (!editProfileData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }

    if (!editProfileData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!editProfileData.address) {
      newErrors.address = 'Address is required';
    }

    if (!editProfileData.city) {
      newErrors.city = 'City is required';
    }

    if (!editProfileData.state) {
      newErrors.state = 'State is required';
    }

    if (!editProfileData.zipCode) {
      newErrors.zipCode = 'Zip code is required';
    }

    if (!editProfileData.bloodGroup) {
      newErrors.bloodGroup = 'Blood group is required';
    }

    // Only validate password if it's being changed
    if (editProfileData.password || editProfileData.confirmPassword) {
      if (!editProfileData.password) {
        newErrors.password = 'Password is required';
      } else if (editProfileData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(editProfileData.password)) {
        newErrors.password = 'Password must contain uppercase, lowercase, and number';
      }

      if (!editProfileData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (editProfileData.password !== editProfileData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setEditProfileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!validateEditProfile()) {
      return;
    }

    setIsSavingProfile(true);

    try {
      // Calculate age from date of birth
      const birthDate = new Date(editProfileData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

      // Prepare update data
      const updates = {
        fullName: editProfileData.fullName.trim(),
        phone: editProfileData.phone.trim(),
        dateOfBirth: editProfileData.dateOfBirth,
        age: actualAge,
        gender: editProfileData.gender,
        address: editProfileData.address.trim(),
        city: editProfileData.city.trim(),
        state: editProfileData.state.trim(),
        zipCode: editProfileData.zipCode.trim(),
        bloodGroup: editProfileData.bloodGroup
      };

      // Only update password if it was changed
      if (editProfileData.password) {
        updates.password = editProfileData.password;
      }

      // Check if email changed
      if (editProfileData.email !== currentUser.email) {
        updates.email = editProfileData.email.trim();
      }

      // Update user profile via API
      const response = await userAPI.updateProfile(updates);
      
      if (response.success) {
        // Refresh user data
        const profileResponse = await authAPI.getMe();
        if (profileResponse.success && profileResponse.user) {
          setUserData(profileResponse.user);
          // Update current user session if email changed
          if (editProfileData.email !== currentUser.email) {
            setCurrentUser({ 
              ...currentUser, 
              fullName: updates.fullName, 
              email: updates.email 
            });
          }
        }

        setIsSavingProfile(false);
        setSuccessMessage('Profile updated successfully!');
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          setActiveTab('dashboard');
        }, 2000);
      }
    } catch (error) {
      setIsSavingProfile(false);
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        setEditProfileErrors(prev => ({ ...prev, email: 'An account with this email already exists' }));
      } else {
        alert(error.message || 'Failed to update profile. Please try again.');
      }
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Show loading state if we don't have at least basic user info
  // But use currentUser as fallback if userData isn't available yet
  if (!currentUser) {
    return (
      <div className="dashboard-loading" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        fontSize: '18px',
        color: '#333'
      }}>
        Loading...
      </div>
    );
  }

  // Use currentUser as fallback if userData isn't set yet
  const displayUserData = userData || {
    ...currentUser,
    fullName: currentUser.fullName || currentUser.email || 'User',
    email: currentUser.email || '',
    city: currentUser.city || '',
    state: currentUser.state || '',
    bloodGroup: currentUser.bloodGroup || '',
    rewardPoints: currentUser.rewardPoints || 0,
    lastDonationAt: currentUser.lastDonationAt || null
  };

  return (
    <div className="user-dashboard">
      <Navbar />
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="user-greeting">
            <h1>Welcome back, {displayUserData.fullName || displayUserData.email || 'User'}!</h1>
            <p className="daily-health-benefit">💡 {dailyHealthBenefit}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div 
          className="stat-card clickable" 
          onClick={() => setShowDonationsHistoryModal(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon">💉</div>
          <div className="stat-content">
            <h3>{donationCount}</h3>
            <p>Total Donations</p>
          </div>
        </div>
        <div 
          className="stat-card clickable" 
          onClick={() => setActiveTab('messages')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon">📬</div>
          <div className="stat-content">
            <h3>{unreadMessagesCount}</h3>
            <p>Unread Messages</p>
          </div>
        </div>
        <div 
          className="stat-card clickable" 
          onClick={() => setActiveTab('notifications')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon">🔔</div>
          <div className="stat-content">
            <h3>{unreadNotificationsCount}</h3>
            <p>Notifications</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>
              {(() => {
                const upcoming = getUpcomingDonation();
                const cooldownDays = getCooldownDaysRemaining();
                
                // Priority 1: If there's an upcoming donation, show countdown to it
                // This takes priority over cooldown because approved donations are appointments, not completed
                if (upcoming) {
                  const countdown = getDonationCountdown(upcoming);
                  if (countdown && countdown.days >= 0) {
                    // If less than 1 day, show hours or minutes
                    if (countdown.days === 0 && countdown.hours > 0) {
                      return `${countdown.hours} hours`;
                    } else if (countdown.days === 0 && countdown.hours === 0 && countdown.minutes > 0) {
                      return `${countdown.minutes} min`;
                    } else if (countdown.days > 0) {
                      return `${countdown.days} days`;
                    }
                  }
                }
                
                // Priority 2: If cooldown is active (from completed donations), show cooldown
                if (cooldownDays !== null && cooldownDays > 0) {
                  return `${cooldownDays} days`;
                }
                
                // Priority 3: If no upcoming donation and no cooldown, show last donation info
                const lastDonationDate = getMostRecentDonationDate();
                if (lastDonationDate) {
                  const lastDonation = new Date(lastDonationDate);
                  const now = new Date();
                  const daysSince = Math.floor((now - lastDonation) / (1000 * 60 * 60 * 24));
                  // Only show if it's a past donation (positive daysSince)
                  if (daysSince >= 0) {
                    return `${daysSince} days ago`;
                  }
                }
                
                return 'Never';
              })()}
            </h3>
            <p>
              {(() => {
                const upcoming = getUpcomingDonation();
                const cooldownDays = getCooldownDaysRemaining();
                
                // Priority 1: If there's an upcoming donation, show "Upcoming Donation"
                if (upcoming) {
                  return 'Upcoming Donation';
                }
                
                // Priority 2: If cooldown is active, show cooldown
                if (cooldownDays !== null && cooldownDays > 0) {
                  return `Cooldown: ${cooldownDays} days left`;
                }
                
                // Otherwise show "Last Donation"
                return 'Last Donation';
              })()}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>{rewardPoints}</h3>
            <p>Reward Points</p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-main-content">
            {/* Urgent Requests Section */}
            <div className="urgent-requests-section">
              <h2>🚨 Urgent Blood Requests Near You</h2>
              {urgentRequests.length === 0 ? (
                <div className="empty-state">
                  <p>No urgent blood requests in your area at the moment.</p>
                </div>
              ) : (
                <div className="urgent-requests-grid">
                  {urgentRequests.map(request => (
                    <div key={request.id} className="urgent-request-card">
                      <div className="urgency-badge">{request.urgency === 'emergency' ? '🚨 Emergency' : '⚠️ Urgent'}</div>
                      <div className="request-details">
                        <h3>{request.bloodGroup} Blood Needed</h3>
                        <p><strong>Hospital:</strong> {request.hospitalName}</p>
                        <p><strong>Location:</strong> {request.city}, {request.state}</p>
                        <p><strong>Units:</strong> {request.unitsRequired}</p>
                        <p><strong>Required Date:</strong> {new Date(request.requiredDate).toLocaleDateString()}</p>
                        {request.patientCondition && (
                          <p><strong>Condition:</strong> {request.patientCondition}</p>
                        )}
                      </div>
                      <button 
                        className="btn-accept"
                        onClick={() => handleAcceptUrgentRequest(request.id)}
                      >
                        I'm Ready to Donate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                <Link to="/donate" className="action-card" onClick={(e) => {
                  e.preventDefault();
                  handleDonateClick();
                }}>
                  <div className="action-icon">💉</div>
                  <h3>Donate Blood</h3>
                  <p>Schedule a donation</p>
                </Link>
                <Link to="/request" className="action-card">
                  <div className="action-icon">🩸</div>
                  <h3>Request Blood</h3>
                  <p>Request blood for a patient</p>
                </Link>
                <div className="action-card" onClick={() => setActiveTab('events')}>
                  <div className="action-icon">📅</div>
                  <h3>Upcoming Events</h3>
                  <p>Find donation events</p>
                </div>
                <div className="action-card" onClick={handleAppointmentClick}>
                  <div className="action-icon">📋</div>
                  <h3>Manage Appointments</h3>
                  <p>Reschedule or cancel</p>
                </div>
              </div>
            </div>

            {/* Upcoming Donation Section */}
            {(() => {
              const upcoming = getUpcomingDonation();
              if (!upcoming) return null;
              
              const countdown = getDonationCountdown(upcoming);
              const dateTime = formatDonationDateTime(upcoming);
              
              return (
                <div className="upcoming-donation-section">
                  <h2>📅 Upcoming Donation</h2>
                  <div className="upcoming-donation-card">
                    <div className="donation-header">
                      <h3>{upcoming.eventName || upcoming.selectedOrganization || 'Blood Donation'}</h3>
                      <span className={`status-badge ${upcoming.status}`}>
                        {upcoming.status === 'approved' ? '✅ Approved' : 
                         upcoming.status === 'scheduled' ? '📅 Scheduled' : 
                         '⏳ Pending'}
                      </span>
                    </div>
                    
                    <div className="donation-details">
                      <div className="detail-row">
                        <span className="detail-label">📅 Date & Time:</span>
                        <span className="detail-value">
                          {dateTime.date}{dateTime.time}
                        </span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="detail-label">📍 Location:</span>
                        <span className="detail-value">
                          {upcoming.city && upcoming.state 
                            ? `${upcoming.city}, ${upcoming.state}`
                            : upcoming.address || 'Location TBD'}
                        </span>
                      </div>
                      
                      {upcoming.selectedOrganization && (
                        <div className="detail-row">
                          <span className="detail-label">🏥 Organization:</span>
                          <span className="detail-value">{upcoming.selectedOrganization}</span>
                        </div>
                      )}
                      
                      {upcoming.bloodGroup && (
                        <div className="detail-row">
                          <span className="detail-label">🩸 Blood Group:</span>
                          <span className="detail-value">{upcoming.bloodGroup}</span>
                        </div>
                      )}
                    </div>
                    
                    {countdown && (
                      <div className="countdown-timer">
                        <div className="countdown-label">⏰ Time Remaining:</div>
                        <div className="countdown-display">
                          {countdown.days > 0 && (
                            <span className="countdown-item">
                              <strong>{countdown.days}</strong> {countdown.days === 1 ? 'day' : 'days'}
                            </span>
                          )}
                          {countdown.hours > 0 && (
                            <span className="countdown-item">
                              <strong>{countdown.hours}</strong> {countdown.hours === 1 ? 'hour' : 'hours'}
                            </span>
                          )}
                          {countdown.days === 0 && countdown.hours === 0 && (
                            <span className="countdown-item">
                              <strong>{countdown.minutes}</strong> {countdown.minutes === 1 ? 'minute' : 'minutes'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="donation-footer">
                      <button 
                        className="btn-manage-appointment"
                        onClick={handleAppointmentClick}
                      >
                        📋 Manage Appointment
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Recent Donations */}
            <div className="recent-section">
              <h2>Recent Donations</h2>
              {(() => {
                // Filter out pending donations - only show approved, scheduled, completed, and cancelled donations
                const completedDonations = donations.filter(d => d.status !== 'pending');
                return completedDonations.length === 0 ? (
                  <div className="empty-state">
                    <p>You haven't made any donations yet.</p>
                  </div>
                ) : (
                  <div className="donations-list">
                    {completedDonations.slice(0, 5).map(donation => {
                    // Note: Review functionality needs backend API
                    const hasReviewed = false; // Will be implemented with backend
                    const canReview = donation.status === 'approved' && !hasReviewed;
                    // Can modify if donation is pending or approved with future date
                    const canModify = donation.status === 'pending' || 
                      (donation.status === 'approved' && donation.eventDate && new Date(donation.eventDate) > new Date());
                    
                    return (
                      <div key={donation.id} className="donation-item">
                        <div className="donation-date">
                          {new Date(donation.createdAt).toLocaleDateString()}
                        </div>
                        <div className="donation-details">
                          <p><strong>Blood Group:</strong> {donation.bloodGroup}</p>
                          <p><strong>Location:</strong> {donation.city}, {donation.state}</p>
                          {donation.eventName && (
                            <p><strong>Event:</strong> {donation.eventName}</p>
                          )}
                          {donation.eventDate && (
                            <p>
                              <strong>
                                {donation.status === 'completed' ? 'Completed Date:' : 'Event Date:'}
                              </strong>{' '}
                              {new Date(donation.eventDate).toLocaleDateString()}
                            </p>
                          )}
                          <p>
                            <strong>Status:</strong> 
                            <span className={`status-badge ${donation.status || 'pending'}`} style={{ marginLeft: '8px' }}>
                              {donation.status === 'approved' ? '✅ Approved' : 
                               donation.status === 'completed' ? '✅ Completed' :
                               donation.status === 'scheduled' ? '📅 Scheduled' :
                               donation.status === 'cancelled' ? '❌ Cancelled' : 
                               '⏳ Pending'}
                            </span>
                          </p>
                          <div className="donation-actions">
                            {canReview && (
                              <button 
                                className="btn-review"
                                onClick={() => handleReviewClick('donation', donation.id, donation.eventName || 'Donation')}
                              >
                                ⭐ Rate & Review (Earn 50 Points)
                              </button>
                            )}
                            {canModify && (
                              <>
                                <button 
                                  className="btn-edit"
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this donation?')) {
                                      try {
                                        await donationAPI.deleteDonation(donation.id);
                                        // Refresh donations
                                        const donationsResponse = await donationAPI.getAllDonations({ userId: currentUser.id });
                                        if (donationsResponse.success) {
                                          setDonations(donationsResponse.donations || []);
                                        }
                                      } catch (error) {
                                        alert(error.message || 'Failed to delete donation. Please try again.');
                                      }
                                    }
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                );
              })()}
            </div>

            {/* Request Status */}
            <div className="requests-section">
              <h2>Your Blood Requests</h2>
              {userRequests.length === 0 ? (
                <div className="empty-state">
                  <p>You haven't made any blood requests yet.</p>
                </div>
              ) : (
                <div className="requests-list">
                  {userRequests.map(request => {
                    // Note: Review functionality needs backend API
                    const hasReviewed = false; // Will be implemented with backend
                    const canReview = (request.status === 'fulfilled' || request.status === 'matched') && !hasReviewed;
                    // Can modify if request is pending
                    const canModify = request.status === 'pending';
                    
                    return (
                      <div key={request.id} className="request-item">
                        <div className="request-header">
                          <h3>{request.bloodGroup} - {request.unitsRequired} units</h3>
                          <span className={`status-badge ${request.status}`}>
                            {request.status === 'fulfilled' ? '✅ Fulfilled' : 
                             request.status === 'matched' ? '🔗 Matched' :
                             request.status === 'cancelled' ? '❌ Cancelled' : 
                             '⏳ Pending'}
                          </span>
                        </div>
                        <p><strong>Hospital:</strong> {request.hospitalName}</p>
                        <p><strong>Required Date:</strong> {new Date(request.requiredDate).toLocaleDateString()}</p>
                        <p><strong>Urgency:</strong> {request.urgency}</p>
                        {request.requestType && (
                          <p><strong>Request Type:</strong> {request.requestType === 'self' ? 'For Myself' : 'For Someone Else'}</p>
                        )}
                        <div className="request-actions">
                          {canReview && (
                            <button 
                              className="btn-review"
                              onClick={() => handleReviewClick('request', request.id, `Blood Request - ${request.bloodGroup}`)}
                            >
                              ⭐ Rate & Review (Earn 50 Points)
                            </button>
                          )}
                          {canModify && (
                            <button 
                              className="btn-edit"
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this request?')) {
                                  try {
                                    await requestAPI.deleteRequest(request.id);
                                    // Refresh request data
                                    await refreshRequestData();
                                  } catch (error) {
                                    alert(error.message || 'Failed to delete request. Please try again.');
                                  }
                                }
                              }}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="events-content">
            <h2>Upcoming Blood Donation Events Near You</h2>
            {events.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming events in your city at the moment.</p>
                <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#6c757d' }}>
                  Events will appear here when organizations in your city create donation drives.
                </p>
              </div>
            ) : (
              <div className="events-list">
                {events.map(event => {
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

                  const getEventLink = () => {
                    const params = new URLSearchParams({
                      event: event.id,
                      eventName: event.name,
                      eventDate: event.date,
                      isMultiDay: 'false'
                    });
                    return `/donate?${params.toString()}`;
                  };

                  return (
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
                      {event.orgName && (
                        <p className="event-org" style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '8px' }}>
                          <strong>Organized by:</strong> {event.orgName}
                        </p>
                      )}
                      <Link to={getEventLink()} className="btn btn-primary">
                        Register to Donate
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-content">
            <h2>Your Messages</h2>
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>You have no messages yet.</p>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map(message => (
                  <div key={message.id} className={`message-item ${!message.read ? 'unread' : ''}`}>
                    <div className="message-header">
                      <h3>{message.title || 'Message'}</h3>
                      <span className="message-date">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p>{message.message || message.content}</p>
                    {!message.read && (
                      <button 
                        className="btn-okay"
                        onClick={() => {
                          // Note: Message functionality needs backend API
                          // For now, just mark as read locally
                          const updatedMessages = messages.map(m => 
                            m.id === message.id ? { ...m, read: true } : m
                          );
                          setMessages(updatedMessages);
                        }}
                      >
                        Okay
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-content">
            <h2>Notifications</h2>
            {notifications.length === 0 ? (
              <div className="empty-state">
                <p>You have no notifications.</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map(notification => (
                  <div key={notification.id} className={`notification-item ${!notification.read ? 'unread' : ''}`}>
                    <div className="notification-icon">
                      {notification.type === 'precaution_24hr_after' ? '⚠️' : 
                       notification.type === 'donor_ready' ? '✅' : '🔔'}
                    </div>
                    <div className="notification-content">
                      <h3>{notification.title}</h3>
                      <p>{notification.message}</p>
                      <span className="notification-date">
                        {new Date(notification.createdAt || notification.id).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'organizations' && (
          <div className="organizations-content">
            <h2>Organizations Near You</h2>
            {organizations.length === 0 ? (
              <div className="empty-state">
                <p>No organizations found in your area.</p>
              </div>
            ) : (
              <div className="organizations-grid">
                {organizations.map(org => {
                  // Note: Review functionality needs backend API
                  const hasReviewed = false; // Will be implemented with backend
                  // Check if user has interacted (has donations/requests with this org)
                  const hasInteracted = donations.some(d => d.organizationId === org.id) || 
                    userRequests.some(r => r.organizationId === org.id);
                  const canReview = hasInteracted && !hasReviewed;
                  
                  return (
                    <div key={org.id} className="organization-card">
                      <div className="org-header">
                        <h3>{org.name}</h3>
                        <div className="org-rating">
                          <span className="stars">{'⭐'.repeat(Math.floor(org.rating))}</span>
                          <span className="rating-text">{org.rating.toFixed(1)} ({org.reviewCount} reviews)</span>
                        </div>
                      </div>
                      <p className="org-specialty"><strong>Specialty:</strong> {org.specialty}</p>
                      <p className="org-location">📍 {org.address}, {org.city}, {org.state}</p>
                      <p className="org-phone">📞 {org.phone}</p>
                      {canReview && (
                        <button 
                          className="btn-review"
                          onClick={() => handleReviewClick('organization', org.id, org.name)}
                        >
                          ⭐ Rate & Review (Earn 50 Points)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit-profile' && (
          <div className="edit-profile-content">
            <h2>Edit Profile</h2>
            <form className="edit-profile-form" onSubmit={handleSaveProfile}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-fullName">Full Name *</label>
                  <input
                    type="text"
                    id="edit-fullName"
                    name="fullName"
                    value={editProfileData.fullName}
                    onChange={handleEditProfileChange}
                    className={editProfileErrors.fullName ? 'error' : ''}
                  />
                  {editProfileErrors.fullName && <span className="error-message">{editProfileErrors.fullName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-email">Email Address *</label>
                  <input
                    type="email"
                    id="edit-email"
                    name="email"
                    value={editProfileData.email}
                    onChange={handleEditProfileChange}
                    className={editProfileErrors.email ? 'error' : ''}
                  />
                  {editProfileErrors.email && <span className="error-message">{editProfileErrors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="edit-phone"
                    name="phone"
                    value={editProfileData.phone}
                    onChange={handleEditProfileChange}
                    className={editProfileErrors.phone ? 'error' : ''}
                  />
                  {editProfileErrors.phone && <span className="error-message">{editProfileErrors.phone}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-dateOfBirth">Date of Birth *</label>
                  <input
                    type="date"
                    id="edit-dateOfBirth"
                    name="dateOfBirth"
                    value={editProfileData.dateOfBirth}
                    onChange={handleEditProfileChange}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    min={new Date(new Date().setFullYear(new Date().getFullYear() - 65)).toISOString().split('T')[0]}
                    className={editProfileErrors.dateOfBirth ? 'error' : ''}
                  />
                  {editProfileErrors.dateOfBirth && <span className="error-message">{editProfileErrors.dateOfBirth}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-gender">Gender *</label>
                  <select
                    id="edit-gender"
                    name="gender"
                    value={editProfileData.gender}
                    onChange={handleEditProfileChange}
                    className={editProfileErrors.gender ? 'error' : ''}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  {editProfileErrors.gender && <span className="error-message">{editProfileErrors.gender}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-bloodGroup">Blood Group *</label>
                  <select
                    id="edit-bloodGroup"
                    name="bloodGroup"
                    value={editProfileData.bloodGroup}
                    onChange={handleEditProfileChange}
                    className={editProfileErrors.bloodGroup ? 'error' : ''}
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                  {editProfileErrors.bloodGroup && <span className="error-message">{editProfileErrors.bloodGroup}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-address">Address *</label>
                <input
                  type="text"
                  id="edit-address"
                  name="address"
                  value={editProfileData.address}
                  onChange={handleEditProfileChange}
                  className={editProfileErrors.address ? 'error' : ''}
                />
                {editProfileErrors.address && <span className="error-message">{editProfileErrors.address}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-city">City *</label>
                  <input
                    type="text"
                    id="edit-city"
                    name="city"
                    value={editProfileData.city}
                    onChange={handleEditProfileChange}
                    className={editProfileErrors.city ? 'error' : ''}
                  />
                  {editProfileErrors.city && <span className="error-message">{editProfileErrors.city}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-state">State *</label>
                  <input
                    type="text"
                    id="edit-state"
                    name="state"
                    value={editProfileData.state}
                    onChange={handleEditProfileChange}
                    className={editProfileErrors.state ? 'error' : ''}
                  />
                  {editProfileErrors.state && <span className="error-message">{editProfileErrors.state}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-zipCode">Zip Code *</label>
                  <input
                    type="text"
                    id="edit-zipCode"
                    name="zipCode"
                    value={editProfileData.zipCode}
                    onChange={handleEditProfileChange}
                    className={editProfileErrors.zipCode ? 'error' : ''}
                  />
                  {editProfileErrors.zipCode && <span className="error-message">{editProfileErrors.zipCode}</span>}
                </div>
              </div>

              <div className="form-section-divider">
                <h3>Change Password (Optional)</h3>
                <p>Leave blank if you don't want to change your password</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-password">New Password</label>
                  <input
                    type="password"
                    id="edit-password"
                    name="password"
                    value={editProfileData.password}
                    onChange={handleEditProfileChange}
                    placeholder="Leave blank to keep current password"
                    className={editProfileErrors.password ? 'error' : ''}
                  />
                  {editProfileErrors.password && <span className="error-message">{editProfileErrors.password}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="edit-confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="edit-confirmPassword"
                    name="confirmPassword"
                    value={editProfileData.confirmPassword}
                    onChange={handleEditProfileChange}
                    placeholder="Confirm new password"
                    className={editProfileErrors.confirmPassword ? 'error' : ''}
                  />
                  {editProfileErrors.confirmPassword && <span className="error-message">{editProfileErrors.confirmPassword}</span>}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setActiveTab('dashboard')}
                  disabled={isSavingProfile}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon success-icon">✓</div>
            <h3>Success!</h3>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Donations History Modal */}
      {showDonationsHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowDonationsHistoryModal(false)}>
          <div className="modal donations-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Donation History</h2>
              <button className="modal-close" onClick={() => setShowDonationsHistoryModal(false)}>✕</button>
            </div>
            <div className="donations-history-content">
              {(() => {
                // Show completed donations (actual donations) - these are counted in total
                const currentUserId = userData?.id || currentUser?.id;
                const completedDonations = donations.filter(d => 
                  d.userId === currentUserId &&
                  d.status === 'completed'
                );
                
                if (completedDonations.length === 0) {
                  return (
                    <div className="empty-state">
                      <p>No donation history available. Complete donations will appear here.</p>
                    </div>
                  );
                }
                
                // Sort by date (most recent first)
                const sortedDonations = [...completedDonations].sort((a, b) => {
                  const dateA = new Date(a.eventDate || a.scheduledDate || a.createdAt || a.updatedAt);
                  const dateB = new Date(b.eventDate || b.scheduledDate || b.createdAt || b.updatedAt);
                  return dateB - dateA;
                });

                return (
                  <div className="donations-list">
                    {sortedDonations.map(donation => {
                      const donationDate = new Date(donation.eventDate || donation.scheduledDate || donation.createdAt || donation.updatedAt);
                      const donationTime = donation.eventDate 
                        ? new Date(donation.eventDate).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : (donation.scheduledTime || donation.preferredTime || '');
                      const organizationName = donation.selectedOrganization || donation.eventName || 'Local Blood Bank';
                      const donationType = donation.donationType || 'Whole Blood';
                      
                      return (
                        <div key={donation.id} className="donation-history-item" style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '20px',
                          marginBottom: '15px',
                          backgroundColor: '#fff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                            <div className="donation-icon" style={{ 
                              fontSize: '2.5rem',
                              flexShrink: 0
                            }}>💉</div>
                            <div className="donation-details" style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'flex-start',
                                marginBottom: '12px'
                              }}>
                                <h4 style={{ margin: 0, color: '#333', fontSize: '1.2rem' }}>{donationType}</h4>
                                <span className={`status-badge ${donation.status}`} style={{
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '0.85rem',
                                  backgroundColor: '#4caf50',
                                  color: 'white',
                                  fontWeight: '500'
                                }}>
                                  ✅ Completed
                                </span>
                              </div>
                              
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '10px',
                                marginTop: '10px'
                              }}>
                                <div>
                                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                    <strong style={{ color: '#666' }}>📅 Date:</strong>{' '}
                                    <span style={{ color: '#333' }}>
                                      {donationDate.toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric',
                                        weekday: 'long'
                                      })}
                                    </span>
                                  </p>
                                </div>
                                
                                {donationTime && (
                                  <div>
                                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                      <strong style={{ color: '#666' }}>⏰ Time:</strong>{' '}
                                      <span style={{ color: '#333' }}>{donationTime}</span>
                                    </p>
                                  </div>
                                )}
                                
                                <div>
                                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                    <strong style={{ color: '#666' }}>🏥 Organization:</strong>{' '}
                                    <span style={{ color: '#333' }}>{organizationName}</span>
                                  </p>
                                </div>
                                
                                {donation.bloodGroup && (
                                  <div>
                                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                      <strong style={{ color: '#666' }}>🩸 Blood Group:</strong>{' '}
                                      <span style={{ color: '#333' }}>{donation.bloodGroup}</span>
                                    </p>
                                  </div>
                                )}
                                
                                {donation.city && donation.state && (
                                  <div>
                                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                      <strong style={{ color: '#666' }}>📍 Location:</strong>{' '}
                                      <span style={{ color: '#333' }}>{donation.city}, {donation.state}</span>
                                    </p>
                                  </div>
                                )}
                                
                                {donation.address && (
                                  <div>
                                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                      <strong style={{ color: '#666' }}>🏠 Address:</strong>{' '}
                                      <span style={{ color: '#333' }}>{donation.address}</span>
                                    </p>
                                  </div>
                                )}
                                
                                {donation.eventName && (
                                  <div>
                                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                      <strong style={{ color: '#666' }}>🎉 Event:</strong>{' '}
                                      <span style={{ color: '#333' }}>{donation.eventName}</span>
                                    </p>
                                  </div>
                                )}
                                
                                {donation.requestId && (
                                  <div>
                                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                      <strong style={{ color: '#666' }}>🚨 Type:</strong>{' '}
                                      <span style={{ color: '#333' }}>Emergency Request Donation</span>
                                    </p>
                                  </div>
                                )}
                                
                                {donation.units && (
                                  <div>
                                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                                      <strong style={{ color: '#666' }}>📊 Units:</strong>{' '}
                                      <span style={{ color: '#333' }}>{donation.units}</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <div style={{ 
                                marginTop: '12px', 
                                paddingTop: '12px', 
                                borderTop: '1px solid #e0e0e0',
                                fontSize: '0.85rem',
                                color: '#666'
                              }}>
                                <p style={{ margin: '4px 0' }}>
                                  <strong>Donation ID:</strong> #{String(donation.id).padStart(6, '0')}
                                </p>
                                <p style={{ margin: '4px 0' }}>
                                  <strong>Completed:</strong>{' '}
                                  {new Date(donation.updatedAt || donation.createdAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="modal-buttons">
              <button className="modal-btn" onClick={() => setShowDonationsHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Donate Error Modal */}
      {showDonateModal && (
        <div className="modal-overlay" onClick={() => setShowDonateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⏳</div>
            <h3>Donation Cooldown</h3>
            <p>{donateError}</p>
            <button className="modal-btn" onClick={() => setShowDonateModal(false)}>Okay</button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && reviewItem && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⭐</div>
            <h3>Rate & Review</h3>
            <p><strong>{reviewItem.itemName}</strong></p>
            <div className="rating-input">
              <label>Rating:</label>
              <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                <option value={5}>5 ⭐⭐⭐⭐⭐</option>
                <option value={4}>4 ⭐⭐⭐⭐</option>
                <option value={3}>3 ⭐⭐⭐</option>
                <option value={2}>2 ⭐⭐</option>
                <option value={1}>1 ⭐</option>
              </select>
            </div>
            <div className="review-comment">
              <label>Comment (optional):</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows="4"
                placeholder="Share your experience..."
              />
            </div>
            <div className="modal-buttons">
              <button className="modal-btn" onClick={handleSubmitReview}>Submit Review</button>
              <button className="modal-btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Management Modal */}
      {showAppointmentModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAppointmentModal(false);
          setSelectedAppointment(null);
          setRescheduleDate('');
          setRescheduleTime('');
        }}>
          <div className="modal appointment-modal" onClick={(e) => e.stopPropagation()}>
            {!selectedAppointment ? (
              <>
                <div className="modal-icon">📋</div>
                <h3>Manage Appointments</h3>
                {scheduledAppointments.length === 0 ? (
                  <p>You have no scheduled appointments.</p>
                ) : (
                  <div className="appointments-list">
                    {scheduledAppointments.map(appointment => {
                      const appointmentDate = new Date(appointment.date);
                      const hoursUntil = (appointmentDate - new Date()) / (1000 * 60 * 60);
                      // Can modify if more than 24 hours away
                      const canModify = hoursUntil > 24;
                      
                      return (
                        <div key={appointment.id} className="appointment-item">
                          <div className="appointment-info">
                            <h4>{appointment.eventName}</h4>
                            <p><strong>Date:</strong> {appointmentDate.toLocaleDateString()}</p>
                            {appointment.time && (
                              <p><strong>Time:</strong> {appointment.time}</p>
                            )}
                            {appointment.hospitalName && (
                              <p><strong>Hospital:</strong> {appointment.hospitalName}</p>
                            )}
                            <p><strong>Location:</strong> {appointment.location}</p>
                            <p><strong>Status:</strong> 
                              <span className={`status-badge ${appointment.status}`} style={{ marginLeft: '8px' }}>
                                {appointment.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
                              </span>
                            </p>
                            {/* Show reschedule request status if exists */}
                            {appointment.data?.rescheduleRequests && appointment.data.rescheduleRequests.length > 0 && (
                              <div style={{ 
                                marginTop: '8px', 
                                padding: '8px', 
                                borderRadius: '4px',
                                backgroundColor: appointment.data.rescheduleRequests[0].status === 'pending' ? '#fff3cd' : 
                                                appointment.data.rescheduleRequests[0].status === 'approved' ? '#d4edda' : '#f8d7da',
                                fontSize: '13px'
                              }}>
                                {appointment.data.rescheduleRequests[0].status === 'pending' && (
                                  <span style={{ color: '#856404' }}>⏳ Reschedule request pending approval</span>
                                )}
                                {appointment.data.rescheduleRequests[0].status === 'approved' && (
                                  <span style={{ color: '#155724' }}>✅ Reschedule approved</span>
                                )}
                                {appointment.data.rescheduleRequests[0].status === 'rejected' && (
                                  <span style={{ color: '#721c24' }}>❌ Reschedule rejected</span>
                                )}
                              </div>
                            )}
                            {!canModify && hoursUntil < 24 && (
                              <p className="modify-warning">⚠️ Cannot modify within 24 hours of appointment</p>
                            )}
                          </div>
                          {canModify && (
                            <div className="appointment-actions">
                              <button 
                                className="btn-reschedule"
                                onClick={() => handleRescheduleAppointment(appointment)}
                              >
                                📅 Reschedule
                              </button>
                              <button 
                                className="btn-cancel-appt"
                                onClick={() => handleCancelAppointment(appointment)}
                              >
                                ❌ Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="modal-buttons">
                  <button className="modal-btn" onClick={() => {
                    setShowAppointmentModal(false);
                  }}>Close</button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-icon">📅</div>
                <h3>Reschedule Appointment</h3>
                <p><strong>{selectedAppointment.eventName}</strong></p>
                <p>Current Date: {new Date(selectedAppointment.date).toLocaleDateString()}</p>
                <div className="rating-input">
                  <label>New Date *</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => {
                      setRescheduleDate(e.target.value);
                      setRescheduleTime(''); // Clear time when date changes
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                {selectedAppointment.type === 'donation' && rescheduleDate && (
                  <div className="rating-input">
                    <label>New Time Slot *</label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
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
                {/* Show reschedule request status if exists */}
                {selectedAppointment.data?.rescheduleRequests && selectedAppointment.data.rescheduleRequests.length > 0 && (
                  <div className="reschedule-status" style={{ 
                    padding: '10px', 
                    margin: '10px 0', 
                    borderRadius: '5px',
                    backgroundColor: '#f0f0f0'
                  }}>
                    {(() => {
                      const latestRequest = selectedAppointment.data.rescheduleRequests[0];
                      if (latestRequest.status === 'pending') {
                        return (
                          <div style={{ color: '#ff9800' }}>
                            ⏳ <strong>Reschedule Request Pending</strong>
                            <p style={{ margin: '5px 0', fontSize: '14px' }}>
                              Your reschedule request is waiting for organization approval.
                            </p>
                            <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                              Requested: {latestRequest.newDate} {latestRequest.newTime ? `at ${latestRequest.newTime}` : ''}
                            </p>
                          </div>
                        );
                      } else if (latestRequest.status === 'approved') {
                        return (
                          <div style={{ color: '#4caf50' }}>
                            ✅ <strong>Reschedule Approved</strong>
                            <p style={{ margin: '5px 0', fontSize: '14px' }}>
                              Your reschedule request has been approved. The appointment date has been updated.
                            </p>
                          </div>
                        );
                      } else if (latestRequest.status === 'rejected') {
                        return (
                          <div style={{ color: '#f44336' }}>
                            ❌ <strong>Reschedule Rejected</strong>
                            <p style={{ margin: '5px 0', fontSize: '14px' }}>
                              Your reschedule request was rejected.
                              {latestRequest.rejectionReason && ` Reason: ${latestRequest.rejectionReason}`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                <div className="modal-buttons">
                  <button className="modal-btn" onClick={handleSubmitReschedule}>Confirm Reschedule</button>
                  <button className="modal-btn-secondary" onClick={() => {
                    setSelectedAppointment(null);
                    setRescheduleDate('');
                    setRescheduleTime('');
                  }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reschedule Success Modal */}
      {showRescheduleSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowRescheduleSuccessModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">✅</div>
            <h3>Reschedule Request Submitted</h3>
            <p>Your reschedule request has been submitted to the organization. You will be notified once they review and approve it.</p>
            <div className="modal-buttons">
              <button className="modal-btn" onClick={() => setShowRescheduleSuccessModal(false)}>Okay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;





