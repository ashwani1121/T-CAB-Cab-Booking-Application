const express                                 = require("express");
const router                                  = express.Router();
const apiController                           = require("../controllers/api/apiController");
const userController                          = require("../controllers/api/userController");
const driverController                        = require("../controllers/api/driverController");
const rideController                          = require("../controllers/api/rideController");
const settingsController                      = require("../controllers/api/settingsController");
const vehicleController                       = require("../controllers/api/vehicleController");
const couponController                        = require("../controllers/api/couponController");
const walletController                        = require("../controllers/api/walletController");
const easebuzzController                      = require("../controllers/api/easebuzzController");
const sosController                           = require("../controllers/sosController");
const licensingController                     = require("../controllers/licensingController");
const feedbackController                      = require("../controllers/feedbackController");
const rankingsController                      = require("../controllers/rankingsController");
const complaintController                     = require("../controllers/complaintsController");
const bankDetailsController                   = require("../controllers/api/bankDetailsController");
const subscriptionController                  = require("../controllers/api/subscriptionController");
const authMiddleware                          = require("../middleware/auth");
const { uploadMiddleware, handleMulterError } = require("../middleware/upload");

// ====================================
// AUTHENTICATION ROUTES
// ====================================

// Refresh access token
router.post("/refresh/token", apiController.refreshToken);

// Logout user/driver
router.get("/logout", apiController.logout);

// Verify mobile or email account
router.get("/verify/account", apiController.verifyAccount);

// ====================================
// COMPLAINT CATEGORY ROUTES 
// ====================================

// Get complaint history for logged-in user
router.get("/complaint/history", authMiddleware, complaintController.getAppComplaintHistory);

// Get specific complaint details for logged-in user
router.get("/complaint/history/:id", authMiddleware, complaintController.getAppComplaintDetails);

// Get all active complaint categories
router.get("/complaint/categories", authMiddleware, complaintController.getAppCategories);

// Get subcategories for a specific category
router.get("/complaint/categories/:category_id/subcategories", authMiddleware, complaintController.getAppSubcategories);

// Create a Complaint
router.post('/complaint', authMiddleware, complaintController.createComplaint);

// ====================================
// USER MANAGEMENT ROUTES
// ====================================

// User registration and verification
router.post("/user/register", userController.userRegistration);
router.post("/user/verify", userController.verifyUser);

// User profile management
router.get("/user/profile", authMiddleware, userController.userProfile);
router.post("/edit/profile",uploadMiddleware.profileUpload,handleMulterError,authMiddleware,userController.editProfile);

// User address management
router.get("/saved-addresses/:type",authMiddleware,userController.getSavedAddresses);
router.post("/address/favourites", authMiddleware, userController.savedAddress);
router.delete("/saved-address/:id", authMiddleware, userController.deleteSavedAddress);

// User ride history and details
router.get("/rides/history", authMiddleware, userController.rideHistory);
router.get("/rides/:rideId/details",authMiddleware,userController.getRideDetails);
router.get("/user/last-ride", authMiddleware, userController.lastRide);
router.get('/ride/:ride_request_id/fare-breakdown', authMiddleware, rideController.fareBreakdown);

// User feedback and rating
router.get("/user/feedback/:rating", feedbackController.retrieveFeedback);
router.post("/user/rating", authMiddleware, userController.userRating);

// Download invoice as PDF
router.get('/invoice/:rideId/download', authMiddleware, userController.getInvoice);

// User account deletion
router.get('/user/account/delete', authMiddleware, userController.accountDeletion);

// Ride detail sharing - generate link
router.get('/generate-ride/link/:rideId', authMiddleware, userController.generateShareLink); 

// Ride detail sharing - access via tokenized link
router.get('/ride/share/:shareToken', userController.shareRideDetails);

// ====================================
// DRIVER MANAGEMENT ROUTES
// ====================================

// Driver registration and verification
router.post("/driver/register",uploadMiddleware.driverRegistrationUpload,handleMulterError,driverController.driverRegistration);
router.post("/driver/verify", driverController.verifyDriver);
router.get("/driver/profile/:id", driverController.getDriverProfile);
router.post("/driver/edit-profile/:id",uploadMiddleware.profileUpload,handleMulterError, driverController.editProfile);

// Driver status and availability
router.get("/driver/status", authMiddleware, driverController.driverStatus);
router.post("/toggle/status",authMiddleware,driverController.toggleDriverStatus);
router.get("/driver/rules",authMiddleware,driverController.acceptRulesAndRegulations);

// Driver earnings
router.get("/earnings/today", authMiddleware, driverController.earningsPerday);

// Driver discovery
router.post("/driver/nearby-driver",authMiddleware,driverController.nearbyDriver);

// Driver upcoming booking and details
router.get("/rides/booking", authMiddleware, driverController.upcomingBooking);
router.get("/rides/:rideId/bookingDetails",authMiddleware,driverController.getBookingDetails);

// driver account deletion
router.get('/driver/account/delete', authMiddleware, driverController.accountDeletion);

// Reservation Pending Count Route
router.get('/reservation-count', authMiddleware, driverController.reservationCount);

// Reservation Pending Ride
router.get('/reservation-ride', authMiddleware, driverController.reservationRide);

// Reservation Transfer
router.post('/transfer-ride', authMiddleware, rideController.transferRide);

// ====================================
// SUBSCRIPTION ROUTES
// ====================================

// Get active subscription plans (public route - for users/drivers)
router.get('/active-plans', subscriptionController.getActivePlans);

// Get single subscription plan by ID
router.get('/plans/:id', subscriptionController.getPlanById);

// Returns all subscriptions (active, expired, cancelled) for the drive
router.get('/driver/subscription/history', authMiddleware, subscriptionController.getDriverSubscriptionHistory);

// Returns the driver's active subscription details
router.get('/driver/subscription/active', authMiddleware, subscriptionController.getDriverActiveSubscription);

// ====================================
// RIDE MANAGEMENT ROUTES
// ====================================

// Ride pricing and vehicle selection
router.post("/ride/pricelist", rideController.priceList);

// Ride request initiation
router.post("/ride/request", authMiddleware, rideController.requestRide);

// Cancel ride request route
router.post('/cancel/ride-request', authMiddleware, rideController.cancelRideRequest);

// Current ride status
router.get("/user/current-ride", authMiddleware, rideController.getCurrentRide);

// Driver ride workflow (Step-by-step process)
// Step 1: Driver accepts the ride request
router.get("/driver/accept-ride/:ride_request_id",authMiddleware,rideController.acceptRideRequest);

// Step 2: Driver marks as arrived at pickup location
router.post("/driver/arrived-to-pickup",uploadMiddleware.startMeterUpload,handleMulterError,authMiddleware,rideController.driverArrivedToPickup);

// Step 3: Driver verifies OTP and starts the ride
router.post("/verify-otp-start-ride",authMiddleware,rideController.verifyOTPAndStartRide);

// Step 4: Ride completion
router.post("/ride-completed",uploadMiddleware.endMeterUpload,handleMulterError, authMiddleware, rideController.rideCompleted);

// Step 5: Cash collection from user
router.get("/collect-cash/:ride_request_id", authMiddleware, rideController.collectCash);

// Step 6: Ride cancellation
router.post("/ride-cancel", authMiddleware, rideController.rideCancelled);

// Step 6: Reservation Ride cancellation
router.post("/reservation-ridecancel", authMiddleware, rideController.cancelReservationRide);

// Step 7: Tip amount
router.get("/tip-amount", authMiddleware, rideController.tipAmount);

// Driver decline ride request
router.get("/driver/decline-ride/:ride_request_id",authMiddleware,rideController.declineRideRequest);

// Reservation packages
router.get("/reservation-packages",authMiddleware, rideController.reservePackages);

// Reservation ride starts
router.get("/reservation/ride-start/:ride_request_id", authMiddleware, rideController.reservationRideStarts);

// ====================================
// WALLET & PAYMENT ROUTES
// ====================================

// Wallet balance and details
router.get("/wallet/balance",authMiddleware,walletController.getWalletBalance);

// Transaction management
router.get("/wallet/transactions",authMiddleware,walletController.getTransactionHistory);
router.get("/wallet/transactions/:transaction_id",authMiddleware,walletController.getTransactionDetails);

// ====================================
// COUPON MANAGEMENT ROUTES
// ====================================

// Get available coupons for user
router.get("/coupons", authMiddleware, couponController.getCoupons);

// ====================================
// VEHICLE MANAGEMENT ROUTES
// ====================================

// Get all available vehicles
router.get("/vehicles", vehicleController.getVehicles);

// Get specific vehicle type details
router.get("/vehicletypes/:id", vehicleController.getVehicleTypeById);

// Get Vehicle map image
router.get("/vehicle-mapImage/:rideId", vehicleController.getVehicleMapImage);

// ====================================
// APP SETTINGS & CONFIGURATION ROUTES
// ====================================

// Get application settings by role (user/driver)
router.get("/settings/:role", settingsController.getAppSettings);

// Get available trips/ride types
router.get("/trips", settingsController.getTrips);

// Earning chart for getting specific period data
router.get('/earnings-chart/:period', authMiddleware, driverController.earningsChart);

// ====================================
// APP SOS ROUTES
// ====================================

router.post('/sos', authMiddleware, sosController.sosEmergency);

// ====================================
// RANKINGS API
// ====================================

router.get('/rankings', authMiddleware, rankingsController.rankingsAndLeaderboard);

// ====================================  
// BANKDETAILS API ROUTES                            
// ====================================    

// Fetch All Bank Details (Admin)
router.get('/bankdetails', bankDetailsController.getBankDetails);  

// Get Bank Details by ID
router.get('/bankdetails/:id', authMiddleware, bankDetailsController.getBankDetailsById);  

// Get user's bank details
router.get('/bankdetails/user/:user_id', authMiddleware, bankDetailsController.getUserBankDetails);  

// ====================================
// TWO-STEP PROCESS FOR ADDING ACCOUNTS
// ====================================

// STEP 1: Verify Bank Account 
// Returns verified bank details for user confirmation
router.post('/bankdetails/verify', authMiddleware, bankDetailsController.verifyBankAccount);

// STEP 2: Create Bank Details 
// Requires verification_token from Step 1
router.post('/bankdetails/create', authMiddleware, bankDetailsController.createBankDetails);  

// Update Bank Details (also uses two-step verification)
router.put('/bankdetails/update/:id', authMiddleware, bankDetailsController.updateBankDetails);  

// Delete Bank Details by ID
router.delete('/bankdetails/delete/:id', authMiddleware, bankDetailsController.deleteBankDetails);  

// Set bank details as primary
router.put('/bankdetails/primary/:id', authMiddleware, bankDetailsController.primaryBankDetails); 

// ====================================
// LICENSING CONTROLLER ROUTES
// ====================================

// Verify license - called by client applications every 24 hours
router.post('/licensing/verify', licensingController.verifyLicense);

// ====================================
// COMBIRDS OTP ROUTES
// ====================================

router.post('/auth/send-otp', apiController.sendOTP);
router.post('/auth/verify-otp', apiController.verifyOTP);
router.post('/auth/resend-otp', apiController.resendOTP);

// ====================================
// EASEBUZZ PAYMENT ROUTES
// ====================================

// Driver deposit payment
router.post("/payment/driver-deposit/initiate", authMiddleware, easebuzzController.initiatePayment);

// Reservation advance payment
router.post("/payment/reservation-advance/initiate", authMiddleware, easebuzzController.initiateReservationAdvance);

// Wallet top-up payment
router.post("/payment/wallet-topup/initiate", authMiddleware, easebuzzController.initiateWalletTopup);

// Subscription payment
router.post("/payment/subscription/initiate", authMiddleware, easebuzzController.initiateSubscriptionPayment);

// Create order with QR code for completed ride fare
router.post("/order/ride-fare/create", authMiddleware, easebuzzController.createOrderWithQR);

// Webhook for all payment types (handles driver deposit, advance payment, and wallet top-up)
router.post("/webhook", (req, res, next) => {
    let data = '';
    req.on('data', chunk => {
        data += chunk;
    });
    req.on('end', () => {
        req.rawBody = data;
        next();
    });
}, easebuzzController.webhook);

// Transaction status check
router.post("/payment/transaction-status", authMiddleware,easebuzzController.transactionStatus);

module.exports = router;
