const express           = require('express');
const router            = express.Router();
const couponsController = require('../controllers/couponsController');

// Insert coupons
router.post('/', couponsController.createCoupon);

// Retrieve coupons
router.get('/', couponsController.getCoupons);

// Retrieve vehicle type
router.get('/api/vehicle-types', couponsController.getVehicleTypes);

// Update coupons
router.put('/:id', couponsController.updateCoupon);

// Delete coupons
router.delete('/:id', couponsController.deleteCoupon);

module.exports = router;