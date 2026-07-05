const express = require('express');
const router  = express.Router();
const { uploadMiddleware, handleMulterError } = require("../middleware/upload");
const passengerController = require('../controllers/passengerController');

// Get all passenger with pagination and filters
router.get('/', passengerController.passengerDetails);

// Get single passenger by ID
router.get('/:id', passengerController.getPassenger);

// Update passenger with file upload
router.put('/:id', uploadMiddleware.profileUpload, handleMulterError, passengerController.updatePassenger);

// Wallet transaction endpoint
router.post('/:id/wallet/transaction', passengerController.walletTransaction);

module.exports = router;


