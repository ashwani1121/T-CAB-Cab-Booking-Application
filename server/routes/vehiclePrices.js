const express = require('express');
const router  = express.Router();
const vehiclesPricesController = require('../controllers/vehiclesPricesController');

// Fetch all vehicle types data
router.get('/', vehiclesPricesController.getVehiclePrices);

// Create a vehicle type
router.post('/', vehiclesPricesController.createVehiclePrice);

// Update a vehicle type
router.put('/:id', vehiclesPricesController.updateVehiclePrice);

// Delete a vehicle type
router.delete('/:id', vehiclesPricesController.deleteVehiclePrice);

// Fetch all states  data
router.get('/states', vehiclesPricesController.getStates);

// Based on vehicle, vehicle type as to display
router.get('/vehicle-types/:vehicleId', vehiclesPricesController.getVehicleTypesByVehicle);

module.exports = router;