const express = require('express');
const router  = express.Router();
const vehicleTypesController = require('../controllers/vehicleTypesController');
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');

// Fetch all vehicle types data
router.get('/', vehicleTypesController.getVehicleTypes);

// Create a vehicle type
router.post('/', uploadMiddleware.vehicleTypeUpload, handleMulterError, vehicleTypesController.createVehicleType);

// Update a vehicle type
router.put('/:id', uploadMiddleware.vehicleTypeUpload, handleMulterError, vehicleTypesController.updateVehicleType);

// Delete a vehicle type
router.delete('/:id', vehicleTypesController.deleteVehicleType);

module.exports = router;