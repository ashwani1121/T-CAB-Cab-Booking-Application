const express             = require('express');
const router              = express.Router();
const adminController     = require('../controllers/adminController');
const rankingsController  = require('../controllers/rankingsController');
const apiController       = require('../controllers/api/apiController'); 
const adminAuthMiddleware = require('../middleware/adminAuth');

// PUBLIC ROUTES 
router.post('/login', adminController.loginUser);
router.post('/refresh/token', apiController.refreshToken);

// PROTECTED ROUTES 
router.post('/logout', adminAuthMiddleware, adminController.logoutUser);
router.get('/dashboard', adminAuthMiddleware, adminController.getDashboardData);
router.get('/completed-rides-chart', adminAuthMiddleware, adminController.getCompletedRidesChart);
router.get('/revenue-chart', adminAuthMiddleware, adminController.getRevenueChart);
router.get('/ride-status-chart', adminAuthMiddleware, adminController.getRideStatusChart);
router.get('/payment-type-chart', adminAuthMiddleware, adminController.getPaymentTypeChart);
router.get('/supply-demand-chart', adminAuthMiddleware, adminController.getDriverSupplyDemandChart);
router.get('/top-locations-chart', adminAuthMiddleware, adminController.getTopLocationsChart);
router.get('/top-ranking-drivers', adminAuthMiddleware, rankingsController.topRankingDriversChart);

module.exports = router;