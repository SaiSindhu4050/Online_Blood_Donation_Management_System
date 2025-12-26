import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentOrganization, clearCurrentOrganization } from '../../utils/storage';
import { 
  organizationAPI, 
  donationAPI, 
  requestAPI, 
  eventAPI, 
  authAPI 
} from '../../utils/api';
import Navbar from '../../components/Navbar/Navbar';
import './OrganizationDashboard.css';

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const [currentOrg, setCurrentOrg] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [pendingDonations, setPendingDonations] = useState([]);
  const [approvedDonations, setApprovedDonations] = useState([]);
  const [completedDonations, setCompletedDonations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [selectedDonationType, setSelectedDonationType] = useState('All');
  const [selectedBloodType, setSelectedBloodType] = useState('All');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDonationsModal, setShowDonationsModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [approvalFormData, setApprovalFormData] = useState({
    donationType: 'Whole Blood',
    units: 1,
    expirationDate: ''
  });
  const [eventFormData, setEventFormData] = useState({
    name: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    maxRegistrations: ''
  });

  useEffect(() => {
    const loadOrgData = async () => {
      const org = getCurrentOrganization();
      if (!org || !org.token) {
        navigate('/org-login');
        return;
      }

      try {
        setCurrentOrg(org);
        
        // Get organization profile from API
        const profileResponse = await authAPI.getMe();
        if (profileResponse.success && profileResponse.organization) {
          setOrgData(profileResponse.organization);
        }

        // Load dashboard data
        await loadDashboardData();
      } catch (error) {
        console.error('Error loading organization data:', error);
        if (error.message.includes('Unauthorized') || error.message.includes('token')) {
          navigate('/org-login');
        }
      }
    };

    loadOrgData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get organization dashboard data (includes all donations filtered by organization)
      const dashboardResponse = await organizationAPI.getDashboard();
      if (dashboardResponse.success) {
        const dashboard = dashboardResponse.dashboard;
        // Set donations filtered by organization (all statuses)
        setPendingDonations(dashboard.pendingDonations || []);
        setApprovedDonations(dashboard.approvedDonations || []);
        setCompletedDonations(dashboard.completedDonations || []);
        setPendingRequests(dashboard.pendingRequests || []);
        setEvents(dashboard.events || []);
      }

      // Also load donations via getAllDonations for additional filtering if needed
      // This will automatically filter by organization when called by organization user
      const donationsResponse = await donationAPI.getAllDonations();
      if (donationsResponse.success) {
        const allDonations = donationsResponse.donations || [];
        // Update state only if dashboard didn't provide data
        if (!dashboardResponse.success || !dashboardResponse.dashboard?.pendingDonations) {
          setPendingDonations(allDonations.filter(d => d.status === 'pending'));
        }
        if (!dashboardResponse.success || !dashboardResponse.dashboard?.approvedDonations) {
          setApprovedDonations(allDonations.filter(d => d.status === 'approved' || d.status === 'scheduled'));
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const inventoryResponse = await organizationAPI.getInventory();
      if (inventoryResponse.success) {
        setInventory(inventoryResponse.inventory || []);
        setInventorySummary(inventoryResponse.summary || null);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const loadRescheduleRequests = async () => {
    try {
      const response = await organizationAPI.getRescheduleRequests();
      if (response.success) {
        setRescheduleRequests(response.rescheduleRequests || []);
      }
    } catch (error) {
      console.error('Error loading reschedule requests:', error);
    }
  };

  const handleRescheduleRequest = async (requestId, action, rejectionReason = null) => {
    if (action === 'approve') {
      if (!window.confirm('Are you sure you want to approve this reschedule request?')) {
        return;
      }
    } else {
      if (!window.confirm('Are you sure you want to reject this reschedule request?')) {
        return;
      }
    }

    try {
      const response = await organizationAPI.handleRescheduleRequest(requestId, action, rejectionReason);
      if (response.success) {
        alert(action === 'approve' 
          ? 'Reschedule request approved successfully. The donation date has been updated.' 
          : 'Reschedule request rejected.');
        await loadRescheduleRequests();
        await loadDashboardData(); // Refresh donations to show updated dates
      }
    } catch (error) {
      alert(error.message || `Failed to ${action} reschedule request. Please try again.`);
    }
  };

  const handleApproveDonation = (donation) => {
    setSelectedDonation(donation);
    setApprovalFormData({
      donationType: 'Whole Blood',
      units: 1,
      expirationDate: ''
    });
    setShowApprovalModal(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedDonation) return;
    
    if (!approvalFormData.units || approvalFormData.units < 1) {
      alert('Please enter a valid number of units (at least 1)');
      return;
    }

    try {
      // Calculate expiration date if not provided
      let expirationDate = approvalFormData.expirationDate;
      if (!expirationDate) {
        const today = new Date();
        let daysToExpire = 42; // Default for Whole Blood
        
        if (approvalFormData.donationType === 'Plasma') {
          daysToExpire = 365;
        } else if (approvalFormData.donationType === 'Platelets') {
          daysToExpire = 5;
        } else if (approvalFormData.donationType === 'Cryo') {
          daysToExpire = 365;
        } else if (approvalFormData.donationType === 'White Cells') {
          daysToExpire = 1;
        } else if (approvalFormData.donationType === 'Granulocytes') {
          daysToExpire = 1;
        } else if (approvalFormData.donationType === 'Red Blood Cells') {
          daysToExpire = 42;
        } else if (approvalFormData.donationType === 'Double Red Cells') {
          daysToExpire = 42;
        }
        
        today.setDate(today.getDate() + daysToExpire);
        expirationDate = today.toISOString().split('T')[0];
      }

      // Update donation status via API
      await donationAPI.updateDonationStatus(
        selectedDonation.id, 
        'approved', 
        null, 
        null,
        {
          donationType: approvalFormData.donationType,
          units: approvalFormData.units,
          expirationDate: expirationDate
        }
      );
      
      setShowApprovalModal(false);
      setSelectedDonation(null);
      await loadDashboardData();
    } catch (error) {
      alert(error.message || 'Failed to approve donation. Please try again.');
    }
  };

  const handleDenyDonation = async (donationId) => {
    if (window.confirm('Are you sure you want to deny this donation?')) {
      try {
        // Use 'cancelled' instead of 'denied' (valid ENUM value)
        await donationAPI.updateDonationStatus(donationId, 'cancelled');
        await loadDashboardData();
      } catch (error) {
        alert(error.message || 'Failed to deny donation. Please try again.');
      }
    }
  };

  const handleMarkCustomerPresent = async (donationId) => {
    if (window.confirm('Mark this customer as present and complete the donation?')) {
      try {
        const response = await donationAPI.markDonationCompleted(donationId);
        if (response.success) {
          alert('Donation marked as completed successfully!');
          await loadDashboardData();
        }
      } catch (error) {
        alert(error.message || 'Failed to mark donation as completed. Please try again.');
      }
    }
  };

  // Check if donation can be marked as completed (1 hour before to 2 days after appointment)
  const canMarkAsCompleted = (donation) => {
    const appointmentDate = donation.eventDate || donation.scheduledDate;
    if (!appointmentDate) return false;

    const appointmentDateTime = new Date(appointmentDate);
    const appointmentTime = donation.scheduledTime || donation.preferredTime;
    if (appointmentTime) {
      const [hours, minutes] = appointmentTime.split(':');
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      appointmentDateTime.setHours(0, 0, 0, 0);
    }

    const now = new Date();
    const oneHourBefore = new Date(appointmentDateTime);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    
    const twoDaysAfter = new Date(appointmentDateTime);
    twoDaysAfter.setDate(twoDaysAfter.getDate() + 2);
    twoDaysAfter.setHours(23, 59, 59, 999);

    return now >= oneHourBefore && now <= twoDaysAfter;
  };

  const handleApproveRequest = async (requestId) => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return;

    if (window.confirm(`Are you sure you want to approve this request for ${request.unitsRequired} units of ${request.bloodGroup}?`)) {
      try {
        // Update request status to 'fulfilled' (valid ENUM value) when organization approves
        await requestAPI.updateRequestStatus(requestId, 'fulfilled');
        await loadDashboardData();
      } catch (error) {
        alert(error.message || 'Failed to approve request. Please check inventory.');
      }
    }
  };

  const handleAcceptRequestAndDonation = async (requestId, donationId) => {
    const request = pendingRequests.find(r => r.id === requestId);
    const donation = request?.interestedDonations?.find(d => d.id === donationId);
    
    if (!request || !donation) return;

    if (window.confirm(`Accept this peer-to-peer donation? User ${donation.user?.fullName || donation.fullName} will donate directly to fulfill the request. Organization inventory will remain unchanged.`)) {
      try {
        await organizationAPI.acceptRequestAndDonation(requestId, donationId);
        alert('Request and donation accepted successfully! This is a peer-to-peer donation, so inventory remains unchanged.');
        await loadDashboardData();
      } catch (error) {
        alert(error.message || 'Failed to accept request and donation. Please try again.');
      }
    }
  };

  const handleDenyRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to deny this request?')) {
      try {
        // Use 'cancelled' instead of 'denied' (valid ENUM value)
        await requestAPI.updateRequestStatus(requestId, 'cancelled');
        await loadDashboardData();
      } catch (error) {
        alert(error.message || 'Failed to deny request. Please try again.');
      }
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    try {
      const newEvent = {
        name: eventFormData.name,
        date: eventFormData.date,
        startTime: eventFormData.startTime,
        endTime: eventFormData.endTime,
        location: eventFormData.location,
        description: eventFormData.description || null,
        maxRegistrations: eventFormData.maxRegistrations ? parseInt(eventFormData.maxRegistrations) : null
      };

      const response = await eventAPI.createEvent(newEvent);
      if (response.success) {
        await loadDashboardData();
        setShowEventModal(false);
        setEventFormData({
          name: '',
          date: '',
          startTime: '',
          endTime: '',
          location: '',
          description: '',
          maxRegistrations: ''
        });
      }
    } catch (error) {
      alert(error.message || 'Failed to create event. Please try again.');
    }
  };

  const handleViewEventDetails = async (event) => {
    setSelectedEvent(event);
    try {
      const response = await eventAPI.getEventRegistrations(event.id);
      if (response.success) {
        // Store registrations in selectedEvent for display
        setSelectedEvent({ ...event, registrations: response.registrations || [] });
      }
    } catch (error) {
      console.error('Error loading event registrations:', error);
    }
    setShowEventDetailsModal(true);
  };

  const handleLogout = () => {
    clearCurrentOrganization();
    navigate('/org-login');
  };

  // Calculate stats from current state
  const totalCompletedDonations = completedDonations.length; // Count completed donations
  const totalPendingDonations = pendingDonations.length;
  const totalPendingRequests = pendingRequests.length;
  const totalEvents = events.length;
  // Note: totalRegistrations would need to be calculated from API data
  const totalRegistrations = 0; // Will be updated when events are loaded with registration counts

  if (!currentOrg) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="org-dashboard">
      <Navbar />
      <div className="org-dashboard-container">
        <div className="org-dashboard-header">
          <div>
            <h1>Organization Dashboard</h1>
            <p>Welcome back, {orgData?.name || 'Organization'}</p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="org-dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'donations' ? 'active' : ''}`}
            onClick={() => setActiveTab('donations')}
          >
            Donations ({totalPendingDonations})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests ({totalPendingRequests})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
            <button
              className={`tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('storage');
                loadInventory(); // Load inventory when storage tab is clicked
              }}
            >
              Storage
            </button>
            <button
              className={`tab-btn ${activeTab === 'reschedules' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('reschedules');
                loadRescheduleRequests(); // Load reschedule requests when tab is clicked
              }}
            >
              Reschedules {rescheduleRequests.length > 0 && `(${rescheduleRequests.length})`}
            </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="org-dashboard-content">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🩸</div>
                <div className="stat-content">
                  <h3>{totalCompletedDonations}</h3>
                  <p>Total Donations</p>
                </div>
              </div>
              <div className="stat-card clickable" onClick={() => setActiveTab('donations')}>
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <h3>{totalPendingDonations}</h3>
                  <p>Pending Donations</p>
                </div>
              </div>
              <div className="stat-card clickable" onClick={() => setActiveTab('requests')}>
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <h3>{totalPendingRequests}</h3>
                  <p>Pending Requests</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h3>{totalEvents}</h3>
                  <p>Total Events</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>{totalRegistrations}</h3>
                  <p>Event Registrations</p>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="action-buttons">
                <button className="action-btn" onClick={() => setShowEventModal(true)}>
                  ➕ Create New Event
                </button>
                <button className="action-btn" onClick={() => setActiveTab('donations')}>
                  📋 Review Donations
                </button>
                <button className="action-btn" onClick={() => setActiveTab('requests')}>
                  📝 Review Requests
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'donations' && (
          <div className="org-dashboard-content">
            <div className="section-header">
              <h2>Donations</h2>
              <p>Review and manage donation appointments</p>
            </div>
            
            {/* Approved/Scheduled Donations - Can mark as completed */}
            {approvedDonations.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', color: '#333' }}>Approved Appointments</h3>
                <div className="items-list">
                  {approvedDonations.map(donation => {
                    const canMark = canMarkAsCompleted(donation);
                    const appointmentDate = donation.eventDate || donation.scheduledDate;
                    const appointmentTime = donation.scheduledTime || donation.preferredTime;
                    
                    return (
                      <div key={donation.id} className="item-card" style={{ 
                        borderLeft: '4px solid #4caf50',
                        backgroundColor: canMark ? '#f0f9f0' : '#f9f9f9'
                      }}>
                        <div className="item-header">
                          <h3>Donation #{String(donation.id).slice(-6)}</h3>
                          <span className="status-badge" style={{ 
                            backgroundColor: donation.status === 'approved' ? '#4caf50' : '#2196f3',
                            color: 'white'
                          }}>
                            {donation.status === 'approved' ? '✅ Approved' : '📅 Scheduled'}
                          </span>
                        </div>
                        <div className="item-details">
                          <p><strong>Donor:</strong> {donation.user?.fullName || donation.fullName}</p>
                          <p><strong>Blood Group:</strong> {donation.bloodGroup}</p>
                          {appointmentDate && (
                            <p>
                              <strong>
                                {donation.status === 'completed' ? 'Donation Date:' : 'Appointment Date:'}
                              </strong>{' '}
                              {new Date(appointmentDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                          {appointmentTime && donation.status !== 'completed' && (
                            <p><strong>Appointment Time:</strong> {appointmentTime}</p>
                          )}
                          {donation.status === 'completed' && appointmentDate && (
                            <p>
                              <strong>Donation Time:</strong>{' '}
                              {new Date(appointmentDate).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                          {donation.eventName && <p><strong>Event:</strong> {donation.eventName}</p>}
                          <p><strong>Location:</strong> {donation.city}, {donation.state}</p>
                          {!canMark && appointmentDate && (
                            <p style={{ color: '#ff9800', marginTop: '8px', fontSize: '13px' }}>
                              ⏰ {(() => {
                                const appointmentDateTime = new Date(appointmentDate);
                                const time = donation.scheduledTime || donation.preferredTime;
                                if (time) {
                                  const [hours, minutes] = time.split(':');
                                  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                }
                                const now = new Date();
                                const oneHourBefore = new Date(appointmentDateTime);
                                oneHourBefore.setHours(oneHourBefore.getHours() - 1);
                                const twoDaysAfter = new Date(appointmentDateTime);
                                twoDaysAfter.setDate(twoDaysAfter.getDate() + 2);
                                
                                if (now < oneHourBefore) {
                                  const hoursUntil = Math.ceil((oneHourBefore - now) / (1000 * 60 * 60));
                                  return `Can mark as completed in ${hoursUntil} hour(s)`;
                                } else {
                                  const daysPast = Math.floor((now - twoDaysAfter) / (1000 * 60 * 60 * 24));
                                  return `Time window expired ${daysPast} day(s) ago`;
                                }
                              })()}
                            </p>
                          )}
                        </div>
                        <div className="item-actions">
                          {canMark ? (
                            <button 
                              className="btn-approve"
                              onClick={() => handleMarkCustomerPresent(donation.id)}
                              style={{ backgroundColor: '#4caf50' }}
                            >
                              ✅ Mark Customer Present
                            </button>
                          ) : (
                            <button 
                              className="btn-approve"
                              disabled
                              style={{ backgroundColor: '#ccc', cursor: 'not-allowed' }}
                            >
                              ⏰ Not Available
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Donations */}
            {completedDonations.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', color: '#333' }}>Completed Donations</h3>
                <div className="items-list">
                  {completedDonations.map(donation => {
                    const donationDate = donation.eventDate || donation.scheduledDate;
                    
                    return (
                      <div key={donation.id} className="item-card" style={{ 
                        borderLeft: '4px solid #28a745',
                        backgroundColor: '#f0f9f0'
                      }}>
                        <div className="item-header">
                          <h3>Donation #{String(donation.id).slice(-6)}</h3>
                          <span className="status-badge" style={{ 
                            backgroundColor: '#28a745',
                            color: 'white'
                          }}>
                            ✅ Completed
                          </span>
                        </div>
                        <div className="item-details">
                          <p><strong>Donor:</strong> {donation.user?.fullName || donation.fullName}</p>
                          <p><strong>Blood Group:</strong> {donation.bloodGroup}</p>
                          {donationDate && (
                            <p>
                              <strong>Donation Date:</strong>{' '}
                              {new Date(donationDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                          {donationDate && (
                            <p>
                              <strong>Donation Time:</strong>{' '}
                              {new Date(donationDate).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                          {donation.eventName && <p><strong>Event:</strong> {donation.eventName}</p>}
                          <p><strong>Location:</strong> {donation.city}, {donation.state}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending Donations */}
            <div>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>Pending Donations</h3>
            {pendingDonations.length === 0 ? (
              <div className="empty-state">
                <p>No pending donations at this time.</p>
              </div>
            ) : (
              <div className="items-list">
                {pendingDonations.map(donation => (
                  <div key={donation.id} className="item-card">
                    <div className="item-header">
                      <h3>Donation Request #{String(donation.id).slice(-6)}</h3>
                      <span className="status-badge pending">Pending</span>
                    </div>
                    <div className="item-details">
                      <p><strong>Donor:</strong> {donation.user?.fullName || donation.fullName}</p>
                      <p><strong>Blood Group:</strong> {donation.bloodGroup}</p>
                      <p><strong>Location:</strong> {donation.city}, {donation.state}</p>
                      {donation.eventName && <p><strong>Event:</strong> {donation.eventName}</p>}
                      {donation.preferredDate && (
                        <p>
                          <strong>Preferred Date:</strong>{' '}
                          {new Date(donation.preferredDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                      {donation.preferredTime && (
                        <p><strong>Preferred Time:</strong> {donation.preferredTime}</p>
                      )}
                      <p><strong>Created:</strong> {new Date(donation.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                    </div>
                    <div className="item-actions">
                      <button 
                        className="btn-approve"
                        onClick={() => handleApproveDonation(donation)}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className="btn-deny"
                        onClick={() => handleDenyDonation(donation.id)}
                      >
                        ❌ Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="org-dashboard-content">
            <div className="section-header">
              <h2>Pending Requests</h2>
              <p>Review and approve or deny blood requests</p>
            </div>
            {pendingRequests.length === 0 ? (
              <div className="empty-state">
                <p>No pending requests at this time.</p>
              </div>
            ) : (
              <div className="items-list">
                {pendingRequests.map(request => (
                  <div key={request.id} className="item-card">
                    <div className="item-header">
                      <h3>Blood Request #{String(request.id).slice(-6)}</h3>
                      <span className="status-badge pending">Pending</span>
                    </div>
                    <div className="item-details">
                      <p><strong>Blood Group:</strong> {request.bloodGroup}</p>
                      <p><strong>Quantity:</strong> {request.unitsRequired} units</p>
                      <p><strong>Hospital:</strong> {request.hospitalName}</p>
                      <p><strong>Location:</strong> {request.city}, {request.state}</p>
                      {request.requiredDate && (
                        <p><strong>Required Date:</strong> {new Date(request.requiredDate).toLocaleDateString()}</p>
                      )}
                      {request.urgency && (
                        <p><strong>Urgency:</strong> <span className="urgency-badge">{request.urgency}</span></p>
                      )}
                      <p><strong>Created:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                      
                      {/* Show interested donors */}
                      {request.interestedDonations && request.interestedDonations.length > 0 && (
                        <div className="interested-donors" style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '5px' }}>
                          <p><strong>Interested Donors ({request.interestedDonations.length}):</strong></p>
                          {request.interestedDonations.map(donation => (
                            <div key={donation.id} className="donor-item" style={{ marginTop: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '3px' }}>
                              <p style={{ margin: '4px 0' }}>
                                <strong>{donation.user?.fullName || donation.fullName}</strong> 
                                {donation.user?.email && <span> ({donation.user.email})</span>}
                                {donation.user?.phone && <span> - {donation.user.phone}</span>}
                              </p>
                              <button 
                                className="btn-approve"
                                style={{ marginTop: '5px' }}
                                onClick={() => handleAcceptRequestAndDonation(request.id, donation.id)}
                              >
                                ✅ Accept Donor & Fulfill Request
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="item-actions">
                      <button 
                        className="btn-approve"
                        onClick={() => handleApproveRequest(request.id)}
                      >
                        ✅ Approve (From Inventory)
                      </button>
                      <button 
                        className="btn-deny"
                        onClick={() => handleDenyRequest(request.id)}
                      >
                        ❌ Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="org-dashboard-content">
            <div className="section-header">
              <h2>Blood Inventory</h2>
              <p>Manage your blood bank inventory</p>
            </div>
            {(() => {
              const now = new Date();
              
              // Filter expired items
              const activeInventory = inventory.filter(item => new Date(item.expirationDate) > now);
              const expiredInventory = inventory.filter(item => new Date(item.expirationDate) <= now);
              
              // Get unique values for dropdowns
              const uniqueDonationTypes = [...new Set(activeInventory.map(item => item.donationType))];
              const donationTypeOptions = ['All', ...uniqueDonationTypes.sort()];
              
              const uniqueBloodGroups = [...new Set(activeInventory.map(item => item.bloodGroup))];
              const bloodTypeOptions = ['All', ...uniqueBloodGroups.sort()];
              
              // Filter by both selected donation type AND blood type
              let filteredInventory = activeInventory;
              
              // Filter by donation type
              if (selectedDonationType !== 'All') {
                filteredInventory = filteredInventory.filter(item => item.donationType === selectedDonationType);
              }
              
              // Filter by blood type
              if (selectedBloodType !== 'All') {
                filteredInventory = filteredInventory.filter(item => item.bloodGroup === selectedBloodType);
              }
              
              // Group by blood group and donation type
              const groupedInventory = {};
              filteredInventory.forEach(item => {
                const key = `${item.bloodGroup}-${item.donationType}`;
                if (!groupedInventory[key]) {
                  groupedInventory[key] = {
                    bloodGroup: item.bloodGroup,
                    donationType: item.donationType,
                    totalUnits: 0,
                    items: [],
                    earliestExpiration: item.expirationDate
                  };
                }
                groupedInventory[key].totalUnits += item.units;
                groupedInventory[key].items.push(item);
                if (new Date(item.expirationDate) < new Date(groupedInventory[key].earliestExpiration)) {
                  groupedInventory[key].earliestExpiration = item.expirationDate;
                }
              });

              const groupedArray = Object.values(groupedInventory);

              return (
                <div>
                  {/* Filter Dropdowns */}
                  <div style={{ 
                    marginBottom: '20px', 
                    display: 'flex', 
                    gap: '20px', 
                    alignItems: 'flex-end',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <label htmlFor="blood-type-filter" style={{ 
                        display: 'block', 
                        marginBottom: '10px', 
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        Filter by Blood Type:
                      </label>
                      <select
                        id="blood-type-filter"
                        value={selectedBloodType}
                        onChange={(e) => setSelectedBloodType(e.target.value)}
                        style={{
                          padding: '10px',
                          fontSize: '16px',
                          borderRadius: '5px',
                          border: '1px solid #ddd',
                          minWidth: '150px',
                          cursor: 'pointer'
                        }}
                      >
                        {bloodTypeOptions.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="donation-type-filter" style={{ 
                        display: 'block', 
                        marginBottom: '10px', 
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        Filter by Variety:
                      </label>
                      <select
                        id="donation-type-filter"
                        value={selectedDonationType}
                        onChange={(e) => setSelectedDonationType(e.target.value)}
                        style={{
                          padding: '10px',
                          fontSize: '16px',
                          borderRadius: '5px',
                          border: '1px solid #ddd',
                          minWidth: '200px',
                          cursor: 'pointer'
                        }}
                      >
                        {donationTypeOptions.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filters Button */}
                    {(selectedBloodType !== 'All' || selectedDonationType !== 'All') && (
                      <button
                        onClick={() => {
                          setSelectedBloodType('All');
                          setSelectedDonationType('All');
                        }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#f0f0f0',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  <div className="inventory-summary">
                    <div className="summary-card">
                      <h3>Total Units</h3>
                      <p className="summary-value">{filteredInventory.reduce((sum, item) => sum + item.units, 0)}</p>
                      {(selectedBloodType !== 'All' || selectedDonationType !== 'All') && (
                        <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                          (Filtered: {selectedBloodType !== 'All' ? selectedBloodType : 'All'} × {selectedDonationType !== 'All' ? selectedDonationType : 'All'})
                        </small>
                      )}
                    </div>
                    <div className="summary-card">
                      <h3>Blood Types</h3>
                      <p className="summary-value">{new Set(filteredInventory.map(item => item.bloodGroup)).size}</p>
                    </div>
                    <div className="summary-card">
                      <h3>Varieties</h3>
                      <p className="summary-value">{new Set(filteredInventory.map(item => item.donationType)).size}</p>
                    </div>
                    {expiredInventory.length > 0 && (
                      <div className="summary-card warning">
                        <h3>Expired Units</h3>
                        <p className="summary-value">{expiredInventory.reduce((sum, item) => sum + item.units, 0)}</p>
                      </div>
                    )}
                  </div>

                  {groupedArray.length === 0 ? (
                    <div className="empty-state">
                      <p>
                        {selectedBloodType !== 'All' || selectedDonationType !== 'All'
                          ? `No inventory found for ${selectedBloodType !== 'All' ? selectedBloodType : 'All'} × ${selectedDonationType !== 'All' ? selectedDonationType : 'All'}`
                          : 'No blood inventory available.'}
                      </p>
                    </div>
                  ) : (
                    <div className="inventory-grid">
                      {groupedArray.map((group, idx) => (
                        <div key={idx} className="inventory-card">
                          <div className="inventory-header">
                            <h3>{group.bloodGroup}</h3>
                            <span className="donation-type-badge">{group.donationType}</span>
                          </div>
                          <div className="inventory-details">
                            <p className="units-count"><strong>{group.totalUnits}</strong> units</p>
                            <p className="expiration-date">
                              <strong>Earliest Expiration:</strong>{' '}
                              {new Date(group.earliestExpiration).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            {group.items.length > 1 && (
                              <details className="inventory-breakdown">
                                <summary>View Details ({group.items.length} batches)</summary>
                                <div className="breakdown-list">
                                  {group.items.map((item, itemIdx) => (
                                    <div key={itemIdx} className="breakdown-item">
                                      <span>{item.units} units</span>
                                      <span>Expires: {new Date(item.expirationDate).toLocaleDateString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {expiredInventory.length > 0 && (
                    <div className="expired-section">
                      <h3>Expired Inventory</h3>
                      <div className="inventory-grid">
                        {expiredInventory.map((item, idx) => (
                          <div key={idx} className="inventory-card expired">
                            <div className="inventory-header">
                              <h3>{item.bloodGroup}</h3>
                              <span className="donation-type-badge">{item.donationType}</span>
                            </div>
                            <div className="inventory-details">
                              <p className="units-count"><strong>{item.units}</strong> units</p>
                              <p className="expiration-date expired-text">
                                Expired: {new Date(item.expirationDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'reschedules' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Pending Reschedule Requests</h2>
            </div>
            {rescheduleRequests.length === 0 ? (
              <div className="empty-state">
                <p>No pending reschedule requests.</p>
              </div>
            ) : (
              <div className="reschedule-requests-list">
                {rescheduleRequests.map(request => (
                  <div key={request.id} className="reschedule-request-card" style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '20px',
                    backgroundColor: '#fff'
                  }}>
                    <div className="request-header" style={{ marginBottom: '15px' }}>
                      <h3>{request.donation?.eventName || request.donation?.selectedOrganization || 'Donation'}</h3>
                      <span className="status-badge pending" style={{ 
                        padding: '5px 10px', 
                        borderRadius: '4px',
                        backgroundColor: '#fff3cd',
                        color: '#856404'
                      }}>
                        Pending
                      </span>
                    </div>
                    
                    <div className="request-details" style={{ marginBottom: '15px' }}>
                      <p><strong>Donor:</strong> {request.user?.fullName || request.donation?.fullName}</p>
                      <p><strong>Email:</strong> {request.user?.email || request.donation?.email}</p>
                      {request.user?.phone && <p><strong>Phone:</strong> {request.user.phone}</p>}
                      
                      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        <p><strong>Current Appointment:</strong></p>
                        <p>Date: {request.oldDate ? new Date(request.oldDate).toLocaleDateString() : 'N/A'}</p>
                        {request.oldTime && <p>Time: {request.oldTime}</p>}
                      </div>
                      
                      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
                        <p><strong>Requested New Appointment:</strong></p>
                        <p>Date: {new Date(request.newDate).toLocaleDateString()}</p>
                        {request.newTime && <p>Time: {request.newTime}</p>}
                      </div>
                      
                      {request.reason && (
                        <div style={{ marginTop: '15px' }}>
                          <p><strong>Reason:</strong></p>
                          <p style={{ fontStyle: 'italic', color: '#666' }}>{request.reason}</p>
                        </div>
                      )}
                      
                      <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                        Requested: {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="request-actions" style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn-approve"
                        onClick={() => handleRescheduleRequest(request.id, 'approve')}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => {
                          const reason = prompt('Please provide a reason for rejection (optional):');
                          handleRescheduleRequest(request.id, 'reject', reason || null);
                        }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="org-dashboard-content">
            <div className="section-header">
              <h2>Events</h2>
              <button className="create-event-btn" onClick={() => setShowEventModal(true)}>
                ➕ Create New Event
              </button>
            </div>
            {events.length === 0 ? (
              <div className="empty-state">
                <p>No events created yet. Create your first event to get started!</p>
              </div>
            ) : (
              <div className="events-list">
                {events.map(event => {
                  const registrationCount = event.registrationCount || 0;
                  return (
                    <div key={event.id} className="event-card">
                      <div className="event-header">
                        <h3>{event.name}</h3>
                        <span className="event-date">{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="event-details">
                        <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
                        <p><strong>Location:</strong> {event.location}</p>
                        <p><strong>Registrations:</strong> {registrationCount} {event.maxRegistrations ? `/ ${event.maxRegistrations}` : ''}</p>
                        {event.description && <p><strong>Description:</strong> {event.description}</p>}
                      </div>
                      <div className="event-actions">
                        <button 
                          className="btn-view"
                          onClick={() => handleViewEventDetails(event)}
                        >
                          👁️ View Registrations ({registrationCount})
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this event?')) {
                              try {
                                await eventAPI.deleteEvent(event.id);
                                await loadDashboardData();
                              } catch (error) {
                                alert(error.message || 'Failed to delete event. Please try again.');
                              }
                            }
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedDonation && (
        <div className="modal-overlay" onClick={() => setShowApprovalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Approve Donation</h2>
              <button className="modal-close" onClick={() => setShowApprovalModal(false)}>×</button>
            </div>
            <div className="approval-form">
              <div className="donation-info">
                <p><strong>Donor:</strong> {selectedDonation.fullName}</p>
                <p><strong>Blood Group:</strong> {selectedDonation.bloodGroup}</p>
                <p><strong>Email:</strong> {selectedDonation.email}</p>
              </div>
              
              <div className="form-group">
                <label>Donation Type *</label>
                <select
                  value={approvalFormData.donationType}
                  onChange={(e) => setApprovalFormData({...approvalFormData, donationType: e.target.value})}
                  required
                >
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Red Blood Cells">Red Blood Cells</option>
                  <option value="Platelets">Platelets</option>
                  <option value="Double Red Cells">Double Red Cells</option>
                  <option value="Cryo">Cryo (Cryoprecipitate)</option>
                  <option value="White Cells">White Cells</option>
                  <option value="Granulocytes">Granulocytes</option>
                </select>
              </div>

              <div className="form-group">
                <label>Number of Units *</label>
                <input
                  type="number"
                  min="1"
                  value={approvalFormData.units}
                  onChange={(e) => setApprovalFormData({...approvalFormData, units: parseInt(e.target.value) || 1})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={approvalFormData.expirationDate}
                  onChange={(e) => setApprovalFormData({...approvalFormData, expirationDate: e.target.value})}
                />
                <small>Leave blank to auto-calculate based on donation type</small>
              </div>

              <div className="modal-buttons">
                <button className="btn-approve" onClick={handleConfirmApproval}>
                  ✅ Confirm Approval
                </button>
                <button className="btn-secondary" onClick={() => setShowApprovalModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Event</h2>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateEvent} className="event-form">
              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  value={eventFormData.name}
                  onChange={(e) => setEventFormData({...eventFormData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={eventFormData.date}
                    onChange={(e) => setEventFormData({...eventFormData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    value={eventFormData.startTime}
                    onChange={(e) => setEventFormData({...eventFormData, startTime: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    value={eventFormData.endTime}
                    onChange={(e) => setEventFormData({...eventFormData, endTime: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={eventFormData.location}
                  onChange={(e) => setEventFormData({...eventFormData, location: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData({...eventFormData, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Max Registrations (Optional)</label>
                <input
                  type="number"
                  value={eventFormData.maxRegistrations}
                  onChange={(e) => setEventFormData({...eventFormData, maxRegistrations: e.target.value})}
                  min="1"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEventModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowEventDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Event Registrations: {selectedEvent.name}</h2>
              <button className="modal-close" onClick={() => setShowEventDetailsModal(false)}>×</button>
            </div>
            <div className="registrations-list">
              {(() => {
                const registrations = selectedEvent.registrations || [];
                if (registrations.length === 0) {
                  return <p>No registrations yet.</p>;
                }
                return registrations.map(reg => (
                  <div key={reg.id} className="registration-item">
                    <p><strong>Blood Group:</strong> {reg.bloodGroup}</p>
                    <p><strong>Donor Email:</strong> {reg.userEmail || reg.email}</p>
                    <p><strong>Status:</strong> <span className={`status-badge ${reg.status || 'pending'}`}>{reg.status || 'pending'}</span></p>
                    <p><strong>Registered:</strong> {new Date(reg.createdAt || reg.created_at).toLocaleDateString()}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationDashboard;

