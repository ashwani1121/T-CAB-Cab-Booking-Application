const express         = require('express');
const router          = express.Router();
const tripsController = require('../controllers/tripsController');
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');

// Fetch all trips data
router.get('/', tripsController.getTrips);

// Update trip
router.put('/:id', uploadMiddleware.tripUpload, handleMulterError, tripsController.updateTrip);

// Fetch all promotions data
router.get('/promotions', tripsController.getPromotion);

// Update promotions
router.post('/promotions', uploadMiddleware.multipleImageUpload, handleMulterError, tripsController.updatePromotion);

module.exports = router;
