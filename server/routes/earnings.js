const express = require('express');
const router  = express.Router();
const earningsController = require('../controllers/earningsController');

// Get all passenger with pagination and filters
router.get('/', earningsController.earningsDetails);

// Get particular ride details by ID
router.get('/:id', earningsController.getEarningDetails);

module.exports = router;