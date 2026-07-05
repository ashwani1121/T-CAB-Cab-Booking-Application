const express            = require('express');
const router             = express.Router();
const packagesController = require('../controllers/packagesController');

// Fetch all packages 
router.get('/', packagesController.getPackages);

// Get packages by ID
router.get('/:id', packagesController.getPackageById);

// Create a packages 
router.post('/', packagesController.createPackage);

// Update a packages 
router.put('/:id', packagesController.updatePackage);

// Delete a packages
router.delete('/:id', packagesController.deletePackage);

module.exports = router;