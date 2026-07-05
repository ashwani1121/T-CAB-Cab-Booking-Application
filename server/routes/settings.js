const express = require('express');
const router  = express.Router();
const settingsController = require('../controllers/settingsController');
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');

// add/update
router.post('/',uploadMiddleware.settingsUpload,handleMulterError,settingsController.saveSettings);

// retrieve data
router.get('/', settingsController.getSettings);

module.exports = router;