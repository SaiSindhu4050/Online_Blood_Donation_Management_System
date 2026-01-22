const { PreScreeningQuestion, EventPreScreening, PreScreeningResponse, Event, Donation, User, Notification } = require('../models');
const { Op } = require('sequelize');

// @desc    Get pre-screening questions for event
// @route   GET /api/events/:id/pre-screening/questions
// @access  Public
exports.getEventPreScreeningQuestions = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!event.requiresPreScreening) {
      return res.json({ success: true, questions: [], requiresPreScreening: false });
    }

    const eventQuestions = await EventPreScreening.findAll({
      where: { eventId: event.id },
      include: [
        {
          model: PreScreeningQuestion,
          as: 'question',
          required: true,
          where: { isActive: true }
        }
      ],
      order: [['orderIndex', 'ASC']]
    });

    const questions = eventQuestions.map(eq => ({
      id: eq.question.id,
      questionText: eq.question.questionText,
      questionType: eq.question.questionType,
      options: eq.question.options,
      isRequired: eq.isRequired,
      disqualifyingAnswer: eq.question.disqualifyingAnswer,
      orderIndex: eq.orderIndex
    }));

    res.json({ 
      success: true, 
      questions,
      requiresPreScreening: true,
      deadline: event.preScreeningDeadline
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit pre-screening responses
// @route   POST /api/events/:id/pre-screening/submit
// @access  Public
exports.submitPreScreening = async (req, res) => {
  try {
    const { responses, donationId } = req.body;
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!event.requiresPreScreening) {
      return res.status(400).json({ 
        success: false, 
        message: 'This event does not require pre-screening' 
      });
    }

    // Check deadline
    if (event.preScreeningDeadline && new Date(event.preScreeningDeadline) < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pre-screening deadline has passed' 
      });
    }

    // Get required questions
    const eventQuestions = await EventPreScreening.findAll({
      where: { eventId: event.id, isRequired: true },
      include: [
        {
          model: PreScreeningQuestion,
          as: 'question',
          required: true
        }
      ]
    });

    // Validate all required questions are answered
    const requiredQuestionIds = eventQuestions.map(eq => eq.questionId);
    const answeredQuestionIds = Object.keys(responses || {}).map(id => parseInt(id));

    const missingQuestions = requiredQuestionIds.filter(id => !answeredQuestionIds.includes(id));
    if (missingQuestions.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'All required questions must be answered',
        missingQuestions 
      });
    }

    // Check eligibility
    let isEligible = true;
    const responseRecords = [];

    for (const [questionId, answer] of Object.entries(responses)) {
      const question = await PreScreeningQuestion.findByPk(questionId);
      if (!question) continue;

      const isDisqualifying = question.disqualifyingAnswer && 
        answer.toString().toLowerCase() === question.disqualifyingAnswer.toString().toLowerCase();

      if (isDisqualifying) {
        isEligible = false;
      }

      const responseRecord = await PreScreeningResponse.create({
        eventId: event.id,
        donationId: donationId || null,
        userId: req.user && req.userType === 'user' ? req.user.id : null,
        userEmail: req.user && req.userType === 'user' ? req.user.email : req.body.email,
        questionId: parseInt(questionId),
        answer: answer.toString(),
        isEligible: !isDisqualifying
      });

      responseRecords.push(responseRecord);
    }

    // Auto-reject if ineligible and autoRejectIneligible is enabled
    if (!isEligible && event.autoRejectIneligible) {
      if (donationId) {
        const donation = await Donation.findByPk(donationId);
        if (donation) {
          await donation.update({ status: 'cancelled' });
        }
      }

      // Send notification
      if (req.user && req.userType === 'user') {
        await Notification.create({
          userId: req.user.id,
          type: 'PRE_SCREENING_INELIGIBLE',
          title: `❌ Pre-screening: Not Eligible`,
          message: `You are not eligible to participate in "${event.name}" based on your pre-screening responses. Please contact the organization if you have questions.`,
          isRead: false,
          referenceId: event.id
        });
      }

      return res.status(400).json({ 
        success: false, 
        isEligible: false,
        message: 'You are not eligible to participate in this event based on your responses',
        responses: responseRecords
      });
    }

    // Send confirmation notification
    if (req.user && req.userType === 'user') {
      await Notification.create({
        userId: req.user.id,
        type: 'PRE_SCREENING_COMPLETED',
        title: `✅ Pre-screening Completed`,
        message: `You have completed pre-screening for "${event.name}". You are eligible to participate.`,
        isRead: false,
        referenceId: event.id
      });
    }

    res.json({ 
      success: true, 
      isEligible,
      message: isEligible ? 'Pre-screening completed successfully' : 'Pre-screening completed but eligibility pending review',
      responses: responseRecords
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's pre-screening responses for event
// @route   GET /api/events/:id/pre-screening/responses
// @access  Private (User)
exports.getUserPreScreeningResponses = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const responses = await PreScreeningResponse.findAll({
      where: {
        eventId: event.id,
        userId: req.user.id
      },
      include: [
        {
          model: PreScreeningQuestion,
          as: 'question',
          attributes: ['id', 'questionText', 'questionType']
        }
      ],
      order: [['respondedAt', 'DESC']]
    });

    res.json({ success: true, responses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create/update pre-screening question
// @route   POST /api/pre-screening/questions
// @route   PUT /api/pre-screening/questions/:id
// @access  Private (Organization)
exports.managePreScreeningQuestion = async (req, res) => {
  try {
    const { questionText, questionType, options, isRequired, disqualifyingAnswer, orderIndex, isActive } = req.body;

    if (req.method === 'POST') {
      const question = await PreScreeningQuestion.create({
        organizationId: req.user.id,
        questionText,
        questionType: questionType || 'yes_no',
        options: options || null,
        isRequired: isRequired !== false,
        disqualifyingAnswer: disqualifyingAnswer || null,
        orderIndex: orderIndex || 0,
        isActive: isActive !== false
      });

      res.status(201).json({ success: true, question });
    } else {
      const question = await PreScreeningQuestion.findByPk(req.params.id);
      if (!question) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }

      if (question.organizationId !== req.user.id && question.organizationId !== null) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await question.update({
        questionText: questionText || question.questionText,
        questionType: questionType || question.questionType,
        options: options !== undefined ? options : question.options,
        isRequired: isRequired !== undefined ? isRequired : question.isRequired,
        disqualifyingAnswer: disqualifyingAnswer !== undefined ? disqualifyingAnswer : question.disqualifyingAnswer,
        orderIndex: orderIndex !== undefined ? orderIndex : question.orderIndex,
        isActive: isActive !== undefined ? isActive : question.isActive
      });

      res.json({ success: true, question });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add/remove questions from event
// @route   POST /api/events/:id/pre-screening/questions
// @route   DELETE /api/events/:id/pre-screening/questions/:questionId
// @access  Private (Organization)
exports.manageEventPreScreening = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizationId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.method === 'POST') {
      const { questionId, isRequired, orderIndex } = req.body;
      
      const [eventPreScreening, created] = await EventPreScreening.findOrCreate({
        where: { eventId: event.id, questionId },
        defaults: {
          isRequired: isRequired !== false,
          orderIndex: orderIndex || 0
        }
      });

      if (!created) {
        await eventPreScreening.update({
          isRequired: isRequired !== undefined ? isRequired : eventPreScreening.isRequired,
          orderIndex: orderIndex !== undefined ? orderIndex : eventPreScreening.orderIndex
        });
      }

      // Enable pre-screening for event
      await event.update({ requiresPreScreening: true });

      res.json({ success: true, eventPreScreening });
    } else {
      await EventPreScreening.destroy({
        where: { eventId: event.id, questionId: req.params.questionId }
      });

      // Check if any questions remain
      const remainingQuestions = await EventPreScreening.count({
        where: { eventId: event.id }
      });

      if (remainingQuestions === 0) {
        await event.update({ requiresPreScreening: false });
      }

      res.json({ success: true, message: 'Question removed from event' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
