const admin               = require('firebase-admin');
const Redis               = require('redis');
require('dotenv').config();
const NearbyDriverService = require('./nearbyDriver');
const RideRequestService  = require('./rideRequest');
const HelperService       = require('./helper');
const { Op }              = require("sequelize");
class FirebaseService {
    constructor(){
        this.db    = null;
        this.redis = Redis.createClient({
            url            : process.env.REDIS_URL || 'redis://localhost:6379',
            retry_strategy : options => Math.min(options.attempt * 100, 3000)
        });
        
        // Configuration
        this.SEARCH_RADII             = process.env.SEARCH_RADII ? JSON.parse(process.env.SEARCH_RADII) : [3, 5, 7, 10];
        this.MAX_DRIVERS_TO_NOTIFY    = parseInt(process.env.MAX_DRIVERS_TO_NOTIFY) || 8;
        this.LOCATION_STALE_THRESHOLD = parseInt(process.env.LOCATION_STALE_THRESHOLD) || 120000;

        // Notification settings
        this.NOTIFICATION_TIMEOUT     = parseInt(process.env.NOTIFICATION_TIMEOUT) || 15000;
        this.MAX_RETRIES              = parseInt(process.env.MAX_RETRIES) || 3;

        // Dynamic hybrid configuration
        this.INITIAL_BATCH_SIZE       = parseInt(process.env.INITIAL_BATCH_SIZE) || 3;
        this.QUICK_RESPONSE_TIMEOUT   = parseInt(process.env.QUICK_RESPONSE_TIMEOUT) || 4000;
        this.BATCH_EXPANSION_FACTOR   = parseFloat(process.env.BATCH_EXPANSION_FACTOR) || 1.5;
        this.MAX_BATCH_SIZE           = parseInt(process.env.MAX_BATCH_SIZE) || 12;
        this.OVERLAP_DELAY            = parseInt(process.env.OVERLAP_DELAY) || 1000;
        this.MAX_ROUNDS               = parseInt(process.env.MAX_ROUNDS) || 4;
        
        // Initialize Firebase first
        this.initialize();
        
        // Setup Redis
        this.setupRedis();
        
        // Initialize services AFTER Firebase is ready
        this.initializeServices();
    }

    // Initializes Firebase Admin SDK
    initialize(){
        try{
            if(!admin.apps.length){
                const requiredEnvVars = [
                    'FIREBASE_PROJECT_ID',
                    'FIREBASE_PRIVATE_KEY_ID',
                    'FIREBASE_PRIVATE_KEY',
                    'FIREBASE_CLIENT_EMAIL',
                    'FIREBASE_CLIENT_ID'
                ];
                const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
                if(missingVars.length > 0){
                    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
                }
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId               : process.env.FIREBASE_PROJECT_ID,
                        privateKeyId            : process.env.FIREBASE_PRIVATE_KEY_ID,
                        privateKey              : process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                        clientEmail             : process.env.FIREBASE_CLIENT_EMAIL,
                        clientId                : process.env.FIREBASE_CLIENT_ID,
                        authUri                 : "https://accounts.google.com/o/oauth2/auth",
                        tokenUri                : "https://oauth2.googleapis.com/token",
                        authProviderX509CertUrl : "https://www.googleapis.com/oauth2/v1/certs",
                        clientX509CertUrl       : `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
                    }),
                    databaseURL: process.env.FIREBASE_DATABASE_URL
                });
            }
            this.db = admin.database();
            console.log('✅ Firebase initialized successfully');
        }catch(error){
            console.error('❌ Firebase initialization error:', error);
            throw error;
        }
    }

    // Initialize services after Firebase is ready
    initializeServices(){
        this.helperService       = new HelperService(this.db,{
            LOCATION_STALE_THRESHOLD : this.LOCATION_STALE_THRESHOLD
        });
        this.nearbyDriverService = new NearbyDriverService(this.db, this.redis, this.helperService,{
            SEARCH_RADII             : this.SEARCH_RADII,
            MAX_DRIVERS_TO_NOTIFY    : this.MAX_DRIVERS_TO_NOTIFY,
            LOCATION_STALE_THRESHOLD : this.LOCATION_STALE_THRESHOLD
        });
        this.rideRequestService  = new RideRequestService(this.db, this.nearbyDriverService, {
            NOTIFICATION_TIMEOUT    : this.NOTIFICATION_TIMEOUT,
            MAX_RETRIES             : this.MAX_RETRIES,
            INITIAL_BATCH_SIZE      : this.INITIAL_BATCH_SIZE,
            QUICK_RESPONSE_TIMEOUT  : this.QUICK_RESPONSE_TIMEOUT,
            BATCH_EXPANSION_FACTOR  : this.BATCH_EXPANSION_FACTOR,
            MAX_BATCH_SIZE          : this.MAX_BATCH_SIZE,
            OVERLAP_DELAY           : this.OVERLAP_DELAY,
            MAX_ROUNDS              : this.MAX_ROUNDS
        });
    }

    // Setup Redis connection
    setupRedis(){
        this.redis.on('error', err => {
            console.error('Redis error:', err);
        });
        this.redis.connect().catch(err => {
            console.error('Redis connection failed:', err);
        });
    }

    // Emergency Notificatiion to admin
    async getDriverLocation(driverId){
        return this.helperService.getDriverLocation(driverId);
    }

    // Optimized findNearbyDrivers using enhanced matching logic to display vehicle in user app
    async findNearbyDriversforUser(pickupLocation, vehicleTypeId){
        return await this.nearbyDriverService.findNearbyDriversforUser(pickupLocation, vehicleTypeId);
    }

    // Optimized findNearbyDrivers using enhanced matching logic for user request ride
    async findNearbyDrivers(pickupLocation, vehicleTypeId, rideRequestId, excludedDriverIds = null){
        return await this.nearbyDriverService.findNearbyDrivers(pickupLocation, vehicleTypeId, rideRequestId, excludedDriverIds);
    }

    // Enhanced notification sending with retries
    async sendRideRequestNotifications(nearbyDrivers, rideRequest, rideDetails){
        return await this.rideRequestService.sendRideRequestNotifications(nearbyDrivers, rideRequest, rideDetails);
    }

    // RIDE CANCELLATION: Stop notifications and notify drivers
    async stopRideRequestNotifications(rideRequestId){
        return await this.rideRequestService.stopRideRequestNotifications(rideRequestId);
    }

    // ACCEPTANCE HANDLER: Handle Firebase operations when a ride is accepted by driver
    async handleRideAcceptance(acceptanceData){
        return await this.rideRequestService.handleRideAcceptance(acceptanceData);
    }

    // ARRIVAL HANDLER: driver arrives at pickup location
    async handleDriverArrival(arrivalData){
        return await this.rideRequestService.handleDriverArrival(arrivalData);
    }

    // RIDE STARTED: Notify user when ride starts
    async notifyRideStarted(notificationData){
        return await this.rideRequestService.notifyRideStarted(notificationData);
    }

    // RIDE COMPLETION : Notify when ride completed
    async sendRideCompletionNotification(user_id, driver_id, ride_request_id, rideCompletionData){
        return await this.rideRequestService.sendRideCompletionNotification(user_id, driver_id, ride_request_id, rideCompletionData);
    }

    // RIDE CANCELLATION : Notify when ride cancelled
    async sendRideCancellationNotification(cancellationData){
        return await this.rideRequestService.sendRideCancellationNotification(cancellationData);
    }

    // CUSTOM TRIP NOTIFICATION
    async sendCustomTripNotificationToAdmin(transferTripData){
        return await this.rideRequestService.sendCustomTripNotificationToAdmin(transferTripData);
    }

    // TRANSFER TRIP NOTIFICATION
    async sendRideTransferNotificationToAdmin(customTripData){
        return await this.rideRequestService.sendRideTransferNotificationToAdmin(customTripData);
    }

    // SEND NOTIFICATION TO PASSENGER ABOUT RIDE TRANSFER
    async sendRideTransferNotificationToPassenger(passengerFcmToken, transferData){
        return await this.rideRequestService.sendRideTransferNotificationToPassenger(passengerFcmToken, transferData);
    }

    // Send notification to a specific user
    async sendNotificationToUser(userId, notificationData){
        return await this.rideRequestService.sendNotificationToUser(userId, notificationData);
    }

    // SEND PAYMENT SUCCESS NOTIFICATION TO USER AND DRIVER
    async sendPaymentSuccessNotification(userId, driverId, rideRequestId, paymentDetails){
        return await this.rideRequestService.sendPaymentSuccessNotification(userId, driverId, rideRequestId, paymentDetails);
    }

    // SEND RESERVATION RIDE STARTS NOTIFICATION TO USER
    async handleReservationRideStart(rideData){
        return await this.rideRequestService.handleReservationRideStart(rideData);
    }

    // Calculate distance using Google Distance Matrix API
    async calculateGoogleDistance(lat1, lon1, lat2, lon2){
        return await this.helperService.calculateGoogleDistance(lat1, lon1, lat2, lon2);
    }

    // Batch calculate distances
    async calculateBatchGoogleDistances(pickupLat, pickupLon, drivers){
        return await this.helperService.calculateBatchGoogleDistances(pickupLat, pickupLon, drivers);
    }

    // Get online drivers from firebased
    async onlineDrivers(){
        return await this.helperService.retrieveOnlineDrivers();
    }

    // Simple distance calculation (Haversine formula)
    calculateSimpleDistance(lat1, lon1, lat2, lon2){
        return this.helperService.calculateSimpleDistance(lat1, lon1, lat2, lon2);
    }
}
module.exports = new FirebaseService();