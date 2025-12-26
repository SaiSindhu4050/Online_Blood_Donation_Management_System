// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token from localStorage
// Checks both user and organization tokens
// Prioritizes organization token if both exist (to avoid conflicts)
const getToken = () => {
  // Check for organization token first (to avoid using user token when org is logged in)
  const org = JSON.parse(localStorage.getItem('bl_current_org_v1') || 'null');
  if (org?.token) {
    return org.token;
  }
  
  // Then check for user token
  const user = JSON.parse(localStorage.getItem('bl_current_user_v1') || 'null');
  if (user?.token) {
    return user.token;
  }
  
  return null;
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // Remove headers from options to avoid duplication
  delete config.headers.headers;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, try to get text or use empty object
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || 'An error occurred' };
      }
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  // Register a new user
  registerUser: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login user
  loginUser: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Register a new organization
  registerOrganization: async (orgData) => {
    return apiRequest('/auth/org/register', {
      method: 'POST',
      body: JSON.stringify(orgData),
    });
  },

  // Login organization
  loginOrganization: async (email, password) => {
    return apiRequest('/auth/org/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Get current user/organization
  getMe: async () => {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },
};

// User API calls
export const userAPI = {
  // Get user profile
  getProfile: async () => {
    return apiRequest('/users/profile', { method: 'GET' });
  },

  // Update user profile
  updateProfile: async (profileData) => {
    return apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Get user dashboard
  getDashboard: async () => {
    return apiRequest('/users/dashboard', { method: 'GET' });
  },
};

// Organization API calls
export const organizationAPI = {
  // Get organization profile
  getProfile: async () => {
    return apiRequest('/organizations/profile', { method: 'GET' });
  },

  // Update organization profile
  updateProfile: async (profileData) => {
    return apiRequest('/organizations/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Get organization dashboard
  getDashboard: async () => {
    return apiRequest('/organizations/dashboard', { method: 'GET' });
  },

  // Get all organizations
  getAllOrganizations: async (city) => {
    const query = city ? `?city=${encodeURIComponent(city)}` : '';
    return apiRequest(`/organizations${query}`, { method: 'GET' });
  },

  // Accept request and donation (peer-to-peer matching)
  acceptRequestAndDonation: async (requestId, donationId) => {
    return apiRequest('/organizations/accept-request-donation', {
      method: 'POST',
      body: JSON.stringify({ requestId, donationId }),
    });
  },

  // Get blood inventory
  getInventory: async () => {
    return apiRequest('/organizations/inventory', { method: 'GET' });
  },

  // Get reschedule requests
  getRescheduleRequests: async () => {
    return apiRequest('/organizations/reschedule-requests', { method: 'GET' });
  },

  // Handle reschedule request (approve/reject)
  handleRescheduleRequest: async (id, action, rejectionReason = null) => {
    return apiRequest(`/organizations/reschedule-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action, rejectionReason }),
    });
  },
};

// Donation API calls
export const donationAPI = {
  // Create a new donation
  createDonation: async (donationData) => {
    return apiRequest('/donations', {
      method: 'POST',
      body: JSON.stringify(donationData),
    });
  },

  // Get all donations
  getAllDonations: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const query = queryString ? `?${queryString}` : '';
    return apiRequest(`/donations${query}`, { method: 'GET' });
  },

  // Get single donation
  getDonation: async (id) => {
    return apiRequest(`/donations/${id}`, { method: 'GET' });
  },

  // Update donation status
  updateDonationStatus: async (id, status, scheduledDate, scheduledTime, additionalData = {}) => {
    return apiRequest(`/donations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, scheduledDate, scheduledTime, ...additionalData }),
    });
  },

  // Delete donation
  deleteDonation: async (id) => {
    return apiRequest(`/donations/${id}`, { method: 'DELETE' });
  },

  // Request reschedule
  requestReschedule: async (id, rescheduleData) => {
    return apiRequest(`/donations/${id}/request-reschedule`, {
      method: 'POST',
      body: JSON.stringify(rescheduleData),
    });
  },

  // Mark donation as completed (customer present)
  markDonationCompleted: async (id) => {
    return apiRequest(`/donations/${id}/mark-completed`, {
      method: 'PUT',
    });
  },
};

// Request API calls
export const requestAPI = {
  // Create a new blood request
  createRequest: async (requestData) => {
    return apiRequest('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  // Get all requests
  getAllRequests: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const query = queryString ? `?${queryString}` : '';
    return apiRequest(`/requests${query}`, { method: 'GET' });
  },

  // Get single request
  getRequest: async (id) => {
    return apiRequest(`/requests/${id}`, { method: 'GET' });
  },

  // Update request details
  updateRequest: async (id, requestData) => {
    return apiRequest(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
  },

  // Update request status
  updateRequestStatus: async (id, status) => {
    return apiRequest(`/requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Match donors to request
  matchDonors: async (id) => {
    return apiRequest(`/requests/${id}/match`, { method: 'POST' });
  },

  // Delete request
  deleteRequest: async (id) => {
    return apiRequest(`/requests/${id}`, { method: 'DELETE' });
  },
};

// Event API calls
export const eventAPI = {
  // Create a new event
  createEvent: async (eventData) => {
    return apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  // Get all events
  getAllEvents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const query = queryString ? `?${queryString}` : '';
    return apiRequest(`/events${query}`, { method: 'GET' });
  },

  // Get single event
  getEvent: async (id) => {
    return apiRequest(`/events/${id}`, { method: 'GET' });
  },

  // Update event
  updateEvent: async (id, eventData) => {
    return apiRequest(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  // Delete event
  deleteEvent: async (id) => {
    return apiRequest(`/events/${id}`, { method: 'DELETE' });
  },

  // Get event registrations
  getEventRegistrations: async (id) => {
    return apiRequest(`/events/${id}/registrations`, { method: 'GET' });
  },
};

// Export the base API request function for other modules
export default apiRequest;

