/**
 * Donor-First Workflow Processor
 * Handles automatic phase transitions for the 2-hour rule workflow
 */

const { Request, Donation, Notification, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Process workflow phases for all active requests
 * This should be called periodically (e.g., every 5 minutes via cron job)
 */
async function processWorkflowPhases() {
  try {
    const now = new Date();
    
    // Get all requests in workflow phases
    const activeRequests = await Request.findAll({
      where: {
        workflowPhase: { [Op.in]: ['gathering', 'critical_wait', 'assessment'] },
        status: { [Op.notIn]: ['fulfilled', 'cancelled'] }
      },
      include: [
        {
          model: Donation,
          as: 'interestedDonations',
          where: { status: { [Op.in]: ['approved', 'scheduled', 'completed'] } },
          required: false
        }
      ]
    });

    for (const request of activeRequests) {
      const requestCreatedAt = new Date(request.requestCreatedAt || request.createdAt);
      const requestAge = (now - requestCreatedAt) / (1000 * 60); // minutes
      
      // Calculate units collected from completed donations
      const unitsCollected = request.interestedDonations?.filter(d => d.status === 'completed').length || 0;
      
      // Phase 3: Assessment (1 hour mark)
      if (requestAge >= 60 && request.workflowPhase !== 'assessment' && request.workflowPhase !== 'hard_stop') {
        await handleAssessmentPhase(request, unitsCollected);
      }
      
      // Phase 4: Hard Stop (2 hour mark)
      if (requestAge >= 120 && request.workflowPhase !== 'hard_stop') {
        await handleHardStopPhase(request, unitsCollected);
      }
      
      // Check if 30-minute wait period has ended
      if (request.workflowPhase === 'critical_wait' && request.waitForDonorsEndsAt) {
        const waitEndsAt = new Date(request.waitForDonorsEndsAt);
        if (now >= waitEndsAt) {
          // 30 minutes passed, but we continue to assessment/hard stop phases
          // The admin can still use emergency override if needed
        }
      }
    }
  } catch (error) {
    console.error('Error processing workflow phases:', error);
  }
}

/**
 * Handle Phase 3: Assessment (1 hour mark)
 */
async function handleAssessmentPhase(request, unitsCollected) {
  try {
    const unitsNeeded = Math.max(0, request.unitsRequired - unitsCollected);
    
    // Update request to assessment phase
    await request.update({
      workflowPhase: 'assessment',
      assessmentAt: new Date(),
      unitsCollected: unitsCollected,
      finalCallSent: true
    });
    
    // Send "Final Call" notification to nearby compatible donors
    // This would trigger a notification system similar to request creation
    // For now, we'll just update the status
    
    console.log(`Request ${request.id} moved to Assessment phase. Units collected: ${unitsCollected}/${request.unitsRequired}`);
  } catch (error) {
    console.error(`Error handling assessment phase for request ${request.id}:`, error);
  }
}

/**
 * Handle Phase 4: Hard Stop (2 hour mark)
 */
async function handleHardStopPhase(request, unitsCollected) {
  try {
    const unitsNeeded = Math.max(0, request.unitsRequired - unitsCollected);
    
    // Update request to hard stop phase
    await request.update({
      workflowPhase: 'hard_stop',
      hardStopAt: new Date(),
      inventoryLocked: false, // Unlock inventory
      inventoryUnlockedAt: new Date(),
      unitsCollected: unitsCollected,
      status: 'matched' // Change status to indicate inventory can be used
    });
    
    // Send thank you messages to donors who completed donations
    const completedDonations = await Donation.findAll({
      where: {
        requestId: request.id,
        status: 'completed'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email']
        }
      ]
    });
    
    // Create thank you notifications for donors
    const thankYouNotifications = completedDonations.map(donation => ({
      userId: donation.userId,
      type: 'DONATION_COMPLETE',
      title: '🎉 You Saved a Life Today!',
      message: `Your blood donation for ${request.bloodGroup} blood request has been used to help save a life. Thank you for your generosity!`,
      referenceId: request.id,
      isRead: false
    }));
    
    if (thankYouNotifications.length > 0) {
      await Notification.bulkCreate(thankYouNotifications);
    }
    
    console.log(`Request ${request.id} moved to Hard Stop phase. Inventory unlocked. Units needed from inventory: ${unitsNeeded}`);
    
    // Note: The organization dashboard should show a message like:
    // "Shortage of X units. Please release X units from stock now."
  } catch (error) {
    console.error(`Error handling hard stop phase for request ${request.id}:`, error);
  }
}

/**
 * Update units collected when a donation is completed
 */
async function updateUnitsCollected(requestId) {
  try {
    const completedDonations = await Donation.count({
      where: {
        requestId: requestId,
        status: 'completed'
      }
    });
    
    await Request.update(
      { unitsCollected: completedDonations },
      { where: { id: requestId } }
    );
  } catch (error) {
    console.error(`Error updating units collected for request ${requestId}:`, error);
  }
}

module.exports = {
  processWorkflowPhases,
  handleAssessmentPhase,
  handleHardStopPhase,
  updateUnitsCollected
};
