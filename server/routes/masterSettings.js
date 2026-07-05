const express = require('express');
const router  = express.Router();
const masterSettingsController = require('../controllers/masterSettingsController');

// GET master settings
router.get('/', masterSettingsController.getMasterSettings);

// POST/UPDATE master settings
router.post('/', masterSettingsController.updateMasterSettings);

module.exports = router;