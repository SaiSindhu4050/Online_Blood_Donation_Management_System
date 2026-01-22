const express = require('express');
const router = express.Router();
const {
  getEventPreScreeningQuestions,
  submitPreScreening,
  getUserPreScreeningResponses,
  managePreScreeningQuestion,
  manageEventPreScreening
} = require('../controllers/preScreening.controller');
const { protect, isOrganization } = require('../middleware/auth.middleware');

// Get pre-screening questions for event (public)
router.get('/events/:id/pre-screening/questions', getEventPreScreeningQuestions);

// Submit pre-screening responses (public)
router.post('/events/:id/pre-screening/submit', submitPreScreening);

// Get user's responses (user only)
router.get('/events/:id/pre-screening/responses', protect, getUserPreScreeningResponses);

// Create/update pre-screening question (organization only)
router.post('/pre-screening/questions', protect, isOrganization, managePreScreeningQuestion);
router.put('/pre-screening/questions/:id', protect, isOrganization, managePreScreeningQuestion);

// Add/remove questions from event (organization only)
router.post('/events/:id/pre-screening/questions', protect, isOrganization, manageEventPreScreening);
router.delete('/events/:id/pre-screening/questions/:questionId', protect, isOrganization, manageEventPreScreening);

module.exports = router;
