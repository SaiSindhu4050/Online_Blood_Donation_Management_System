// Simple localStorage-backed user storage
const USERS_KEY = 'bl_users_v1';
const CURRENT_USER_KEY = 'bl_current_user_v1';

export function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function findUserByEmail(email) {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
}

export function addUser(user) {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
}

export function updateUser(email, updates) {
  const users = getUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (idx === -1) return false;
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return true;
}

export function setCurrentUser(user) {
  // Store user with token if provided
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function getCurrentUser() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

// Store JWT token with user
export function setAuthToken(token, userData) {
  const user = {
    ...userData,
    token
  };
  setCurrentUser(user);
}

// Store JWT token with organization
export function setOrgAuthToken(token, orgData) {
  const org = {
    ...orgData,
    token
  };
  setCurrentOrganization(org);
}

// Get JWT token
export function getAuthToken() {
  const user = getCurrentUser();
  return user?.token || null;
}

// Get organization token
export function getOrgAuthToken() {
  const org = getCurrentOrganization();
  return org?.token || null;
}

// NOTE: For simplicity, we store plain text passwords.
// In production, never store plain passwords client-side.
export function verifyCredentials(email, password) {
  const user = findUserByEmail(email);
  if (!user) return { ok: false, reason: 'no_user' };
  if (user.password !== password) return { ok: false, reason: 'bad_password' };
  return { ok: true, user };
}

export function daysBetween(fromIso, toIso = new Date().toISOString()) {
  if (!fromIso) return Infinity;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return Infinity;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to - from) / msPerDay);
}

export function canDonate(user, cooldownDays = 56) {
  if (!user) return true;
  const since = daysBetween(user.lastDonationAt);
  return since >= cooldownDays;
}

// Donations storage
const DONATIONS_KEY = 'bl_donations_v1';
const REQUESTS_KEY = 'bl_requests_v1';
const MESSAGES_KEY = 'bl_messages_v1';
const NOTIFICATIONS_KEY = 'bl_notifications_v1';

export function getDonations(userEmail) {
  try {
    const raw = localStorage.getItem(DONATIONS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return userEmail ? all.filter(d => d.userEmail === userEmail) : all;
  } catch (_) {
    return [];
  }
}

export function addDonation(donation) {
  const donations = getDonations();
  const newDonation = {
    ...donation,
    id: Date.now().toString(),
    status: donation.status || 'pending', // Default to pending
    createdAt: new Date().toISOString()
  };
  donations.push(newDonation);
  localStorage.setItem(DONATIONS_KEY, JSON.stringify(donations));
  
  // Only update user's donation count and last donation date if status is approved
  if (donation.userEmail && donation.status === 'approved') {
    const user = findUserByEmail(donation.userEmail);
    if (user) {
      const donationCount = (user.donationCount || 0) + 1;
      updateUser(donation.userEmail, {
        lastDonationAt: new Date().toISOString(),
        donationCount
      });
    }
  }
  
  return newDonation;
}


export function getApprovedDonations(userEmail) {
  const donations = getDonations(userEmail);
  return donations.filter(d => d.status === 'approved');
}

export function deleteDonation(donationId) {
  const donations = getDonations();
  const filtered = donations.filter(d => d.id !== donationId);
  localStorage.setItem(DONATIONS_KEY, JSON.stringify(filtered));
  return true;
}

export function updateDonation(donationId, updates) {
  const donations = getDonations();
  const idx = donations.findIndex(d => d.id === donationId);
  if (idx === -1) return false;
  donations[idx] = { ...donations[idx], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(DONATIONS_KEY, JSON.stringify(donations));
  return true;
}

export function canModifyDonation(donation) {
  if (!donation) return false;
  if (donation.status === 'approved' && donation.eventDate) {
    const eventDate = new Date(donation.eventDate);
    const now = new Date();
    const diffTime = eventDate - now;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 2; // Can modify if 2+ days before event
  }
  return donation.status === 'pending'; // Can modify pending donations
}

export function getRequests(userEmail) {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return userEmail ? all.filter(r => r.userEmail === userEmail) : all;
  } catch (_) {
    return [];
  }
}

export function addRequest(request) {
  const requests = getRequests();
  const newRequest = {
    ...request,
    id: Date.now().toString(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  requests.push(newRequest);
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  return newRequest;
}

export function updateRequestStatus(requestId, status) {
  const requests = getRequests();
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return false;
  requests[idx].status = status;
  requests[idx].updatedAt = new Date().toISOString();
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  return true;
}

export function deleteRequest(requestId) {
  const requests = getRequests();
  const filtered = requests.filter(r => r.id !== requestId);
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(filtered));
  return true;
}

export function updateRequest(requestId, updates) {
  const requests = getRequests();
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return false;
  requests[idx] = { ...requests[idx], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  return true;
}

export function canModifyRequest(request) {
  if (!request) return false;
  if ((request.status === 'fulfilled' || request.status === 'matched') && request.requiredDate) {
    const requiredDate = new Date(request.requiredDate);
    const now = new Date();
    const diffTime = requiredDate - now;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 2; // Can modify if 2+ days before required date
  }
  return request.status === 'pending'; // Can modify pending requests
}

// Check if appointment can be rescheduled/cancelled (24 hours before)
export function canRescheduleOrCancelAppointment(appointment) {
  if (!appointment || !appointment.date) return false;
  
  const apptDate = new Date(appointment.date);
  const now = new Date();
  const diffTime = apptDate - now;
  const diffHours = diffTime / (1000 * 60 * 60);
  
  // Can reschedule/cancel if 24+ hours before appointment
  return diffHours >= 24;
}

// Get user's scheduled appointments (donations and requests with future dates)
export function getScheduledAppointments(userEmail) {
  const appointments = [];
  const now = new Date();
  
  // Get donations with future dates
  const donations = getDonations(userEmail);
  donations.forEach(donation => {
    const appointmentDate = donation.eventDate || donation.preferredDate;
    if (appointmentDate && new Date(appointmentDate) > now && (donation.status === 'pending' || donation.status === 'approved')) {
      appointments.push({
        id: donation.id,
        type: 'donation',
        date: appointmentDate,
        time: donation.preferredTime || null,
        eventName: donation.eventName || 'Blood Donation',
        location: `${donation.city || ''}, ${donation.state || ''}`,
        status: donation.status,
        data: donation
      });
    }
  });
  
  // Get requests with future dates
  const requests = getRequests(userEmail);
  requests.forEach(request => {
    if (request.requiredDate && new Date(request.requiredDate) > now && (request.status === 'pending' || request.status === 'fulfilled' || request.status === 'matched')) {
      appointments.push({
        id: request.id,
        type: 'request',
        date: request.requiredDate,
        time: null,
        eventName: `Blood Request - ${request.bloodGroup}`,
        location: `${request.city || ''}, ${request.state || ''}`,
        hospitalName: request.hospitalName || '',
        status: request.status,
        data: request
      });
    }
  });
  
  // Sort by date
  return appointments.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getUrgentRequests(userLocation, userBloodGroup) {
  const requests = getRequests();
  const now = new Date();
  
  return requests.filter(r => {
    // Only show urgent/emergency requests
    if (!['urgent', 'emergency'].includes(r.urgency)) return false;
    
    // Only show pending requests
    if (r.status !== 'pending') return false;
    
    // Filter by blood group compatibility (simplified)
    if (userBloodGroup && r.bloodGroup !== userBloodGroup) {
      // Basic compatibility check
      const compatible = {
        'A+': ['A+', 'A-', 'O+', 'O-'],
        'A-': ['A-', 'O-'],
        'B+': ['B+', 'B-', 'O+', 'O-'],
        'B-': ['B-', 'O-'],
        'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        'AB-': ['A-', 'B-', 'AB-', 'O-'],
        'O+': ['O+', 'O-'],
        'O-': ['O-']
      };
      if (!compatible[userBloodGroup]?.includes(r.bloodGroup)) return false;
    }
    
    // Filter by location (simplified - check city match)
    if (userLocation?.city && r.city && r.city.toLowerCase() !== userLocation.city.toLowerCase()) {
      return false;
    }
    
    return true;
  });
}

export function acceptUrgentRequest(requestId, userEmail) {
  const requests = getRequests();
  const request = requests.find(r => r.id === requestId);
  if (!request) return false;
  
  // Add notification to hospital
  addNotification({
    type: 'donor_ready',
    title: 'Donor Ready',
    message: `A donor has accepted your urgent blood request for ${request.bloodGroup}`,
    hospitalName: request.hospitalName,
    requestId: requestId,
    donorEmail: userEmail,
    createdAt: new Date().toISOString()
  });
  
  // Update request to show donor is ready
  request.acceptedBy = userEmail;
  request.acceptedAt = new Date().toISOString();
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  
  return true;
}

export function getMessages(userEmail) {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return userEmail ? all.filter(m => m.userEmail === userEmail) : all;
  } catch (_) {
    return [];
  }
}

export function addMessage(message) {
  const messages = getMessages();
  const newMessage = {
    ...message,
    id: Date.now().toString(),
    read: false,
    createdAt: new Date().toISOString()
  };
  messages.push(newMessage);
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  return newMessage;
}

export function markMessageRead(messageId) {
  const messages = getMessages();
  const idx = messages.findIndex(m => m.id === messageId);
  if (idx === -1) return false;
  messages[idx].read = true;
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  return true;
}

export function getNotifications(userEmail) {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return userEmail ? all.filter(n => !n.userEmail || n.userEmail === userEmail) : all;
  } catch (_) {
    return [];
  }
}

export function addNotification(notification) {
  const notifications = getNotifications();
  const newNotification = {
    ...notification,
    id: Date.now().toString(),
    read: false
  };
  notifications.push(newNotification);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  return newNotification;
}

export function markNotificationRead(notificationId) {
  const notifications = getNotifications();
  const idx = notifications.findIndex(n => n.id === notificationId);
  if (idx === -1) return false;
  notifications[idx].read = true;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  return true;
}

// Generate precaution notifications
export function generatePrecautionNotifications(user) {
  if (!user || !user.lastDonationAt) return [];
  
  const notifications = [];
  const donationDate = new Date(user.lastDonationAt);
  const now = new Date();
  
  // 24 hours before donation (if scheduled)
  // This would require a scheduled donation date, which we'll add later
  
  // 24 hours after donation
  const hoursSinceDonation = (now - donationDate) / (1000 * 60 * 60);
  if (hoursSinceDonation >= 24 && hoursSinceDonation < 48) {
    notifications.push({
      type: 'precaution_24hr_after',
      title: 'Post-Donation Care Reminder',
      message: 'Remember to drink plenty of fluids, avoid heavy lifting, and rest well. You should avoid strenuous activities for 24-48 hours after donation.',
      userEmail: user.email,
      createdAt: new Date().toISOString()
    });
  }
  
  return notifications;
}

// Reviews and Ratings storage
const REVIEWS_KEY = 'bl_reviews_v1';

export function addReview(review) {
  const reviews = getReviews();
  const newReview = {
    ...review,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  reviews.push(newReview);
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  
  // Award reward points for review
  if (review.userEmail) {
    const user = findUserByEmail(review.userEmail);
    if (user) {
      const rewardPoints = (user.rewardPoints || 0) + 50; // 50 points per review
      updateUser(review.userEmail, { rewardPoints });
    }
  }
  
  return newReview;
}

export function getReviews(userEmail, type, itemId) {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    let filtered = all;
    
    if (userEmail) filtered = filtered.filter(r => r.userEmail === userEmail);
    if (type) filtered = filtered.filter(r => r.type === type);
    if (itemId) filtered = filtered.filter(r => r.itemId === itemId);
    
    return filtered;
  } catch (_) {
    return [];
  }
}

// Organizations storage and authentication
const ORGANIZATIONS_KEY = 'bl_organizations_v1';
const ORGANIZATIONS_ACCOUNTS_KEY = 'bl_org_accounts_v1';
const CURRENT_ORG_KEY = 'bl_current_org_v1';
const EVENTS_KEY = 'bl_events_v1';

export function getOrganizationAccounts() {
  try {
    const raw = localStorage.getItem(ORGANIZATIONS_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveOrganizationAccounts(accounts) {
  localStorage.setItem(ORGANIZATIONS_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function findOrganizationByEmail(email) {
  const accounts = getOrganizationAccounts();
  return accounts.find(org => org.email.toLowerCase() === String(email).toLowerCase());
}

export function addOrganizationAccount(org) {
  const accounts = getOrganizationAccounts();
  accounts.push(org);
  saveOrganizationAccounts(accounts);
}

export function updateOrganizationAccount(email, updates) {
  const accounts = getOrganizationAccounts();
  const idx = accounts.findIndex(org => org.email.toLowerCase() === String(email).toLowerCase());
  if (idx === -1) return false;
  accounts[idx] = { ...accounts[idx], ...updates };
  saveOrganizationAccounts(accounts);
  return true;
}

export function setCurrentOrganization(org) {
  localStorage.setItem(CURRENT_ORG_KEY, JSON.stringify(org));
}

export function getCurrentOrganization() {
  const raw = localStorage.getItem(CURRENT_ORG_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearCurrentOrganization() {
  localStorage.removeItem(CURRENT_ORG_KEY);
}

export function verifyOrganizationCredentials(email, password) {
  const org = findOrganizationByEmail(email);
  if (!org) return { ok: false, reason: 'no_org' };
  if (org.password !== password) return { ok: false, reason: 'bad_password' };
  return { ok: true, org };
}

// Organizations storage (for display/search)
const ORGANIZATIONS_KEY_DISPLAY = 'bl_organizations_display_v1';

export function getOrganizations(userLocation) {
  try {
    const raw = localStorage.getItem(ORGANIZATIONS_KEY_DISPLAY);
    let all = raw ? JSON.parse(raw) : [];
    
    // Also get from organization accounts
    const accounts = getOrganizationAccounts();
    accounts.forEach(account => {
      if (!all.find(o => o.id === account.id)) {
        all.push({
          id: account.id,
          name: account.name,
          city: account.city,
          state: account.state,
          specialty: account.specialty,
          rating: account.rating || 0,
          reviewCount: account.reviewCount || 0,
          address: account.address,
          phone: account.phone
        });
      }
    });
    
    // If no organizations exist, create some sample ones
    if (all.length === 0) {
      all = [
        {
          id: '1',
          name: 'City Blood Bank',
          city: 'Default',
          state: 'Default State',
          specialty: 'Blood Collection & Storage',
          rating: 4.5,
          reviewCount: 120,
          address: '123 Main St',
          phone: '+1 (555) 123-4567'
        },
        {
          id: '2',
          name: 'Community Health Center',
          city: 'Default',
          state: 'Default State',
          specialty: 'Emergency Blood Supply',
          rating: 4.8,
          reviewCount: 85,
          address: '456 Oak Ave',
          phone: '+1 (555) 234-5678'
        },
        {
          id: '3',
          name: 'Regional Hospital Blood Services',
          city: 'Default',
          state: 'Default State',
          specialty: 'Transfusion Services',
          rating: 4.3,
          reviewCount: 200,
          address: '789 Pine Rd',
          phone: '+1 (555) 345-6789'
        }
      ];
      localStorage.setItem(ORGANIZATIONS_KEY_DISPLAY, JSON.stringify(all));
    }
    
    // Filter by location if provided
    if (userLocation?.city) {
      return all.filter(org => 
        org.city.toLowerCase() === userLocation.city.toLowerCase()
      );
    }
    
    return all;
  } catch (_) {
    return [];
  }
}

// Get donations for organization approval
export function getDonationsForOrganization(orgEmail) {
  const allDonations = getDonations();
  const org = findOrganizationByEmail(orgEmail);
  if (!org) return [];
  
  // Filter donations that match organization's city or are related to organization
  return allDonations.filter(donation => {
    if (donation.status !== 'pending') return false;
    
    // Match by city
    if (donation.city && org.city && donation.city.toLowerCase() === org.city.toLowerCase()) {
      return true;
    }
    
    // Match by event name containing organization name
    if (donation.eventName && org.name) {
      const eventName = donation.eventName.toLowerCase();
      const orgName = org.name.toLowerCase();
      return eventName.includes(orgName) || orgName.includes(eventName);
    }
    
    return false;
  });
}

// Get requests for organization approval
export function getRequestsForOrganization(orgEmail) {
  const allRequests = getRequests();
  const org = findOrganizationByEmail(orgEmail);
  if (!org) return [];
  
  // Filter requests that match organization's hospital name or city
  return allRequests.filter(request => {
    if (request.status !== 'pending') return false;
    
    // Match by hospital name
    if (request.hospitalName && org.name) {
      const hospitalName = request.hospitalName.toLowerCase();
      const orgName = org.name.toLowerCase();
      if (hospitalName.includes(orgName) || orgName.includes(hospitalName)) {
        return true;
      }
    }
    
    // Match by city
    if (request.city && org.city && request.city.toLowerCase() === org.city.toLowerCase()) {
      return true;
    }
    
    return false;
  });
}

// Get approved donations count for organization
export function getApprovedDonationsCountForOrganization(orgEmail) {
  const allDonations = getDonations();
  const org = findOrganizationByEmail(orgEmail);
  if (!org) return 0;
  
  return allDonations.filter(donation => {
    if (donation.status !== 'approved') return false;
    
    // Match by city or event name
    if (donation.city && org.city && donation.city.toLowerCase() === org.city.toLowerCase()) {
      return true;
    }
    
    if (donation.eventName && org.name) {
      const eventName = donation.eventName.toLowerCase();
      const orgName = org.name.toLowerCase();
      return eventName.includes(orgName) || orgName.includes(eventName);
    }
    
    return false;
  }).length;
}

// Events management
export function getEvents(orgEmail) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return orgEmail ? all.filter(e => e.orgEmail === orgEmail) : all;
  } catch (_) {
    return [];
  }
}

export function addEvent(event) {
  const events = getEvents();
  const newEvent = {
    ...event,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  events.push(newEvent);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return newEvent;
}

export function updateEvent(eventId, updates) {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx === -1) return false;
  events[idx] = { ...events[idx], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return true;
}

export function deleteEvent(eventId) {
  const events = getEvents();
  const filtered = events.filter(e => e.id !== eventId);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
  return true;
}

// Get registrations for an event
export function getEventRegistrations(eventId) {
  const allDonations = getDonations();
  const events = getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return [];
  
  // Match donations by event name
  return allDonations.filter(d => {
    if (d.eventName && event.name) {
      return d.eventName.toLowerCase() === event.name.toLowerCase();
    }
    return false;
  });
}

export function updateOrganizationRating(orgId, newRating) {
  const organizations = getOrganizations();
  const idx = organizations.findIndex(org => org.id === orgId);
  if (idx === -1) return false;
  
  const org = organizations[idx];
  const totalRating = (org.rating * org.reviewCount) + newRating;
  org.reviewCount = (org.reviewCount || 0) + 1;
  org.rating = totalRating / org.reviewCount;
  
  localStorage.setItem(ORGANIZATIONS_KEY, JSON.stringify(organizations));
  return true;
}

// Check if user has interacted with an organization (donation, request, or event)
export function hasInteractedWithOrganization(userEmail, organization) {
  if (!userEmail || !organization) return false;
  
  const orgName = organization.name.toLowerCase();
  const orgNameWords = orgName.split(' ').filter(w => w.length > 2); // Filter out short words like "the", "a", etc.
  
  // Check donations - look for event name or city matching organization
  // Only count approved donations as real interactions
  const donations = getDonations(userEmail);
  const hasDonation = donations.some(donation => {
    // Only check approved donations
    if (donation.status !== 'approved') return false;
    
    const eventName = (donation.eventName || '').toLowerCase();
    const donationCity = (donation.city || '').toLowerCase();
    
    // Check if event name contains organization name or key words
    const eventMatchesOrg = orgNameWords.some(word => eventName.includes(word)) ||
                           eventName.includes(orgName) ||
                           orgName.includes(eventName);
    
    // Check if city matches (for non-event donations)
    const cityMatches = donationCity === organization.city.toLowerCase();
    
    return eventMatchesOrg || cityMatches;
  });
  
  // Check requests - look for hospital name matching
  // Only count fulfilled/matched requests as real interactions
  const requests = getRequests(userEmail);
  const hasRequest = requests.some(request => {
    // Only check fulfilled or matched requests
    if (request.status !== 'fulfilled' && request.status !== 'matched') return false;
    
    const requestHospital = (request.hospitalName || '').toLowerCase();
    
    // Check if hospital name contains organization name or key words
    const hospitalMatchesOrg = orgNameWords.some(word => requestHospital.includes(word)) ||
                              requestHospital.includes(orgName) ||
                              orgName.includes(requestHospital) ||
                              requestHospital === orgName;
    
    return hospitalMatchesOrg;
  });
  
  // Check if user participated in events organized by this organization
  const hasEvent = donations.some(donation => {
    // Only check approved donations with events
    if (donation.status !== 'approved' || !donation.eventName) return false;
    
    const eventName = (donation.eventName || '').toLowerCase();
    
    // Check if organization name appears in event name
    return orgNameWords.some(word => eventName.includes(word)) ||
           eventName.includes(orgName) ||
           orgName.includes(eventName);
  });
  
  return hasDonation || hasRequest || hasEvent;
}

// Blood Inventory Storage
const BLOOD_INVENTORY_KEY = 'bl_blood_inventory_v1';

export function getBloodInventory(orgEmail) {
  try {
    const raw = localStorage.getItem(BLOOD_INVENTORY_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return orgEmail ? all.filter(item => item.orgEmail === orgEmail) : all;
  } catch (_) {
    return [];
  }
}

export function addBloodToInventory(orgEmail, bloodData) {
  const inventory = getBloodInventory();
  const {
    bloodGroup,
    donationType = 'Whole Blood',
    units = 1,
    expirationDate
  } = bloodData;

  // Calculate expiration date if not provided
  let calculatedExpiration = expirationDate;
  if (!calculatedExpiration) {
    const today = new Date();
    let daysToExpire = 42; // Default for Whole Blood
    
    if (donationType === 'Plasma') {
      daysToExpire = 365;
    } else if (donationType === 'Platelets') {
      daysToExpire = 5;
    } else if (donationType === 'Cryo') {
      daysToExpire = 365; // Cryoprecipitate: 1 year frozen
    } else if (donationType === 'White Cells') {
      daysToExpire = 1; // White cells: 24 hours
    } else if (donationType === 'Granulocytes') {
      daysToExpire = 1; // Granulocytes: 24 hours
    } else if (donationType === 'Red Blood Cells') {
      daysToExpire = 42;
    } else if (donationType === 'Double Red Cells') {
      daysToExpire = 42;
    }
    
    today.setDate(today.getDate() + daysToExpire);
    calculatedExpiration = today.toISOString();
  }

  // Check if inventory item already exists for this org, blood group, and type
  const existingIndex = inventory.findIndex(item => 
    item.orgEmail === orgEmail &&
    item.bloodGroup === bloodGroup &&
    item.donationType === donationType &&
    item.expirationDate === calculatedExpiration
  );

  if (existingIndex !== -1) {
    // Update existing inventory
    inventory[existingIndex].units += units;
    inventory[existingIndex].updatedAt = new Date().toISOString();
  } else {
    // Add new inventory item
    inventory.push({
      id: Date.now().toString(),
      orgEmail,
      bloodGroup,
      donationType,
      units,
      expirationDate: calculatedExpiration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  localStorage.setItem(BLOOD_INVENTORY_KEY, JSON.stringify(inventory));
  return true;
}

export function removeBloodFromInventory(orgEmail, bloodData) {
  const inventory = getBloodInventory();
  const {
    bloodGroup,
    donationType = 'Whole Blood',
    units = 1
  } = bloodData;

  // Find matching inventory items (sorted by expiration date - use oldest first)
  // If donationType is specified, match exactly; otherwise match any type for that blood group
  const matchingItems = inventory
    .filter(item => {
      if (item.orgEmail !== orgEmail || item.bloodGroup !== bloodGroup) return false;
      if (donationType && donationType !== 'Whole Blood') {
        return item.donationType === donationType;
      }
      // If no specific type or Whole Blood, match any type
      return true;
    })
    .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));

  let remainingUnits = units;

  for (const item of matchingItems) {
    if (remainingUnits <= 0) break;

    if (item.units <= remainingUnits) {
      remainingUnits -= item.units;
      const index = inventory.findIndex(i => i.id === item.id);
      if (index !== -1) {
        inventory.splice(index, 1);
      }
    } else {
      item.units -= remainingUnits;
      item.updatedAt = new Date().toISOString();
      remainingUnits = 0;
    }
  }

  localStorage.setItem(BLOOD_INVENTORY_KEY, JSON.stringify(inventory));
  return remainingUnits === 0; // Return true if all units were removed
}

export function updateDonationStatus(donationId, status, donationData = {}) {
  const donations = getDonations();
  const idx = donations.findIndex(d => d.id === donationId);
  if (idx === -1) return false;
  
  const donation = donations[idx];
  const oldStatus = donation.status;
  donations[idx].status = status;
  donations[idx].updatedAt = new Date().toISOString();
  
  // Add donation type and units if provided
  if (donationData.donationType) {
    donations[idx].donationType = donationData.donationType;
  }
  if (donationData.units) {
    donations[idx].units = donationData.units;
  }
  
  localStorage.setItem(DONATIONS_KEY, JSON.stringify(donations));
  
  // Update user's donation count if status changed from pending to approved
  if (oldStatus === 'pending' && status === 'approved' && donation.userEmail) {
    const user = findUserByEmail(donation.userEmail);
    if (user) {
      const donationCount = (user.donationCount || 0) + 1;
      updateUser(donation.userEmail, {
        lastDonationAt: donation.eventDate || donation.createdAt || new Date().toISOString(),
        donationCount
      });
    }
    
    // Add to blood inventory if donation type and units are provided
    if (donationData.donationType && donationData.units) {
      // Try to find organization by matching city or event name
      const allOrgs = getOrganizationAccounts();
      let orgEmail = null;
      
      // First try to find by event name matching org name
      if (donation.eventName) {
        const matchingOrg = allOrgs.find(org => {
          const eventName = donation.eventName.toLowerCase();
          const orgName = org.name.toLowerCase();
          return eventName.includes(orgName) || orgName.includes(eventName);
        });
        if (matchingOrg) {
          orgEmail = matchingOrg.email;
        }
      }
      
      // If not found, try by city
      if (!orgEmail && donation.city) {
        const matchingOrg = allOrgs.find(org => 
          org.city && org.city.toLowerCase() === donation.city.toLowerCase()
        );
        if (matchingOrg) {
          orgEmail = matchingOrg.email;
        }
      }
      
      // Last resort: use current organization
      if (!orgEmail) {
        const currentOrg = getCurrentOrganization();
        orgEmail = currentOrg?.email;
      }
      
      if (orgEmail) {
        addBloodToInventory(orgEmail, {
          bloodGroup: donation.bloodGroup,
          donationType: donationData.donationType,
          units: donationData.units,
          expirationDate: donationData.expirationDate
        });
      }
    }
  }
  
  return true;
}


