const express            = require('express');
const router             = express.Router();
const servicesController = require('../controllers/servicesController');

// Insert services
router.post('/', servicesController.createService);

// Retrieve services
router.get('/', servicesController.getServices);

// Retrieve vehicle type
router.get('/api/vehicle-types', servicesController.getVehicleTypes);

// Get single service by ID
router.get('/:id', servicesController.getServiceById);

// Update services
router.put('/:id', servicesController.updateService);

// Delete services
router.delete('/:id', servicesController.deleteService);

module.exports = router;