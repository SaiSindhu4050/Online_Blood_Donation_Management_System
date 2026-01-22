const express = require('express');
const router = express.Router();
const {
  createTestimonial,
  getUserTestimonials,
  getPublicTestimonials,
  updateTestimonial,
  deleteTestimonial,
  approveTestimonial,
  featureTestimonial
} = require('../controllers/testimonial.controller');
const { protect } = require('../middleware/auth.middleware');

// Public endpoint - get approved testimonials for home page
router.get('/public', getPublicTestimonials);

// User endpoints - require authentication
router.post('/', protect, createTestimonial);
router.get('/user/:userId', protect, getUserTestimonials);
router.put('/:id', protect, updateTestimonial);
router.delete('/:id', protect, deleteTestimonial);

// Organization endpoints - require organization authentication
router.put('/:id/approve', protect, approveTestimonial);
router.put('/:id/feature', protect, featureTestimonial);

module.exports = router;
