import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminDashboardAPI, adminAuthAPI } from '../../utils/api';
import { getCurrentUser, clearCurrentUser } from '../../utils/storage';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [actionQueue, setActionQueue] = useState(null);
  const [inventoryHeatmap, setInventoryHeatmap] = useState([]);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('all');
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    checkAuth();
    loadDashboardData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBloodGroup) {
      loadInventoryHeatmap();
    }
  }, [selectedBloodGroup]);

  const checkAuth = async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.userType !== 'admin') {
      navigate('/admin/login');
      return;
    }

    try {
      const response = await adminAuthAPI.getAdminProfile();
      if (response.success && response.admin) {
        setAdminInfo(response.admin);
      } else {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/admin/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, queueResponse, heatmapResponse] = await Promise.all([
        adminDashboardAPI.getDashboardStats(),
        adminDashboardAPI.getActionQueue(),
        adminDashboardAPI.getInventoryHeatmap()
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
      if (queueResponse.success) {
        setActionQueue(queueResponse.actionQueue);
      }
      if (heatmapResponse.success) {
        setInventoryHeatmap(heatmapResponse.regions);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryHeatmap = async () => {
    try {
      const bloodGroup = selectedBloodGroup === 'all' ? null : selectedBloodGroup;
      const response = await adminDashboardAPI.getInventoryHeatmap(bloodGroup);
      if (response.success) {
        setInventoryHeatmap(response.regions);
      }
    } catch (error) {
      console.error('Error loading inventory heatmap:', error);
    }
  };

  const handleLogout = () => {
    clearCurrentUser();
    navigate('/admin/login');
  };

  const getAvailabilityColor = (level) => {
    switch (level) {
      case 'critical': return '#dc2626';
      case 'low': return '#f59e0b';
      case 'moderate': return '#eab308';
      case 'good': return '#059669';
      default: return '#6b7280';
    }
  };

  const getAvailabilityIcon = (level) => {
    switch (level) {
      case 'critical': return '🔴';
      case 'low': return '🟠';
      case 'moderate': return '🟡';
      case 'good': return '🟢';
      default: return '⚪';
    }
  };

  if (loading && !stats) {
    return (
      <div className="admin-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-left">
            <h1>🩸 Admin Dashboard</h1>
            {adminInfo && (
              <p className="admin-welcome">Welcome, {adminInfo.username || adminInfo.fullName}</p>
            )}
          </div>
          <div className="admin-header-right">
            <button className="btn-refresh" onClick={loadDashboardData}>
              🔄 Refresh
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-dashboard-content">
        {/* Live Stats Cards */}
        <section className="stats-section">
          <h2 className="section-title">Live Statistics</h2>
          <div className="stats-grid">
            {/* Total Users Card */}
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.users?.active || 0}</div>
                <div className="stat-label">Active Users</div>
                <div className="stat-subtext">
                  Total: {stats?.users?.total || 0} • Inactive: {stats?.users?.inactive || 0}
                </div>
              </div>
            </div>

            {/* Total Organizations Card */}
            <div className="stat-card">
              <div className="stat-icon">🏥</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.organizations?.verified || 0}</div>
                <div className="stat-label">Verified Organizations</div>
                <div className="stat-subtext">
                  Total: {stats?.organizations?.total || 0} • Pending: {stats?.organizations?.pending || 0}
                </div>
              </div>
            </div>

            {/* Active Requests Card */}
            <div className="stat-card urgent">
              <div className="stat-icon">🩸</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.requests?.open || 0}</div>
                <div className="stat-label">Open Requests</div>
                <div className="stat-subtext">
                  Critical/Emergency: {stats?.requests?.emergency || 0}
                </div>
              </div>
            </div>

            {/* Fulfilled Today Card */}
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.requests?.fulfilledToday || 0}</div>
                <div className="stat-label">Fulfilled Today</div>
                <div className="stat-subtext">
                  {stats?.requests?.fulfilledDiff >= 0 ? '+' : ''}{stats?.requests?.fulfilledDiff || 0} vs Yesterday
                </div>
              </div>
            </div>

            {/* Urgency Meter Card */}
            <div className="stat-card critical">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.requests?.emergency || 0}</div>
                <div className="stat-label">Critical/Emergency</div>
                <div className="stat-subtext">Active Urgent Requests</div>
              </div>
            </div>

            {/* Total Donations Card */}
            <div className="stat-card">
              <div className="stat-icon">💉</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.donations?.thisMonth || 0}</div>
                <div className="stat-label">Donations This Month</div>
                <div className="stat-subtext">
                  This Week: {stats?.donations?.thisWeek || 0}
                </div>
              </div>
            </div>

            {/* Events Card */}
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.events?.upcoming || 0}</div>
                <div className="stat-label">Upcoming Events</div>
                <div className="stat-subtext">
                  Total: {stats?.events?.total || 0} • Ongoing: {stats?.events?.ongoing || 0}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Required Queue */}
        <section className="action-queue-section">
          <h2 className="section-title">Action Required</h2>
          <div className="action-queue-grid">
            {/* Pending Organization Verifications */}
            <div className="action-card warning">
              <div className="action-card-header">
                <div className="action-badge">{actionQueue?.pendingVerifications?.length || 0}</div>
                <h3>Pending Organization Verifications</h3>
              </div>
              <p className="action-description">
                {actionQueue?.pendingVerifications?.length || 0} organizations awaiting verification
              </p>
              <div className="action-buttons">
                <button
                  className="btn-action-primary"
                  onClick={() => alert('Organization management page coming soon!')}
                >
                  Review All
                </button>
              </div>
              {actionQueue?.pendingVerifications && actionQueue.pendingVerifications.length > 0 && (
                <div className="action-details">
                  <div className="action-list">
                    {actionQueue.pendingVerifications.slice(0, 3).map(org => (
                      <div key={org.id} className="action-item">
                        <span className="action-item-name">{org.name}</span>
                        <span className="action-item-location">{org.city}, {org.state}</span>
                      </div>
                    ))}
                    {actionQueue.pendingVerifications.length > 3 && (
                      <div className="action-item-more">
                        +{actionQueue.pendingVerifications.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Flagged User Accounts */}
            <div className="action-card danger">
              <div className="action-card-header">
                <div className="action-badge">{actionQueue?.flaggedUsers?.length || 0}</div>
                <h3>Flagged User Accounts</h3>
              </div>
              <p className="action-description">
                {actionQueue?.flaggedUsers?.length || 0} user accounts require review
              </p>
              <div className="action-buttons">
                <button
                  className="btn-action-primary"
                  onClick={() => alert('User management page coming soon!')}
                >
                  Review All
                </button>
              </div>
              {actionQueue?.flaggedUsers && actionQueue.flaggedUsers.length > 0 && (
                <div className="action-details">
                  <div className="action-list">
                    {actionQueue.flaggedUsers.slice(0, 3).map(user => (
                      <div key={user.id} className="action-item">
                        <span className="action-item-name">{user.fullName}</span>
                        <span className="action-item-location">{user.email}</span>
                      </div>
                    ))}
                    {actionQueue.flaggedUsers.length > 3 && (
                      <div className="action-item-more">
                        +{actionQueue.flaggedUsers.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pending Testimonials */}
            {actionQueue?.pendingTestimonials > 0 && (
              <div className="action-card info">
                <div className="action-card-header">
                  <div className="action-badge">{actionQueue.pendingTestimonials}</div>
                  <h3>Pending Testimonials</h3>
                </div>
                <p className="action-description">
                  {actionQueue.pendingTestimonials} testimonials awaiting approval
                </p>
                <div className="action-buttons">
                  <button
                    className="btn-action-primary"
                    onClick={() => alert('Testimonial management page coming soon!')}
                  >
                    Review All
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Inventory Heatmap */}
        <section className="inventory-heatmap-section">
          <div className="heatmap-header">
            <h2 className="section-title">Inventory Heatmap</h2>
            <div className="heatmap-controls">
              <select
                value={selectedBloodGroup}
                onChange={(e) => setSelectedBloodGroup(e.target.value)}
                className="blood-group-filter"
              >
                <option value="all">All Blood Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          {inventoryHeatmap.length === 0 ? (
            <div className="empty-state">
              <p>No inventory data available</p>
            </div>
          ) : (
            <>
              <div className="heatmap-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#059669' }}></span>
                  <span>Good (76-100%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#eab308' }}></span>
                  <span>Moderate (51-75%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span>Low (21-50%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#dc2626' }}></span>
                  <span>Critical (0-20%)</span>
                </div>
              </div>

              <div className="heatmap-grid">
                {inventoryHeatmap.map((region, index) => (
                  <div
                    key={index}
                    className="heatmap-card"
                    style={{
                      borderLeft: `4px solid ${getAvailabilityColor(region.availabilityLevel)}`
                    }}
                  >
                    <div className="heatmap-card-header">
                      <h3>{region.name}</h3>
                      <span className="availability-badge" style={{ backgroundColor: getAvailabilityColor(region.availabilityLevel) }}>
                        {getAvailabilityIcon(region.availabilityLevel)} {region.availabilityLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="heatmap-card-content">
                      <div className="heatmap-stat">
                        <span className="heatmap-stat-label">Total Units:</span>
                        <span className="heatmap-stat-value">{region.totalUnits}</span>
                      </div>
                      <div className="heatmap-stat">
                        <span className="heatmap-stat-label">Organizations:</span>
                        <span className="heatmap-stat-value">{region.organizationCount}</span>
                      </div>
                      {region.cities && region.cities.length > 0 && (
                        <div className="heatmap-cities">
                          <span className="heatmap-stat-label">Cities:</span>
                          <span className="heatmap-cities-list">{region.cities.slice(0, 3).join(', ')}{region.cities.length > 3 ? '...' : ''}</span>
                        </div>
                      )}
                      {Object.keys(region.bloodGroups).length > 0 && (
                        <div className="heatmap-blood-groups">
                          <div className="heatmap-stat-label" style={{ marginBottom: '8px' }}>Blood Groups:</div>
                          <div className="blood-groups-grid">
                            {Object.entries(region.bloodGroups).map(([bg, units]) => (
                              <div key={bg} className="blood-group-item">
                                <span className="bg-label">{bg}:</span>
                                <span className="bg-units">{units}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
