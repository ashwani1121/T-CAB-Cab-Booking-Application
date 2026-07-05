const express = require('express');
const router = express.Router();
const cancellationPolicyController = require('../controllers/cancellationPolicyController');

// Get all policies
router.get('/', cancellationPolicyController.getCancellationPolicy);

// Get single policy by ID
router.get('/:id', cancellationPolicyController.getCancellationPolicyById);

// Create new policy
router.post('/', cancellationPolicyController.createCancellationPolicy);

// Update policy
router.put('/:id', cancellationPolicyController.updateCancellationPolicy);

// Delete policy
router.delete('/:id', cancellationPolicyController.deleteCancellationPolicy);

module.exports = router;
