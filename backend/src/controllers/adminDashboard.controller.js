const { User, Organization, Request, Donation, BloodInventory, Testimonial, Event } = require('../models');
const { Op } = require('sequelize');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Total Users
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const inactiveUsers = totalUsers - activeUsers;

    // Total Organizations
    const totalOrgs = await Organization.count();
    const verifiedOrgs = await Organization.count({ where: { isVerified: true, isActive: true } });
    const pendingOrgs = await Organization.count({ where: { isVerified: false, isActive: true } });

    // Active Requests
    const openRequests = await Request.count({
      where: {
        status: { [Op.in]: ['pending', 'IN_PROGRESS', 'matched'] }
      }
    });

    const emergencyRequests = await Request.count({
      where: {
        urgency: { [Op.in]: ['emergency', 'urgent'] },
        status: { [Op.in]: ['pending', 'IN_PROGRESS', 'matched'] }
      }
    });

    // Fulfilled Today
    const fulfilledToday = await Request.count({
      where: {
        status: 'fulfilled',
        updatedAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd
        }
      }
    });

    // Fulfilled Yesterday (for comparison)
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const fulfilledYesterday = await Request.count({
      where: {
        status: 'fulfilled',
        updatedAt: {
          [Op.gte]: yesterdayStart,
          [Op.lt]: todayStart
        }
      }
    });

    const fulfilledDiff = fulfilledToday - fulfilledYesterday;

    // Total Donations This Month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const donationsThisMonth = await Donation.count({
      where: {
        status: 'completed',
        createdAt: { [Op.gte]: monthStart }
      }
    });

    // Donations This Week
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const donationsThisWeek = await Donation.count({
      where: {
        status: 'completed',
        createdAt: { [Op.gte]: weekStart }
      }
    });

    // Events Statistics
    const totalEvents = await Event.count({
      where: {
        cancelledAt: null // Exclude cancelled events from total
      }
    });
    
    // Debug: Get all events to see what we have
    const allEvents = await Event.findAll({
      attributes: ['id', 'name', 'eventDate', 'status', 'cancelledAt'],
      order: [['eventDate', 'ASC']]
    });
    
    console.log('=== EVENTS DEBUG ===');
    console.log('Current time (now):', now);
    console.log('Total events found:', allEvents.length);
    allEvents.forEach(event => {
      console.log(`Event: ${event.name}`);
      console.log(`  - ID: ${event.id}`);
      console.log(`  - eventDate: ${event.eventDate}`);
      console.log(`  - status: ${event.status}`);
      console.log(`  - cancelledAt: ${event.cancelledAt}`);
      console.log(`  - eventDate >= now: ${new Date(event.eventDate) >= now}`);
      console.log(`  - cancelledAt is null: ${event.cancelledAt === null}`);
      console.log(`  - status not in [ongoing, completed, cancelled]: ${!['ongoing', 'completed', 'cancelled'].includes(event.status)}`);
    });
    
    // Upcoming events: eventDate is in the future AND not cancelled
    // Handle NULL status values - if status is NULL, treat as 'upcoming'
    const upcomingEvents = await Event.count({
      where: {
        eventDate: { [Op.gte]: now },
        cancelledAt: null,
        [Op.or]: [
          { status: 'upcoming' },
          { status: null },
          { 
            status: { 
              [Op.notIn]: ['ongoing', 'completed', 'cancelled'] 
            } 
          }
        ]
      }
    });
    
    console.log('Upcoming events count:', upcomingEvents);
    console.log('===================');
    
    const ongoingEvents = await Event.count({
      where: {
        status: 'ongoing',
        cancelledAt: null
      }
    });
    
    const completedEvents = await Event.count({
      where: {
        status: 'completed'
      }
    });
    
    const cancelledEvents = await Event.count({
      where: {
        cancelledAt: { [Op.ne]: null }
      }
    });

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers
        },
        organizations: {
          total: totalOrgs,
          verified: verifiedOrgs,
          pending: pendingOrgs
        },
        requests: {
          open: openRequests,
          emergency: emergencyRequests,
          fulfilledToday: fulfilledToday,
          fulfilledYesterday: fulfilledYesterday,
          fulfilledDiff: fulfilledDiff
        },
        donations: {
          thisMonth: donationsThisMonth,
          thisWeek: donationsThisWeek
        },
        events: {
          total: totalEvents,
          upcoming: upcomingEvents,
          ongoing: ongoingEvents,
          completed: completedEvents,
          cancelled: cancelledEvents
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// @desc    Get action required queue
// @route   GET /api/admin/dashboard/action-queue
// @access  Private (Admin)
exports.getActionQueue = async (req, res) => {
  try {
    // Pending Organization Verifications
    const pendingVerifications = await Organization.findAll({
      where: {
        isVerified: false,
        isActive: true
      },
      attributes: ['id', 'name', 'email', 'city', 'state', 'createdAt'],
      order: [['createdAt', 'ASC']],
      limit: 10
    });

    // Flagged Users (users with reports or issues - for now, we'll use inactive as flagged)
    // In a real system, you'd have a separate reports/flags table
    const flaggedUsers = await User.findAll({
      where: {
        isActive: false // For now, using inactive as flagged
      },
      attributes: ['id', 'fullName', 'email', 'city', 'state', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    // Pending Testimonials
    const pendingTestimonials = await Testimonial.count({
      where: {
        status: 'pending'
      }
    });

    res.json({
      success: true,
      actionQueue: {
        pendingVerifications: pendingVerifications.map(org => ({
          id: org.id,
          name: org.name,
          email: org.email,
          city: org.city,
          state: org.state,
          submittedAt: org.createdAt
        })),
        flaggedUsers: flaggedUsers.map(user => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          city: user.city,
          state: user.state,
          flaggedAt: user.updatedAt
        })),
        pendingTestimonials: pendingTestimonials
      }
    });
  } catch (error) {
    console.error('Error fetching action queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch action queue'
    });
  }
};

// @desc    Get inventory heatmap data
// @route   GET /api/admin/dashboard/inventory-heatmap
// @access  Private (Admin)
exports.getInventoryHeatmap = async (req, res) => {
  try {
    const { bloodGroup } = req.query;

    // Get all organizations with their inventory
    const organizations = await Organization.findAll({
      where: { isActive: true, isVerified: true },
      include: [{
        model: BloodInventory,
        as: 'inventory',
        where: bloodGroup ? { bloodGroup } : {},
        required: false,
        attributes: ['bloodGroup', 'units', 'expirationDate']
      }],
      attributes: ['id', 'name', 'city', 'state', 'zipCode']
    });

    // Group by state/city and calculate availability
    const regionMap = new Map();

    organizations.forEach(org => {
      const regionKey = org.state || org.city || 'Unknown';
      
      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, {
          name: regionKey,
          state: org.state,
          cities: new Set(),
          bloodGroups: {},
          totalUnits: 0,
          organizations: []
        });
      }

      const region = regionMap.get(regionKey);
      if (org.city) region.cities.add(org.city);
      region.organizations.push({
        id: org.id,
        name: org.name,
        city: org.city
      });

      // Aggregate inventory by blood group
      if (org.inventory && org.inventory.length > 0) {
        org.inventory.forEach(inv => {
          if (!region.bloodGroups[inv.bloodGroup]) {
            region.bloodGroups[inv.bloodGroup] = 0;
          }
          region.bloodGroups[inv.bloodGroup] += inv.units || 0;
          region.totalUnits += inv.units || 0;
        });
      }
    });

    // Convert to array and calculate availability levels
    const regions = Array.from(regionMap.values()).map(region => {
      // Calculate availability percentage (simplified - using total units as indicator)
      // In a real system, you'd compare against demand or capacity
      let availabilityLevel = 'good'; // good, moderate, low, critical
      let availabilityPercent = 100;

      if (region.totalUnits === 0) {
        availabilityLevel = 'critical';
        availabilityPercent = 0;
      } else if (region.totalUnits < 50) {
        availabilityLevel = 'low';
        availabilityPercent = 30;
      } else if (region.totalUnits < 100) {
        availabilityLevel = 'moderate';
        availabilityPercent = 60;
      } else {
        availabilityLevel = 'good';
        availabilityPercent = 100;
      }

      return {
        name: region.name,
        state: region.state,
        cities: Array.from(region.cities),
        bloodGroups: region.bloodGroups,
        totalUnits: region.totalUnits,
        availabilityLevel,
        availabilityPercent,
        organizationCount: region.organizations.length
      };
    });

    // Sort by total units (descending)
    regions.sort((a, b) => b.totalUnits - a.totalUnits);

    res.json({
      success: true,
      regions
    });
  } catch (error) {
    console.error('Error fetching inventory heatmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory heatmap data'
    });
  }
};
