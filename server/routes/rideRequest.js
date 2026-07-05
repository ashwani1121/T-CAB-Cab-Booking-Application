const express                                 = require('express');
const router                                  = express.Router();
const { uploadMiddleware, handleMulterError } = require("../middleware/upload");
const rideRequestController                   = require('../controllers/rideRequestController');

// Get all passenger with pagination and filters
router.get('/', rideRequestController.rideRequestDetails);

// Get particular ride details by ID
router.get('/:id', rideRequestController.getRideDetails);

module.exports = router;


