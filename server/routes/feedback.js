const express = require('express');
const router  = express.Router();
const feedbackController = require('../controllers/feedbackController');

// Fetch all team members
router.get('/', feedbackController.getFeedback);

// Get feedback member by ID
router.get('/:id', feedbackController.getFeedbackById);

// Create a feedback member
router.post('/', feedbackController.createFeedback);

// Update a feedback member
router.put('/:id', feedbackController.updateFeedback);

// Delete a feedback member (soft delete)
router.delete('/:id', feedbackController.deleteFeedback);

module.exports = router;