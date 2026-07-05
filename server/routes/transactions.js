const express = require('express');
const router  = express.Router();
const transactionsController = require('../controllers/transactionsController');

// Fetch all driver deposit transactions 
router.get('/driverDeposit', transactionsController.getDriverDepositTransactions);

// Fetch all Advance reservation
router.get('/reservation-advance', transactionsController.getReservationAdvanceTransactions);

// Fetch all Advance reservation by id
router.get('/reservation-advance/:id', transactionsController.getReservationAdvanceTransactionById);

module.exports = router;