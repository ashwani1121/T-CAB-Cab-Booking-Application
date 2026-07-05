const express = require('express');
const router  = express.Router();
const { uploadMiddleware, handleMulterError } = require("../middleware/upload");
const reservationController = require('../controllers/reservationController');

// Get all reservations with pagination and filters
router.get('/', reservationController.reservationRideDetails);

// Get particular reservation details by ID
router.get('/:id', reservationController.getReservationDetails);

// Assign driver to custom reservation trip
router.post('/:id/assign-driver', reservationController.assignDriverToReservation);

// Unassign driver from custom reservation trip
router.delete('/:id/assign-driver', reservationController.unassignDriverFromReservation);

module.exports = router;