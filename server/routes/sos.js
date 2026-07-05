const express         = require('express');
const router          = express.Router();
const sosController   = require('../controllers/sosController');

// Fetch all sos data
router.get('/', sosController.getSos);

// Get SOS details by ID
router.get('/:id', sosController.getSosById);

// Update SOS status
router.put('/:id/status', sosController.updateSosStatus);


module.exports = router;
