const express            = require('express');
const router             = express.Router();
const rankingsController = require('../controllers/rankingsController');
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');

// Get all rankings with pagination and filters
router.get('/', rankingsController.topRankingDrivers);

// GET existing Winners images 
router.get('/winners-banner', rankingsController.getWinnersBanner);

// POST to update Winners Banner images 
router.post('/winners-banner', uploadMiddleware.rankingsUpload, handleMulterError, rankingsController.updateWinnersBanner);

module.exports = router;