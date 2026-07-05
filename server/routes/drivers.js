const express = require('express');
const router  = express.Router();
const driversController = require('../controllers/driversController');

// Get all drivers with pagination and filters
router.get('/', driversController.getDrivers);

// Driver Delete Request
router.get('/delete/request', driversController.deleteRequest);

// Handle deletion request (approve/reject)
router.put('/delete/request/:id', driversController.handleDeleteRequest);

// Handle deletion request (approve/reject)
router.get('/delete/request/:id/financial-summary', driversController.getDriverFinancialSummary);

// Get single driver by ID
router.get('/:id', driversController.getDriver);

// Update driver status
router.put('/:id/status', driversController.updateDriverStatus);

// Delete driver (soft delete)
router.delete('/:id', driversController.deleteDriver);

module.exports = router;


