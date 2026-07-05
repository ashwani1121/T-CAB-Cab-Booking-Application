const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Get all subscription plans (with filters, pagination, search)
router.get('/plans', adminAuthMiddleware, subscriptionController.getPlans);

// Get single subscription plan by ID
router.get('/plans/:id', adminAuthMiddleware, subscriptionController.getPlanById);

// Create subscription plan
router.post('/plans', adminAuthMiddleware, subscriptionController.createPlan);

// Update subscription plan
router.put('/plans/:id', adminAuthMiddleware, subscriptionController.updatePlan);

// Delete subscription plan
router.delete('/plans/:id', adminAuthMiddleware, subscriptionController.deletePlan);

module.exports = router;