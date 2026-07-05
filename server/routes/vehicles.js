const express = require('express');
const router = express.Router();
const vehiclesController = require('../controllers/vehiclesController');
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');

router.get('/', vehiclesController.getVehicles);
router.post('/', uploadMiddleware.vehicleUpload, handleMulterError, vehiclesController.createVehicle);
router.put('/:id', uploadMiddleware.vehicleUpload, handleMulterError, vehiclesController.updateVehicle);
router.delete('/:id', vehiclesController.deleteVehicle);

module.exports = router;