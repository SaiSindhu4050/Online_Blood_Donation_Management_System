const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getActionQueue,
  getInventoryHeatmap
} = require('../controllers/adminDashboard.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');

// All routes require admin authentication
router.get('/stats', protect, isAdmin, getDashboardStats);
router.get('/action-queue', protect, isAdmin, getActionQueue);
router.get('/inventory-heatmap', protect, isAdmin, getInventoryHeatmap);

module.exports = router;
