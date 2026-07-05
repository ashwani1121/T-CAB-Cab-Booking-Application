const admin = require('firebase-admin');
const { sequelize, Sequelize, User, UserRole, RideRequests, Notification } = require('../models');
const { Op } = require("sequelize");
class RideRequestService{
    constructor(db, nearbyDriverService, config) {
        this.db                      = db;                   
        this.nearbyDriverService     = nearbyDriverService; 
        this.NOTIFICATION_TIMEOUT    = config.NOTIFICATION_TIMEOUT || 15000;
        this.MAX_RETRIES             = config.MAX_RETRIES || 3;
        this.FIREBASE_TIMEOUT        = config.FIREBASE_TIMEOUT || 5000; 
        
        // DYNAMIC HYBRID CONFIGURATION
        this.INITIAL_BATCH_SIZE      = config.INITIAL_BATCH_SIZE || 3;
        this.QUICK_RESPONSE_TIMEOUT  = config.QUICK_RESPONSE_TIMEOUT || 4000;
        this.BATCH_EXPANSION_FACTOR  = config.BATCH_EXPANSION_FACTOR || 1.5;
        this.MAX_BATCH_SIZE          = config.MAX_BATCH_SIZE || 12;
        this.OVERLAP_DELAY           = config.OVERLAP_DELAY || 1000;
        this.MAX_ROUNDS              = config.MAX_ROUNDS || 4;
        
        // Track active ride requests and their status
        this.activeRideRequests      = new Map();
        this.driverResponseTracking  = new Map();
    }

    // DYNAMIC HYBRID NOTIFICATION SYSTEM
    async sendRideRequestNotifications(nearbyDrivers, rideRequest, rideDetails) {
        try{
            const { pickup, drop, stop1, stop2, user_id } = rideDetails;
            const rideId = rideRequest.id;
            // Query database to verify ride request actually exists
            const dbRideRequest = await RideRequests.findByPk(rideId, {
                attributes: ['id', 'user_id', 'status', 'trip_type', 'vehicle_type_id', 'created_at'],
                raw: true
            });
            if(!dbRideRequest){
                console.error(`❌ CRITICAL: Ride request ${rideId} NOT FOUND in database!`);
                throw new Error(`Ride request ${rideId} does not exist in database. Cannot send notifications.`);
            }
            // Accept both 'pending' and 'searching_driver' statuses
            const validStatuses = ['pending', 'searching_driver'];
            if(!validStatuses.includes(dbRideRequest.status)){
                console.error(`❌ CRITICAL: Ride request ${rideId} has invalid status: ${dbRideRequest.status}`);
                throw new Error(`Ride request ${rideId} has status "${dbRideRequest.status}". Expected one of: ${validStatuses.join(', ')}`);
            }
            const user = await User.findByPk(user_id, {
                attributes: ['id', 'name', 'mobile']
            });
            // Initialize tracking for this ride
            this.activeRideRequests.set(rideId, {
                status           : 'searching_driver',
                created_at       : Date.now(),
                total_notified   : 0,
                rounds_completed : 0,
                verified_in_db   : true 
            });
            this.driverResponseTracking.set(rideId, new Set());
            // Sort drivers by distance (closest first)
            const sortedDrivers = [...nearbyDrivers].sort((a, b) => 
                (a.distance_km || 0) - (b.distance_km || 0)
            );
            // Create base notification payload
            const notificationPayload = this.createNotificationPayload(rideRequest, rideDetails, user);
            const notificationResults = {
                successful    : 0,
                failed        : 0,
                errors        : [],
                rounds        : [],
                stopped_early : false,
                total_time    : Date.now()
            };
            // Store ride request in Firebase with timeout protection
            await this.storeRideRequestInFirebaseWithTimeout(rideRequest, sortedDrivers);
            // Start dynamic notification rounds
            let currentBatchSize = this.INITIAL_BATCH_SIZE;
            let driversProcessed = 0;
            let roundNumber      = 1;
            while(driversProcessed < sortedDrivers.length && roundNumber <= this.MAX_ROUNDS){
                const rideStillExists = await RideRequests.findByPk(rideId, {
                    attributes: ['id', 'status'],
                    raw: true
                });
                if(!rideStillExists){
                    console.error(`❌ Ride ${rideId} deleted during notification process!`);
                    notificationResults.stopped_early = true;
                    break;
                }
                // Check for valid ongoing statuses
                const ongoingStatuses = ['pending', 'searching_driver'];
                if(!ongoingStatuses.includes(rideStillExists.status)){
                    console.log(`🛑 Ride ${rideId} status changed to ${rideStillExists.status} - stopping notifications`);
                    notificationResults.stopped_early = true;
                    break;
                }
                // Check if ride is still active in memory tracking
                const activeRide = this.activeRideRequests.get(rideId);
                if(!activeRide || activeRide.status !== 'searching_driver'){
                    console.log(`🛑 Stopping notifications for ride ${rideId} - ride accepted`);
                    notificationResults.stopped_early = true;
                    break;
                }
                // Get drivers for current round
                const currentBatch = sortedDrivers.slice(driversProcessed, driversProcessed + currentBatchSize);
                if(currentBatch.length === 0) break;
                // Send notifications to current batch
                const roundStartTime = Date.now();
                const roundResult = await this.sendBatchNotifications(
                    currentBatch, 
                    notificationPayload, 
                    rideId, 
                    roundNumber
                );
                // Update results
                notificationResults.successful += roundResult.successful;
                notificationResults.failed += roundResult.failed;
                notificationResults.errors.push(...roundResult.errors);
                notificationResults.rounds.push({
                    round         : roundNumber,
                    drivers_count : currentBatch.length,
                    successful    : roundResult.successful,
                    failed        : roundResult.failed,
                    time_taken    : Date.now() - roundStartTime,
                    batch_size    : currentBatchSize
                });
                // Update tracking
                activeRide.total_notified  += roundResult.successful;
                activeRide.rounds_completed = roundNumber;
                driversProcessed           += currentBatch.length;
                // If this is the last round, don't wait
                if(driversProcessed >= sortedDrivers.length || roundNumber >= this.MAX_ROUNDS){
                    break;
                }
                // SMART WAIT: Don't wait if we already got a response
                const waitTime = roundNumber === 1 ? this.QUICK_RESPONSE_TIMEOUT : this.OVERLAP_DELAY;
                console.log(`⏳ Waiting ${waitTime}ms before round ${roundNumber + 1}...`);
                // Wait but check for acceptance every 200ms
                const startWait = Date.now();
                while(Date.now() - startWait < waitTime){
                    await new Promise(resolve => setTimeout(resolve, 200));
                    // Check memory tracking
                    const currentRide = this.activeRideRequests.get(rideId);
                    if(!currentRide || currentRide.status !== 'searching_driver'){
                        console.log(`🛑 Driver accepted during wait - stopping expansion`);
                        notificationResults.stopped_early = true;
                        break;
                    }
                    // Also check database
                    const dbCheck = await RideRequests.findByPk(rideId, {
                        attributes: ['status'],
                        raw: true
                    });
                    const validOngoingStatuses = ['pending', 'searching_driver'];
                    if(!dbCheck || !validOngoingStatuses.includes(dbCheck.status)){
                        console.log(`🛑 Ride status changed in DB during wait - stopping`);
                        notificationResults.stopped_early = true;
                        break;
                    }
                }
                // Break if ride was accepted during wait
                if(notificationResults.stopped_early) break;
                // Expand batch size for next round (but cap it)
                currentBatchSize = Math.min(
                    Math.ceil(currentBatchSize * this.BATCH_EXPANSION_FACTOR), 
                    this.MAX_BATCH_SIZE
                );
                roundNumber++;
            }
            // Calculate total time taken
            notificationResults.total_time = Date.now() - notificationResults.total_time;
            // Set up timeout for the entire search process
            setTimeout(() => this.handleRideRequestTimeout(rideId), this.NOTIFICATION_TIMEOUT);
            return{
                success             : notificationResults.successful > 0,
                drivers_notified    : notificationResults.successful,
                total_drivers       : sortedDrivers.length,
                rounds_completed    : roundNumber - 1,
                total_time_ms       : notificationResults.total_time,
                stopped_early       : notificationResults.stopped_early,
                notification_errors : notificationResults.errors,
                round_breakdown     : notificationResults.rounds
            };
        }catch(error){
            console.error('❌ Error in dynamic notification system:', error);
            this.cleanupRideTracking(rideRequest.id);
            return{
                success          : false,
                error            : error.message,
                drivers_notified : 0,
                total_drivers    : nearbyDrivers.length
            };
        }
    }

    // Store ride request in Firebase with timeout protection
    async storeRideRequestInFirebaseWithTimeout(rideRequest, drivers){
        try{
            const firebaseData = {
                ride_request_id         : rideRequest.id,
                user_id                 : rideRequest.user_id,
                status                  : rideRequest.status,
                created_at              : Date.now(),
                total_drivers_available : drivers.length,
                notification_strategy   : 'dynamic_hybrid',
                expires_at              : Date.now() + (5 * 60 * 1000)
            };
            await Promise.race([
                this.db.ref(`ride_requests/${rideRequest.id}`).set(firebaseData),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase store timeout')), this.FIREBASE_TIMEOUT)
                )
            ]);
        }catch(error){
            console.error('Error storing ride request in Firebase:', error);
        }
    }

    // Send notifications to a batch of drivers with individual tracking
    async sendBatchNotifications(driverBatch, notificationPayload, rideId, roundNumber){
        // Check if ride is still available BEFORE sending batch
        const activeRide = this.activeRideRequests.get(rideId);
        if(!activeRide || activeRide.status !== 'searching_driver'){
            console.log(`🛑 Ride ${rideId} already accepted, skipping batch ${roundNumber}`);
            return { 
                successful: 0, 
                failed: 0, 
                errors: [], 
                cancelled: true 
            };
        }
        const results = { successful: 0, failed: 0, errors: [], cancelled: false };
        // Send to all drivers in batch simultaneously (for speed)
        const batchPromises = driverBatch.map(async (driver) => {
            try{
                // Double-check status before EACH notification send
                const currentRide = this.activeRideRequests.get(rideId);
                if(!currentRide || currentRide.status !== 'searching_driver'){
                    return { 
                        success: false, 
                        driver_id: driver.driver_id, 
                        error: 'Ride already accepted' 
                    };
                }
                // Skip if we already notified this driver
                const notifiedDrivers = this.driverResponseTracking.get(rideId);
                if(notifiedDrivers.has(driver.driver_id)){
                    return{ 
                        success: false, 
                        driver_id: driver.driver_id, 
                        error: 'Already notified' 
                    };
                }
                const result = await this.sendSingleDriverNotification(
                    driver, 
                    notificationPayload, 
                    rideId,
                    roundNumber
                );
                if(result.success){
                    notifiedDrivers.add(driver.driver_id);
                }
                return result;
            }catch(error){
                return { 
                    success   : false, 
                    driver_id : driver.driver_id, 
                    error     : error.message 
                };
            }
        });
        const batchResults = await Promise.allSettled(batchPromises);
        // Process results
        batchResults.forEach((result, index) => {
            if(result.status === 'fulfilled'){
                if(result.value.success){
                    results.successful++;
                }else{
                    results.failed++;
                    if (!['Already notified', 'Ride already accepted'].includes(result.value.error)) {
                        results.errors.push({
                            driver_id : driverBatch[index].driver_id,
                            error     : result.value.error,
                            round     : roundNumber
                        });
                    }
                }
            }else{
                results.failed++;
                results.errors.push({
                    driver_id : driverBatch[index].driver_id,
                    error     : result.reason.message,
                    round     : roundNumber
                });
            }
        });
        // Update Firebase with batch info only if ride is still searching
        const finalRideCheck = this.activeRideRequests.get(rideId);
        if(finalRideCheck && finalRideCheck.status === 'searching_driver'){
            try{
                await Promise.race([
                    this.db.ref(`ride_requests/${rideId}/notification_rounds/${roundNumber}`).set({
                        drivers_count : driverBatch.length,
                        successful    : results.successful,
                        failed        : results.failed,
                        timestamp     : Date.now(),
                        drivers       : driverBatch.map(d => ({
                            driver_id : d.driver_id,
                            distance  : d.distance_km
                        }))
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Firebase batch update timeout')), this.FIREBASE_TIMEOUT)
                    )
                ]);
            }catch(error){
                console.error('Error updating Firebase batch info:', error);
            }
        }
        return results;
    }

    // Send notification to individual driver with retry logic + token cleanup
    async sendSingleDriverNotification(driver, notificationPayload, rideId, roundNumber) {
        const maxRetries = 2;
        let attempt      = 0;
        while(attempt < maxRetries){
            try{
                // Validate FCM token
                if(!driver.fcm_token || driver.fcm_token.length < 100){
                    return { 
                        success   : false, 
                        driver_id : driver.driver_id, 
                        error     : 'Invalid FCM token' 
                    };
                }
                // Create personalized notification
                const driverNotificationPayload = {
                    ...notificationPayload,
                    data: {
                        ...notificationPayload.data,
                        driver_distance    : driver.distance_km?.toString() || '0',
                        notification_round : roundNumber.toString(),
                        priority_level     : roundNumber === 1 ? 'high' : 'medium'
                    }
                };
                // Send notification with timeout
                await Promise.race([
                    admin.messaging().send({
                        token: driver.fcm_token,
                        notification: {
                            title: driverNotificationPayload.title,
                            body: driverNotificationPayload.body
                        },
                        data: driverNotificationPayload.data,
                        android: {
                            priority: 'high',
                            notification: {
                                sound: 'default',
                                channelId: 'ride_requests',
                                priority: 'high',
                                defaultSound: true
                            }
                        },
                        apns: {
                            payload: {
                                aps: {
                                    sound: 'default',
                                    contentAvailable: true,
                                    category: 'RIDE_REQUEST'
                                }
                            }
                        }
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('FCM send timeout')), 3000)
                    )
                ]);
                // Track notification in Firebase (with timeout, but don't fail if this fails)
                try{
                    await Promise.race([
                        this.db.ref(`driver_notifications/${driver.driver_id}/${rideId}`).set({
                            ride_request_id : rideId,
                            sent_at         : Date.now(),
                            expires_at      : Date.now() + (this.QUICK_RESPONSE_TIMEOUT * 2),
                            status          : 'pending_response',
                            round           : roundNumber,
                            distance_km     : driver.distance_km
                        }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Firebase tracking timeout')), this.FIREBASE_TIMEOUT)
                        )
                    ]);
                }catch(trackingError){
                    console.error('Firebase tracking error (non-critical):', trackingError);
                }
                return { 
                    success   : true, 
                    driver_id : driver.driver_id 
                };
            }catch(error){
                attempt++;
                // NEW: Handle invalid FCM token errors
                const invalidTokenErrors = [
                    'Requested entity was not found',
                    'registration-token-not-registered',
                    'invalid-registration-token',
                    'invalid-argument'
                ];
                const isInvalidToken = invalidTokenErrors.some(err => 
                    error.message?.includes(err) || error.code?.includes(err)
                );
                if(isInvalidToken){
                    console.warn(`⚠️ Invalid FCM token detected for driver ${driver.driver_id}`);
                    // Clear the invalid FCM token from database (non-blocking)
                    this.clearInvalidFCMToken(driver.driver_id).catch(err => 
                        console.error(`Failed to clear FCM token for driver ${driver.driver_id}:`, err)
                    );
                    // Don't retry for invalid tokens
                    return { 
                        success   : false, 
                        driver_id : driver.driver_id, 
                        error     : 'Invalid or expired FCM token (cleared from database)'
                    };
                }
                console.error(`Attempt ${attempt} failed for driver ${driver.driver_id}:`, error.message);
                if(attempt >= maxRetries){
                    return { 
                        success   : false, 
                        driver_id : driver.driver_id, 
                        error     : error.message 
                    };
                }
                // Exponential backoff for other errors
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 300));
            }
        }
    }
    
    // Helper method to clear invalid FCM tokens
    async clearInvalidFCMToken(driverId) {
        try {
            const { User, UserRole } = require('../models');
            
            // First verify the user is a driver (role_id: 3)
            const userRole = await UserRole.findOne({
                where: {
                    user_id: driverId,
                    role_id: 3 // Driver role
                }
            });
            
            if (!userRole) {
                console.warn(`User ${driverId} is not a driver or doesn't exist`);
                return false;
            }
            
            // Clear FCM token in database
            const updateResult = await User.update(
                { fcm_token: null },
                { 
                    where: { 
                        id: driverId
                    } 
                }
            );
            
            if (updateResult[0] > 0) {
                console.log(`✅ Cleared invalid FCM token for driver ${driverId}`);
                
                // Also update in Firebase to mark driver as offline
                try {
                    await Promise.race([
                        this.db.ref(`drivers/${driverId}`).update({
                            fcm_token_valid: false,
                            fcm_token_cleared_at: Date.now(),
                            last_token_error: 'Invalid or expired token'
                        }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Firebase timeout')), 2000)
                        )
                    ]);
                } catch (firebaseError) {
                    console.warn('Failed to update Firebase driver status:', firebaseError.message);
                }
                
                return true;
            } else {
                console.warn(`Driver ${driverId} not found or token already cleared`);
                return false;
            }
            
        } catch (error) {
            console.error(`Error clearing FCM token for driver ${driverId}:`, error);
            throw error;
        }
    }

    // Create base notification payload
    createNotificationPayload(rideRequest, rideDetails, user) {
        const { pickup, drop, stop1, stop2 } = rideDetails;
        return {
            type                     : 'new_ride_request',
            ride_request_id          : rideRequest.id,
            title                    : 'New Ride Request',
            body                     : `New ${rideRequest.trip_type === 1 ? 'Intercity' : 'Outstation'} ride request nearby`,
            data                     : {
                ride_request_id      : rideRequest.id.toString(),
                trip_id              : rideRequest.trip_id.toString(),
                trip_type            : rideRequest.trip_type.toString(),
                pickup_address       : pickup?.address || '',
                pickup_latitude      : pickup?.latitude?.toString() || '',
                pickup_longitude     : pickup?.longitude?.toString() || '',
                dropoff_address      : drop?.address || '',
                dropoff_latitude     : drop?.latitude?.toString() || '',
                dropoff_longitude    : drop?.longitude?.toString() || '',
                stop1_address        : stop1?.address || '',
                stop1_latitude       : stop1?.latitude?.toString() || '',
                stop1_longitude      : stop1?.longitude?.toString() || '',
                stop2_address        : stop2?.address || '',
                stop2_latitude       : stop2?.latitude?.toString() || '',
                stop2_longitude      : stop2?.longitude?.toString() || '',
                estimated_fare       : rideRequest.final_fare?.toString() || '0',
                estimated_distance   : rideRequest.estimated_distance?.toString() || '0',
                estimated_duration   : rideRequest.estimated_duration?.toString() || '0',
                special_instructions : rideRequest.special_instructions || '',
                payment_method       : rideRequest.payment_method || '',
                user_name            : user?.name || 'Unknown',
                user_phone           : user?.mobile || '',
                timestamp            : Date.now().toString(),
                timeout_seconds      : this.NOTIFICATION_TIMEOUT?.toString() || '0',
            }
        };
    }

    // STOP RIDE REQUEST NOTIFICATIONS 
    async stopRideRequestNotifications(rideRequestId){
        try{
            // CRITICAL: Immediately stop ongoing notification rounds
            const activeRide = this.activeRideRequests.get(rideRequestId);
            if(activeRide){
                activeRide.status = 'cancelled';
                activeRide.cancelled_at = Date.now();
            }
            // Get ride data from Firebase with timeout
            const rideRequestRef = this.db.ref(`ride_requests/${rideRequestId}`);
            const rideSnapshot   = await Promise.race([
                rideRequestRef.once('value'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase read timeout')), this.FIREBASE_TIMEOUT)
                )
            ]).catch(err => {
                console.error('Firebase read failed:', err.message);
                return null;
            });
            const rideData = rideSnapshot?.val();
            if(!rideData){
                console.log(`⚠️ Ride ${rideRequestId} not found in Firebase`);
                this.cleanupRideTracking(rideRequestId);
                return { success: false, reason: 'ride_not_found' };
            }
            let notificationsCancelled = 0;
            let fcmNotificationsSent   = 0;
            const notifiedDrivers      = this.driverResponseTracking.get(rideRequestId);
            // Get list of all notified drivers
            let driversList = [];
            if(notifiedDrivers && notifiedDrivers.size > 0){
                driversList = Array.from(notifiedDrivers);
            }else 
            if(rideData.notified_drivers && Array.isArray(rideData.notified_drivers)){
                driversList = rideData.notified_drivers.map(d => d.driver_id);
            }
            // Cancel notifications for all notified drivers
            if(driversList.length > 0){
                const cancelPromises = driversList.map(async (driverId) => {
                    try{
                        // 1. Update Firebase driver notification status
                        const driverNotifRef = this.db.ref(`driver_notifications/${driverId}/${rideRequestId}`);
                        const notifSnapshot = await Promise.race([
                            driverNotifRef.once('value'),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('timeout')), 2000)
                            )
                        ]);
                        if(notifSnapshot.exists()){
                            await Promise.race([
                                driverNotifRef.update({
                                    status: 'cancelled',
                                    cancelled_at: Date.now(),
                                    reason: 'user_cancelled_request'
                                }),
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('timeout')), 2000)
                                )
                            ]);
                            notificationsCancelled++;
                            console.log(`✅ Cancelled notification for driver ${driverId}`);
                        }
                        // 2. Send FCM notification to driver to dismiss the ride request
                        const { User } = require('../models');
                        const driver = await User.findByPk(driverId, {
                            attributes: ['id', 'fcm_token']
                        });
                        if(driver && driver.fcm_token){
                            await Promise.race([
                                admin.messaging().send({
                                    token: driver.fcm_token,
                                    notification: {
                                        title: 'Ride Cancelled',
                                        body: 'The passenger has cancelled this ride request.'
                                    },
                                    data: {
                                        type: 'ride_cancelled',
                                        ride_request_id: rideRequestId.toString(),
                                        action: 'dismiss_notification',
                                        cancelled_by: 'user',
                                        cancelled_at: Date.now().toString()
                                    },
                                    android: {
                                        priority: 'high',
                                        notification: {
                                            sound: 'default',
                                            channelId: 'ride_requests',
                                            tag: `ride_request_${rideRequestId}`,
                                            priority: 'high'
                                        }
                                    },
                                    apns: {
                                        payload: {
                                            aps: {
                                                sound: 'default',
                                                contentAvailable: true,
                                                category: 'RIDE_CANCELLED'
                                            }
                                        }
                                    }
                                }),
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('FCM timeout')), 3000)
                                )
                            ]);
                            fcmNotificationsSent++;
                            console.log(`📱 FCM cancellation sent to driver ${driverId}`);
                        }
                    }catch(error){
                        console.error(`Error cancelling notification for driver ${driverId}:`, error.message);
                    }
                });
                // Wait for all cancellations (with overall timeout)
                await Promise.race([
                    Promise.allSettled(cancelPromises),
                    new Promise(resolve => setTimeout(resolve, 10000)) // Max 10 seconds
                ]).catch(err => console.error('Cancellation timeout:', err.message));
            }
            // Mark ride as cancelled in Firebase
            await Promise.race([
                rideRequestRef.update({
                    status: 'cancelled',
                    notifications_stopped: true,
                    notifications_stopped_at: Date.now(),
                    cancelled_by: 'user',
                    last_updated: Date.now(),
                    fcm_cancellations_sent: fcmNotificationsSent
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase update timeout')), this.FIREBASE_TIMEOUT)
                )
            ]).catch(err => console.error('Failed to update ride status:', err.message));
            this.cleanupRideTracking(rideRequestId);
            return{
                success: true,
                notifications_cancelled: notificationsCancelled,
                fcm_notifications_sent: fcmNotificationsSent
            };
        }catch(error){
            console.error(`❌ Error stopping notifications for ride ${rideRequestId}:`, error);
            this.cleanupRideTracking(rideRequestId);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Enhanced handleRideAcceptance method with immediate notification cancellation
    async handleRideAcceptance(acceptanceData){
        try{
            const { ride_details, driver_details, user_details, vehicle_details, fare_details } = acceptanceData;
            const ride_request_id = ride_details.ride_request_id;
            const ride_otp        = ride_details.ride_otp;
            // CRITICAL: IMMEDIATELY stop sending more notifications
            const activeRide = this.activeRideRequests.get(ride_request_id);
            if(activeRide){
                activeRide.status      = 'accepted';
                activeRide.accepted_at = Date.now();
                activeRide.accepted_by_driver = driver_details.id;
            }
            // PARALLEL EXECUTION: Update Firebase status immediately while doing other operations
            const firebaseUpdatePromise = this.updateRideStatusToAccepted(
                ride_request_id, 
                driver_details.id, 
                driver_details.distance_to_pickup || 0
            );
            // PARALLEL EXECUTION: Cancel and notify other drivers immediately
            const cancelOthersPromise = this.cancelAndNotifyOtherDrivers(
                ride_request_id, 
                driver_details.id
            );
            // Get driver's completed ride count
            const completedRideCount = await RideRequests.count({
                where: { 
                    driver_id: driver_details.id, 
                    status: 'ride_completed' 
                }
            });
            // Wait for critical operations
            await Promise.allSettled([firebaseUpdatePromise, cancelOthersPromise]);
            // Send user notification
            await this.sendUserAcceptanceNotification(user_details.id, {
                ride_request_id,
                ride_otp,
                user_details,
                driver_details: {
                    ...driver_details,
                    total_completed_rides: completedRideCount  
                },
                vehicle_details,
                fare_details,
                ride_details
            });
            // Cleanup tracking
            this.cleanupRideTracking(ride_request_id);
            return{
                success: true,
                notifications_cancelled: true
            };
        }catch(error){
            console.error('Error in handleRideAcceptance:', error);
            this.cleanupRideTracking(acceptanceData.ride_details?.ride_request_id);
            throw error;
        }
    }

    // Separate method to update Firebase status immediately
    async updateRideStatusToAccepted(rideRequestId, driverId, driverDistance){
        try{
            const rideRequestRef = this.db.ref(`ride_requests/${rideRequestId}`);
            await Promise.race([
                rideRequestRef.update({
                    status                    : 'accepted',
                    assigned_driver_id        : driverId,
                    driver_distance_at_accept : driverDistance,
                    accepted_at               : Date.now(),
                    notifications_stopped     : true
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase update timeout')), this.FIREBASE_TIMEOUT)
                )
            ]);
            console.log(`✅ Firebase status updated to accepted for ride ${rideRequestId}`);
        }catch(err){
            console.error('Failed to update Firebase on acceptance:', err.message);
        }
    }

    // ENHANCED: Cancel notifications AND send FCM dismissal to other drivers
    async cancelAndNotifyOtherDrivers(rideId, acceptedDriverId){
        try{
            const notifiedDrivers = this.driverResponseTracking.get(rideId);
            if(!notifiedDrivers || notifiedDrivers.size === 0) {
                console.log(`No drivers to cancel for ride ${rideId}`);
                return;
            }
            const otherDrivers = Array.from(notifiedDrivers).filter(
                driverId => driverId !== acceptedDriverId
            );
            if(otherDrivers.length === 0){
                console.log(`Only accepted driver was notified for ride ${rideId}`);
                return;
            }
            console.log(`🛑 Cancelling notifications for ${otherDrivers.length} drivers for ride ${rideId}`);
            // Process all drivers in parallel with individual error handling
            const cancelPromises = otherDrivers.map(driverId => 
                this.cancelSingleDriverNotification(rideId, driverId)
            );
            // Wait for all cancellations with timeout
            await Promise.race([
                Promise.allSettled(cancelPromises),
                new Promise(resolve => setTimeout(resolve, 5000)) // Max 5 seconds
            ]);
            console.log(`✅ Completed cancellation process for ride ${rideId}`);
        }catch(error){
            console.error('Error in cancelAndNotifyOtherDrivers:', error);
        }
    }

    // Cancel individual driver notification with FCM dismissal
    async cancelSingleDriverNotification(rideId, driverId){
        try{
            // 1. Update Firebase driver notification status
            const driverNotifRef = this.db.ref(`driver_notifications/${driverId}/${rideId}`);
            await Promise.race([
                driverNotifRef.update({
                    status       : 'cancelled',
                    cancelled_at : Date.now(),
                    reason       : 'ride_assigned_to_other_driver'
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('timeout')), 2000)
                )
            ]).catch(err => console.warn(`Firebase update failed for driver ${driverId}:`, err.message));
            // 2. Send FCM notification to dismiss the ride request
            const { User } = require('../models');
            const driver = await User.findByPk(driverId, {
                attributes: ['id', 'fcm_token']
            });
            if(driver && driver.fcm_token){
                await Promise.race([
                    admin.messaging().send({
                        token: driver.fcm_token,
                        notification: {
                            title: 'Ride No Longer Available',
                            body: 'This ride has been accepted by another driver.'
                        },
                        data: {
                            type: 'ride_cancelled',
                            ride_request_id: rideId.toString(),
                            action: 'dismiss_notification',
                            reason: 'assigned_to_other',
                            cancelled_at: Date.now().toString()
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                sound: 'default',
                                channelId: 'ride_requests',
                                tag: `ride_request_${rideId}`, 
                                priority: 'high'
                            }
                        },
                        apns: {
                            payload: {
                                aps: {
                                    sound: 'default',
                                    contentAvailable: true,
                                    category: 'RIDE_CANCELLED',
                                    badge: 0 // Clear badge
                                }
                            }
                        }
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('FCM timeout')), 3000)
                    )
                ]);
                console.log(`📱 Cancellation notification sent to driver ${driverId}`);
            }else{
                console.warn(`⚠️ No FCM token for driver ${driverId}`);
            }
        }catch(error){
            console.error(`❌ Error cancelling notification for driver ${driverId}:`, error.message);
        }
    }

    // Cancel notifications to other drivers with timeout protection
    async cancelOtherDriverNotifications(rideId, acceptedDriverId){
        try{
            const notifiedDrivers = this.driverResponseTracking.get(rideId);
            if(!notifiedDrivers) return;
            const cancelPromises = Array.from(notifiedDrivers)
                .filter(driverId => driverId !== acceptedDriverId)
                .map(async (driverId) => {
                    try{
                        const driverNotifRef = this.db.ref(`driver_notifications/${driverId}/${rideId}`);
                        await Promise.race([
                            driverNotifRef.update({
                                status       : 'cancelled',
                                cancelled_at : Date.now(),
                                reason       : 'ride_assigned_to_other_driver'
                            }),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('timeout')), 2000)
                            )
                        ]);
                    }catch(error){
                        console.error(`Error cancelling notification for driver ${driverId}:`, error.message);
                    }
                });
            await Promise.race([
                Promise.allSettled(cancelPromises),
                new Promise(resolve => setTimeout(resolve, 5000)) // Max 5 seconds for all cancellations
            ]);
        }catch(error){
            console.error('Error cancelling other driver notifications:', error);
        }
    }

    // Send acceptance notification to user
    async sendUserAcceptanceNotification(userId, acceptanceData) {
        const {
            ride_request_id,
            ride_otp,
            driver_details,
            user_details,
            vehicle_details,
            fare_details,
            ride_details
        } = acceptanceData;
        try{
            const user = await User.findByPk(userId, { attributes: ['fcm_token', 'name'] });
            if(!user || !user.fcm_token) return;
            await Promise.race([
                admin.messaging().send({
                    token        : user.fcm_token,
                    notification : {
                        title    : 'Driver Found! 🚗',
                        body     : `${driver_details.name} is coming to pick you up.`
                    },
                    data : {
                        type            : 'accepted',
                        ride_request_id : ride_request_id.toString(),
                        ride_otp        : ride_otp,
                        user_details    : JSON.stringify(user_details),
                        driver_details  : JSON.stringify(driver_details),
                        vehicle_details : JSON.stringify(vehicle_details),
                        fare_details    : JSON.stringify(fare_details),
                        ride_details    : JSON.stringify(ride_details)
                    },
                    android : { priority: 'high' },
                    apns    : { payload: { aps: { sound: 'default' } } }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('FCM timeout')), 3000)
                )
            ]);
        }catch(error){
            console.error('Error sending user notification:', error);
        }
    }

    // Cleanup tracking data
    cleanupRideTracking(rideId){
        this.activeRideRequests.delete(rideId);
        this.driverResponseTracking.delete(rideId);
    }

    // TIMEOUT HANDLER: What to do when drivers don't respond in time
    async handleRideRequestTimeout(rideRequestId) {
        try{
            this.cleanupRideTracking(rideRequestId);
            // Get the current ride request data from Firebase with timeout
            const rideRequestRef = this.db.ref(`ride_requests/${rideRequestId}`);
            const snapshot = await Promise.race([
                rideRequestRef.once('value'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase read timeout')), this.FIREBASE_TIMEOUT)
                )
            ]);
            const rideData = snapshot.val();
            // If ride is no longer searching for drivers, don't do anything
            if(!rideData || rideData.status !== 'searching_driver'){
                return;
            }
            // Get the ride request from main database
            const rideRequest = await RideRequests.findByPk(rideRequestId);
            if(!rideRequest){
                return;
            }
            const retryCount = rideData.retry_count || 0;
            // If we've tried maximum times, give up and notify passenger
            if(retryCount >= this.MAX_RETRIES){
                await rideRequest.update({ status: 'no_drivers_available' });
                await rideRequestRef.update({ status: 'no_drivers_available' }).catch(err => 
                    console.error('Firebase update failed:', err.message)
                );
                // Send "no drivers available" notification to passenger
                const user = await User.findByPk(rideRequest.user_id, { attributes: ['fcm_token'] });
                if(user && user.fcm_token){
                    await this.sendNotificationWithTimeout(user.fcm_token, {
                        notification: { 
                            title: 'No Drivers Available', 
                            body: 'Sorry, no drivers are available right now. Please try again later.' 
                        },
                        data: { 
                            ride_request_id: rideRequestId.toString(), 
                            status: 'no_drivers_available' 
                        }
                    });
                }
                return;
            }
            // Try to find more drivers for another attempt
            const pickup = {
                latitude  : rideRequest.pickup_latitude,
                longitude : rideRequest.pickup_longitude,
                address   : rideRequest.pickup_address
            };
            const nearbyDrivers = await this.nearbyDriverService.findNearbyDrivers(
                pickup, 
                rideRequest.vehicle_type_id, 
                rideRequestId
            );
            // If no new drivers found, give up
            if(nearbyDrivers.length === 0){
                await rideRequest.update({ status: 'no_drivers_available' });
                await rideRequestRef.update({ status: 'no_drivers_available' }).catch(err => 
                    console.error('Firebase update failed:', err.message)
                );
                // Notify passenger that no drivers are available
                const user = await User.findByPk(rideRequest.user_id, { attributes: ['fcm_token'] });
                if(user && user.fcm_token){
                    await this.sendNotificationWithTimeout(user.fcm_token, {
                        notification: { 
                            title: 'No Drivers Available', 
                            body: 'Sorry, no drivers are available right now. Please try again later.' 
                        },
                        data: { 
                            ride_request_id: rideRequestId.toString(), 
                            status: 'no_drivers_available' 
                        }
                    });
                }
                return;
            }
            // Try sending notifications to new drivers
            const notificationResult = await this.sendRideRequestNotifications(nearbyDrivers, rideRequest, {
                pickup,
                drop: {
                    latitude: rideRequest.dropoff_latitude,
                    longitude: rideRequest.dropoff_longitude,
                    address: rideRequest.dropoff_address
                },
                stop1: rideRequest.stop1_latitude ? {
                    latitude: rideRequest.stop1_latitude,
                    longitude: rideRequest.stop1_longitude,
                    address: rideRequest.stop1_address
                } : null,
                stop2: rideRequest.stop2_latitude ? {
                    latitude: rideRequest.stop2_latitude,
                    longitude: rideRequest.stop2_longitude,
                    address: rideRequest.stop2_address
                } : null,
                user_id: rideRequest.user_id
            });
            // Update ride status based on notification result
            if(notificationResult.success){
                await rideRequest.update({
                    status: 'searching_driver',
                    drivers_notified: (rideRequest.drivers_notified || 0) + notificationResult.drivers_notified
                });
                await rideRequestRef.update({
                    status: 'searching_driver',
                    expires_at: Date.now() + (5 * 60 * 1000),
                    retry_count: retryCount + 1
                }).catch(err => console.error('Firebase update failed:', err.message));
            }else{
                await rideRequest.update({ status: 'notification_failed' });
                await rideRequestRef.update({ status: 'notification_failed' }).catch(err => 
                    console.error('Firebase update failed:', err.message)
                );
            }
        }catch(error){
            console.error('Error handling timeout:', error);
            this.activeRideRequests.delete(rideRequestId);
        }
    }

    // Helper: Send notification with timeout
    async sendNotificationWithTimeout(fcmToken, messagePayload){
        try{
            await Promise.race([
                admin.messaging().send({
                    token: fcmToken,
                    ...messagePayload,
                    android: { priority: 'high' },
                    apns: { payload: { aps: { sound: 'default' } } }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('FCM timeout')), 3000)
                )
            ]);
            return true;
        }catch(error){
            console.error('Failed to send notification:', error.message);
            return false;
        }
    }

    // ARRIVAL HANDLER: What happens when a driver arrives at pickup location
    async handleDriverArrival(arrivalData){
        try{
            const { 
                ride_request_id, 
                driver_id, 
                driver_name, 
                user_id,
                driver_details,
                user_details
            } = arrivalData;
            // Update ride request status in Firebase with timeout
            const rideRequestRef = this.db.ref(`ride_requests/${ride_request_id}`);
            await Promise.race([
                rideRequestRef.update({
                    status: 'arrived',
                    arrived_at: Date.now()
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                )
            ]).catch(err => console.error('Firebase update failed:', err.message));
            // Update driver notification status
            const driverNotificationRef = this.db.ref(`driver_notifications/${driver_id}/${ride_request_id}`);
            await Promise.race([
                driverNotificationRef.update({
                    status: 'arrived',
                    arrived_at: Date.now()
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                )
            ]).catch(err => console.error('Firebase notification update failed:', err.message));
            // Send FCM notification to user
            const user = await User.findByPk(user_id, { attributes: ['fcm_token'] });
            if (!user || !user.fcm_token || user.fcm_token.trim() === '') {
                console.log(`No valid FCM token found for user ${user_id}`);
                return false;
            }
            const messagePayload = {
                token: user.fcm_token,
                notification: {
                    title: 'Driver Arrived!',
                    body: `${driver_name} has arrived at your pickup location. Please come out.`
                },
                data: {
                    type            : 'arrived',
                    ride_request_id : ride_request_id.toString(),
                    status          : 'arrived',
                    driver_id       : driver_id.toString(),
                    driver_name     : driver_details.name,
                    driver_mobile   : driver_details.mobile,
                    completed_ride  : driver_details.completed_ride.toString(),
                    pickup_address  : user_details.pickup_address || ''
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'ride_updates',
                        priority: 'high',
                        defaultSound: true,
                        icon: 'ic_notification',
                        color: '#4CAF50'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            contentAvailable: true,
                            category: 'arrived',
                            badge: 1
                        }
                    }
                }
            };
            const sent = await this.sendNotificationWithTimeout(user.fcm_token, messagePayload);
            console.log(sent ? `Driver arrival notification sent to user ${user_id}` : `Failed to send notification to user ${user_id}`);
            return sent;
        } catch (error) {
            console.error('Error in handleDriverArrival:', error);
            return false;
        }
    }

    // RIDE STARTED NOTIFICATION: Tell passenger their ride has begun
    async notifyRideStarted(notificationData) {
        try{
            const { ride_request_id, driver_id, user_id, end_ride_otp, is_reservation } = notificationData;
            // Update ride request status in Firebase
            const rideRequestRef = this.db.ref(`ride_requests/${ride_request_id}`);
            const firebaseUpdateData = {
                status: 'ride_started',
                started_at: Date.now()
            };
            // Add end OTP to Firebase for reservation trips
            if(is_reservation && end_ride_otp){
                firebaseUpdateData.end_ride_otp = end_ride_otp;
                firebaseUpdateData.end_otp_generated_at = Date.now();
            }
            await Promise.race([
                rideRequestRef.update(firebaseUpdateData),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                )
            ]).catch(err => console.error('Firebase update failed:', err.message));
            // Update driver notification status
            const driverNotificationRef = this.db.ref(`driver_notifications/${driver_id}/${ride_request_id}`);
            await Promise.race([
                driverNotificationRef.update({
                    status: 'ride_started',
                    started_at: Date.now()
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                )
            ]).catch(err => console.error('Firebase notification update failed:', err.message));
            // Send FCM notification to user
            const user = await User.findByPk(user_id, { attributes: ['fcm_token'] });
            if(!user || !user.fcm_token || user.fcm_token.trim() === ''){
                console.log(`No valid FCM token found for user ${user_id}`);
                return false;
            }
            // Prepare notification message
            let notificationBody = 'Your ride has started. Have a safe journey!';
            if(is_reservation && end_ride_otp){
                notificationBody = `Your reservation ride has started. End ride OTP: ${end_ride_otp}. Have a safe journey!`;
            }
            const messagePayload = {
                notification: {
                    title: is_reservation ? 'Reservation Ride Started!' : 'Ride Started!',
                    body: notificationBody
                },
                data: {
                    type            : 'ride_started',
                    ride_request_id : ride_request_id.toString(),
                    status          : 'ride_started',
                    is_reservation  : is_reservation ? 'true' : 'false'
                }
            };
            // Add end OTP to notification data for reservation trips
            if(is_reservation && end_ride_otp){
                messagePayload.data.end_ride_otp = end_ride_otp;
            }
            const sent = await this.sendNotificationWithTimeout(user.fcm_token, messagePayload);
            console.log(sent ? `Ride started notification sent to user ${user_id}` : `Failed to send notification to user ${user_id}`);
            return sent;
        }catch(error){
            console.error('Error sending ride started notification:', error);
            return false;
        }
    }

    // RIDE COMPLETION NOTIFICATION: Notify both user and driver when ride is completed
    async sendRideCompletionNotification(user_id, driver_id, ride_request_id, rideCompletionData) {
        try {
            const { 
                actualDistance, 
                actualDuration, 
                actualFare, 
                finalFare,
                is_rated 
            } = rideCompletionData;
            // Update ride status in Firebase
            const rideRequestRef = this.db.ref(`ride_requests/${ride_request_id}`);
            await Promise.race([
                rideRequestRef.update({
                    status          : 'completed',
                    completed_at    : Date.now(),
                    actual_distance : actualDistance,
                    actual_duration : actualDuration,
                    actual_fare     : actualFare,
                    final_fare      : finalFare
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                )
            ]).catch(err => console.error('Firebase update failed:', err.message));
            // Update driver notification status
            const driverNotificationRef = this.db.ref(`driver_notifications/${driver_id}/${ride_request_id}`);
            await Promise.race([
                driverNotificationRef.update({
                    status: 'completed',
                    completed_at: Date.now()
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                )
            ]).catch(err => console.error('Firebase notification update failed:', err.message));
            // Get user details for notification
            const user = await User.findByPk(user_id, { 
                attributes: ['fcm_token', 'name', 'mobile'] 
            });
            // Send notification to USER 
            let notificationResult = null;
            if (user && user.fcm_token) {
                const messagePayload = {
                    notification: {
                        title: 'Ride Completed!',
                        body: `Your ride has been completed successfully. Total fare: ₹${finalFare.toFixed(2)}`
                    },
                    data: {
                        type            : 'ride_completed',
                        ride_request_id : ride_request_id.toString(),
                        status          : 'ride_completed',
                        actual_distance : actualDistance.toString(),
                        actual_duration : actualDuration.toString(),
                        actual_fare     : actualFare.toString(),
                        final_fare      : finalFare.toString(),
                        completed_at    : Date.now().toString(),
                        payment_due     : finalFare > 0 ? 'true' : 'false',
                        is_rated        : is_rated.toString()
                    }
                };
                
                notificationResult = await this.sendNotificationWithTimeout(user.fcm_token, messagePayload);
            } else {
                console.log(`User ${user_id} not found or no FCM token available`);
            }
            // Schedule cleanup of temporary Firebase data after 24 hours
            setTimeout(async () => {
                try {
                    await Promise.race([
                        Promise.all([
                            rideRequestRef.remove(),
                            driverNotificationRef.remove()
                        ]),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Cleanup timeout')), 10000)
                        )
                    ]);
                } catch (cleanupError) {
                    console.error(`Error cleaning up Firebase data for ride ${ride_request_id}:`, cleanupError.message);
                }
            }, 24 * 60 * 60 * 1000);
            return {
                success           : true,
                notification_sent : notificationResult ? true : false,
                message           : 'Ride completion notification sent to user successfully'
            };
        } catch (error) {
            console.error('Error in sendRideCompletionNotification:', error);
            
            // Even if notifications fail, try to update Firebase status
            try {
                const rideRequestRef = this.db.ref(`ride_requests/${ride_request_id}`);
                await Promise.race([
                    rideRequestRef.update({
                        status: 'completed',
                        completed_at: Date.now(),
                        notification_error: error.message
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                    )
                ]);
            } catch (firebaseError) {
                console.error('Error updating Firebase after notification failure:', firebaseError.message);
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    // RIDE CANCELLATION NOTIFICATION
    async sendRideCancellationNotification(cancellationData){
        try{
            const{ 
                ride_request_id, 
                cancelled_by, 
                cancellation_reason, 
                penalty_amount,
                ride_request,
                cancelling_user_id,
                isDriver,
                isPassenger,
                restart_search = false
            } = cancellationData;

            const notificationResults = {
                success             : true,
                notifications_sent  : 0,
                errors              : []
            };

            const baseNotificationData = {
                type                : 'ride_cancelled',
                ride_request_id     : ride_request_id.toString(),
                cancelled_by        : cancelled_by || '',
                cancellation_reason : cancellation_reason || '',
                penalty_amount      : penalty_amount.toString(),
                cancelled_at        : Date.now().toString(),
                trip_type           : ride_request.trip_type?.toString() || '',
                vehicle_type        : ride_request.vehicleType?.name || ride_request.Vehicletype?.name || '',
                pickup_address      : ride_request.pickup_address || '',
                dropoff_address     : ride_request.dropoff_address || '',
                estimated_fare      : ride_request.estimated_fare?.toString() || '0',
                restart_search      : restart_search.toString()
            };
            // DRIVER CANCELLED - NOTIFY PASSENGER
            if(isDriver && ride_request.passenger){
                if(ride_request.passenger.fcm_token){
                    const messagePayload = {
                        notification: {
                            title   : restart_search ? 'Finding New Driver...' : 'Ride Cancelled',
                            body    : restart_search  ? `Your driver has cancelled. Don't worry, we're finding you another driver!` : `Your driver ${ride_request.driver?.name || 'Unknown'} has cancelled the ride. Reason: ${cancellation_reason}`
                        },
                        data        : {
                            ...baseNotificationData,
                            user_type      : 'passenger',
                            driver_name    : ride_request.driver?.name || 'Unknown',
                            driver_mobile  : ride_request.driver?.mobile || '',
                            refund_info    : penalty_amount > 0 ? 'Driver penalty applied' : 'No charges applied'
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                sound: 'default',
                                channelId: 'ride_updates'
                            }
                        },
                        apns: {
                            headers: {
                                'apns-priority': '10'
                            },
                            payload: {
                                aps: {
                                    sound: 'default',
                                    badge: 1
                                }
                            }
                        }
                    };
                    const sent = await this.sendNotificationWithTimeout(ride_request.passenger.fcm_token, messagePayload);
                    if(sent){
                        notificationResults.notifications_sent++;
                    }else{
                        notificationResults.errors.push({
                            user_type: 'passenger',
                            user_id: ride_request.user_id,
                            error: 'FCM send failed'
                        });
                        notificationResults.success = false;
                        console.log(`❌ Failed to send to passenger ${ride_request.user_id}`);
                    }
                }else{
                    console.log(`⚠️ Passenger ${ride_request.user_id} has no FCM token`);
                }
            }
            // PASSENGER CANCELLED - NOTIFY DRIVER
            if(isPassenger && ride_request.driver_id && ride_request.driver){
                if(ride_request.driver.fcm_token){
                    const messagePayload = {
                        notification : {
                            title    : 'Ride Cancelled by Passenger',
                            body     : `${ride_request.User?.name || 'Passenger'} has cancelled the ride. Reason: ${cancellation_reason}`
                        },
                        data         : {
                            ...baseNotificationData,
                            user_type        : 'driver',
                            passenger_name   : ride_request.User?.name || 'Unknown',
                            passenger_mobile : ride_request.User?.mobile || '',
                            penalty_info     : penalty_amount > 0 ? `Passenger penalty: ₹${penalty_amount}` : 'No penalty applied'
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                sound: 'default',
                                channelId: 'ride_updates',
                                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                            }
                        },
                        apns: {
                            headers: {
                                'apns-priority': '10'
                            },
                            payload: {
                                aps: {
                                    sound: 'default',
                                    badge: 1,
                                    'content-available': 1
                                }
                            }
                        }
                    };
                    const sent = await this.sendNotificationWithTimeout(ride_request.driver.fcm_token, messagePayload);
                    if(sent){
                        notificationResults.notifications_sent++;
                        console.log(`✅ Cancellation notification sent to driver ${ride_request.driver_id}`);
                    }else{
                        notificationResults.errors.push({
                            user_type: 'driver',
                            user_id: ride_request.driver_id,
                            error: 'FCM send failed'
                        });
                        notificationResults.success = false;
                        console.log(`❌ Failed to send notification to driver ${ride_request.driver_id}`);
                    }
                }else{
                    console.log(`⚠️ Driver ${ride_request.driver_id} has no FCM token`);
                }
            }
            // UPDATE FIREBASE STATUS
            try{
                const rideRequestRef = this.db.ref(`ride_requests/${ride_request_id}`);
                await Promise.race([
                    rideRequestRef.update({
                        status: restart_search ? 'searching_driver' : 'cancelled',
                        cancelled_at: Date.now(),
                        cancelled_by,
                        cancellation_reason,
                        last_updated: Date.now()
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                    )
                ]).catch(err => console.error('Firebase update failed:', err.message));
                // Update driver notifications
                const rideSnapshot = await Promise.race([
                    rideRequestRef.once('value'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Firebase read timeout')), this.FIREBASE_TIMEOUT)
                    )
                ]).catch(err => {
                    console.error('Firebase read failed:', err.message);
                    return null;
                });
                const rideData = rideSnapshot?.val();
                if(rideData && rideData.notified_drivers){
                    const updatePromises = rideData.notified_drivers.map(async (driver) => {
                        try{
                            const driverNotifRef = this.db.ref(`driver_notifications/${driver.driver_id}/${ride_request_id}`);
                            const updateStatus   = restart_search ? 'cancelled_searching_new' : 'cancelled';
                            const updateReason   = restart_search ? 'driver_cancelled_restarting_search' : (isPassenger ? 'ride_cancelled_by_passenger' : 'ride_cancelled_by_driver');
                            await Promise.race([
                                driverNotifRef.update({
                                    status: updateStatus,
                                    cancelled_at: Date.now(),
                                    reason: updateReason
                                }),
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('timeout')), 2000)
                                )
                            ]);
                        }catch(error){
                            console.error(`Error updating notification for driver ${driver.driver_id}:`, error.message);
                        }
                    });
                    await Promise.race([
                        Promise.allSettled(updatePromises),
                        new Promise(resolve => setTimeout(resolve, 5000))
                    ]);
                }
            }catch(error){
                console.error('Error updating Firebase notifications:', error);
                notificationResults.errors.push({
                    type: 'firebase_update',
                    error: error.message
                });
            }
            console.log('📊 Ride cancelled Notification results:', notificationResults);
            return notificationResults;
        }catch(error){
            console.error('❌ Error in sendRideCancellationNotification:', error);
            return {
                success: false,
                error: error.message,
                notifications_sent: 0
            };
        }
    }

    // SEND NOTIFICATION TO SPECIFIC USER
    async sendNotificationToUser(userId, notificationData) {
        try {
            const { title, body, type, ride_request_id, ...additionalData } = notificationData;
            const user = await User.findByPk(userId, {
                attributes: ['id', 'fcm_token', 'name']
            });
            if (!user || !user.fcm_token) {
                console.log(`No FCM token found for user ${userId}`);
                return { success: false, reason: 'no_fcm_token' };
            }
            const messagePayload = {
                notification: { title, body },
                data: {
                    type,
                    ride_request_id: ride_request_id?.toString() || '',
                    timestamp: Date.now().toString(),
                    ...Object.keys(additionalData).reduce((acc, key) => {
                        acc[key] = additionalData[key]?.toString() || '';
                        return acc;
                    }, {})
                }
            };
            const sent = await this.sendNotificationWithTimeout(user.fcm_token, messagePayload);
            if (sent) {
                console.log(`Notification sent to user ${userId} (${user.name}): ${title}`);
                return { success: true };
            } else {
                return { success: false, error: 'FCM send failed' };
            }
        } catch (error) {
            console.error(`Error sending notification to user ${userId}:`, error);
            return { success: false, error: error.message };
        }
    }

    // SEND CUSTOM TRIP NOTIFICATION TO ADMIN
    async sendCustomTripNotificationToAdmin(customTripData){
        try{
            // Get all admin users with notification tokens
            const admins = await User.findAll({
                include         : [{ 
                    model       : UserRole, 
                    where       : { 
                        role_id : 1 
                    } 
                }],
                where:{
                    status      : 1,
                    fcm_token   : {
                        [Op.ne] : null
                    }
                }
            });
            if(admins.length === 0){
                console.warn('⚠️ No admin users available for notification');
                return { 
                    success: false, 
                    message: 'No admin users available for notification' 
                };
            }
            const tokens = admins.map(u => u.fcm_token).filter(t => !!t);
            if(tokens.length === 0){
                console.warn('⚠️ No valid FCM tokens found for admin users');
                return { 
                    success: false, 
                    message: 'No valid FCM tokens found for admin users' 
                };
            }
            const notificationTitle = '🚗 New Custom Reservation Request';
            const notificationBody  = `${customTripData.user_name} requested ${customTripData.custom_km}km, ${customTripData.custom_days} day(s) trip on ${customTripData.pickup_date}`;
            const messages          = admins.map(admin => ({
                token               : admin.fcm_token,
                notification        : {
                    title           : notificationTitle,
                    body            : notificationBody
                },
                data                : {
                    type            : 'CUSTOM_TRIP_REQUEST',
                    ride_request_id : String(customTripData.ride_request_id),
                    user_name       : customTripData.user_name,
                    user_mobile     : customTripData.user_mobile,
                    pickup_location : customTripData.pickup_location,
                    drop_location   : customTripData.drop_location,
                    custom_km       : String(customTripData.custom_km),
                    custom_days     : String(customTripData.custom_days),
                    pickup_date     : customTripData.pickup_date,
                    pickup_time     : customTripData.pickup_time,
                    vehicle_type    : customTripData.vehicle_type,
                    estimated_fare  : String(customTripData.estimated_fare),
                    timestamp       : new Date().toISOString()
                },
                android             : {
                    priority        : 'high',
                    notification    : {
                        sound       : 'default',
                        channelId   : 'custom_trip_requests'
                    }
                },
                apns                : {
                    payload         : {
                        aps         : {
                            sound   : 'default',
                            badge   : 1
                        }
                    }
                }
            }));
            // Send FCM notifications
            const results = await Promise.allSettled(
                messages.map(message => admin.messaging().send(message))
            );
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            return { 
                success         : successCount > 0, 
                admins_notified : successCount,
                total_admins    : admins.length 
            };
        }catch(error){
            console.error('❌ Error sending custom trip notification:', error);
            return { success: false, error: error.message };
        }
    }

    // SEND RIDE TRANSFER NOTIFICATION TO ADMIN
    async sendRideTransferNotificationToAdmin(transferData){
        try{
            // Get all admin users with notification tokens
            const admins = await User.findAll({
                include         : [{ 
                    model       : UserRole, 
                    where       : { 
                        role_id : 1 
                    } 
                }],
                where:{
                    status      : 1,
                    fcm_token   : {
                        [Op.ne] : null
                    }
                }
            });
            if(admins.length === 0){
                console.warn('⚠️ No admin users available for notification');
                return { 
                    success: false, 
                    message: 'No admin users available for notification' 
                };
            }
            const tokens = admins.map(u => u.fcm_token).filter(t => !!t);
            if(tokens.length === 0){
                console.warn('⚠️ No valid FCM tokens found for admin users');
                return { 
                    success: false, 
                    message: 'No valid FCM tokens found for admin users' 
                };
            }
            // Create notification title and body
            const notificationTitle = '🔄 Reservation Ride Transferred';
            const notificationBody  = transferData.is_custom_trip
                ? `Driver ${transferData.driver_name} transferred custom ${transferData.vehicle_type} ride for ${transferData.passenger_name}`
                : `Driver ${transferData.driver_name} transferred ${transferData.vehicle_type} reservation for ${transferData.passenger_name}`;
            const messages = admins.map(admin => ({
                token                   : admin.fcm_token,
                notification            : {
                    title               : notificationTitle,
                    body                : notificationBody
                },
                data                    : {
                    type                : 'RIDE_TRANSFERRED',
                    ride_request_id     : String(transferData.ride_request_id),
                    driver_id           : String(transferData.driver_id),
                    driver_name         : transferData.driver_name,
                    passenger_name      : transferData.passenger_name,
                    passenger_mobile    : transferData.passenger_mobile,
                    pickup_location     : transferData.pickup_location,
                    drop_location       : transferData.drop_location,
                    vehicle_type        : transferData.vehicle_type,
                    pickup_date         : transferData.pickup_date || '',
                    pickup_time         : transferData.pickup_time || '',
                    estimated_fare      : String(transferData.estimated_fare),
                    is_custom_trip      : String(transferData.is_custom_trip),
                    timestamp           : new Date().toISOString(),
                    action_required     : 'ASSIGN_NEW_DRIVER'
                },
                android                 : {
                    priority            : 'high',
                    notification        : {
                        sound           : 'default',
                        channelId       : 'ride_transfers',
                        priority        : 'high',
                        tag             : `ride_transfer_${transferData.ride_request_id}`,
                        clickAction     : 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                apns                    : {
                    payload             : {
                        aps             : {
                            sound       : 'default',
                            badge       : 1,
                            category    : 'RIDE_TRANSFER'
                        }
                    }
                }
            }));
            // Send FCM notifications
            const results = await Promise.allSettled(
                messages.map(message => admin.messaging().send(message))
            );
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failedCount  = results.filter(r => r.status === 'rejected').length;
            // Log failed notifications
            if(failedCount > 0){
                results.forEach((result, index) => {
                    if(result.status === 'rejected'){
                        console.error(`❌ Failed to send notification to admin ${admins[index].name}:`, result.reason);
                    }
                });
            }
            console.log(`✅ Ride transfer notification sent to ${successCount}/${admins.length} admins`);
            return { 
                success         : successCount > 0, 
                admins_notified : successCount,
                total_admins    : admins.length,
                failed_count    : failedCount
            };
        }catch(error){
            console.error('❌ Error sending ride transfer notification:', error);
            return { success: false, error: error.message };
        }
    }

    // SEND NOTIFICATION TO PASSENGER WHEN DRIVER INITIATES RESERVATION RIDE (STARTS JOURNEY TO PICKUP)
    async handleReservationRideStart(rideData){
        try{
            const { ride_request_id, driver_id, user_id, driver_details } = rideData;
            // Get passenger details
            const passenger = await User.findByPk(user_id, {
                attributes: ['id', 'name', 'fcm_token', 'mobile']
            });
            if(!passenger || !passenger.fcm_token || passenger.fcm_token.trim() === ''){
                console.warn(`⚠️ No FCM token for passenger ${user_id}`);
                return { 
                    success: false, 
                    message: 'No FCM token for passenger' 
                };
            }
            // Get ride request details for additional info
            const rideRequest = await RideRequests.findByPk(ride_request_id, {
                attributes: ['id', 'trip_type', 'pickup_address', 'dropoff_address', 'estimated_fare', 'pickup_date', 'pickup_time']
            });
            const notificationTitle     = '🚗 Driver is on the way!';
            const notificationBody      = `${driver_details?.name || 'Your driver'} has started the journey and is heading to your pickup location.`;
            const message               = {
                token                   : passenger.fcm_token,
                notification            : {
                    title               : notificationTitle,
                    body                : notificationBody
                },
                data                    : {
                    type                : 'driver_started_journey',
                    ride_request_id     : String(ride_request_id),
                    status              : 'driver_on_the_way',
                    driver_id           : String(driver_id || ''),
                    driver_name         : driver_details?.name || 'Unknown',
                    driver_mobile       : driver_details?.mobile || '',
                    trip_type           : String(rideRequest?.trip_type || ''),
                    pickup_address      : rideRequest?.pickup_address || '',
                    dropoff_address     : rideRequest?.dropoff_address || '',
                    pickup_date         : rideRequest?.pickup_date || '',
                    pickup_time         : rideRequest?.pickup_time || '',
                    estimated_fare      : String(rideRequest?.estimated_fare || '0'),
                    is_reservation      : 'true',
                    journey_started_at  : Date.now().toString(),
                    timestamp           : new Date().toISOString(),
                    action              : 'track_driver'
                },
                android                 : {
                    priority            : 'high',
                    notification        : {
                        sound           : 'default',
                        channelId       : 'ride_updates',
                        priority        : 'high',
                        tag             : `ride_${ride_request_id}`,
                        clickAction     : 'FLUTTER_NOTIFICATION_CLICK',
                        color           : '#2196F3',
                        icon            : 'ic_car'
                    }
                },
                apns                    : {
                    payload             : {
                        aps             : {
                            sound       : 'default',
                            badge       : 1,
                            category    : 'DRIVER_ON_WAY'
                        }
                    }
                }
            };
            const result = await admin.messaging().send(message);
            console.log(`✅ Driver journey start notification sent to passenger ${user_id}: ${result}`);
            // Update Firebase to track driver's journey initiation
            try{
                const rideRequestRef = this.db.ref(`ride_requests/${ride_request_id}`);
                await Promise.race([
                    rideRequestRef.update({
                        driver_journey_started: true,
                        driver_journey_started_at: Date.now(),
                        status: 'driver_on_the_way',
                        last_updated: Date.now()
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Firebase timeout')), this.FIREBASE_TIMEOUT)
                    )
                ]);
            }catch(firebaseError){
                console.error('⚠️ Firebase update failed (non-critical):', firebaseError.message);
            }
            return { 
                success         : true,
                message_id      : result
            };
        }catch(error){
            console.error('❌ Error sending driver journey start notification:', error);
            // Handle specific FCM errors
            if(error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'){
                console.warn('⚠️ Invalid or expired FCM token for passenger');
                return { 
                    success: false, 
                    error: 'Invalid FCM token',
                    should_update_token: true
                };
            }
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // SEND NOTIFICATION TO PASSENGER ABOUT RIDE TRANSFER
    async sendRideTransferNotificationToPassenger(passengerFcmToken, transferData){
        try{
            if(!passengerFcmToken){
                console.warn('⚠️ No FCM token for passenger');
                return { 
                    success: false, 
                    message: 'No FCM token for passenger' 
                };
            }
            const notificationTitle = 'Driver Changed';
            const notificationBody  = transferData.is_custom_trip
                ? `Your custom reservation driver has been changed. Admin will assign a new driver shortly.`
                : `Your reservation driver has been changed. Admin will assign a new driver shortly.`;
            const message = {
                token               : passengerFcmToken,
                notification        : {
                    title           : notificationTitle,
                    body            : notificationBody
                },
                data                : {
                    type                : 'RIDE_TRANSFERRED',
                    ride_request_id     : String(transferData.ride_request_id),
                    previous_driver_name: transferData.driver_name,
                    vehicle_type        : transferData.vehicle_type,
                    pickup_date         : transferData.pickup_date || '',
                    pickup_time         : transferData.pickup_time || '',
                    estimated_fare      : String(transferData.estimated_fare),
                    is_custom_trip      : String(transferData.is_custom_trip),
                    timestamp           : new Date().toISOString(),
                    status_message      : 'Admin will assign a new driver'
                },
                android             : {
                    priority        : 'high',
                    notification    : {
                        sound       : 'default',
                        channelId   : 'ride_updates',
                        priority    : 'high',
                        tag         : `ride_${transferData.ride_request_id}`,
                        clickAction : 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                apns                : {
                    payload         : {
                        aps         : {
                            sound   : 'default',
                            badge   : 1,
                            category: 'RIDE_UPDATE'
                        }
                    }
                }
            };
            const result = await admin.messaging().send(message);
            console.log(`✅ Ride transfer notification sent to passenger: ${result}`);
            return { 
                success         : true,
                message_id      : result
            };
        }catch(error){
            console.error('❌ Error sending passenger transfer notification:', error);
            // Handle specific FCM errors
            if(error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'){
                console.warn('⚠️ Invalid or expired FCM token for passenger');
                return { 
                    success: false, 
                    error: 'Invalid FCM token',
                    should_update_token: true
                };
            }
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // SEND PAYMENT SUCCESS NOTIFICATION TO USER AND DRIVER
    async sendPaymentSuccessNotification(userId, driverId, rideRequestId, paymentDetails){
        try{
            // Fetch user (passenger) details
            const user = await User.findOne({
                where: { 
                    id: userId,
                    status: 1
                },
                attributes: ['id', 'name', 'fcm_token', 'mobile']
            });
            // Fetch driver details
            const driver = await User.findOne({
                where: { 
                    id: driverId,
                    status: 1
                },
                attributes: ['id', 'name', 'fcm_token', 'mobile']
            });
            if(!user && !driver){
                console.warn('⚠️ Neither user nor driver found for payment notification');
                return { 
                    success: false, 
                    message: 'User and driver not found' 
                };
            }
            const results = {
                user_notified: false,
                driver_notified: false,
                user_message_id: null,
                driver_message_id: null
            };
            // ============================================================
            // SEND NOTIFICATION TO PASSENGER
            // ============================================================
            if(user && user.fcm_token){
                const userNotificationTitle = '✅ Payment Successful';
                const userNotificationBody = `Your payment of ₹${paymentDetails.amount.toFixed(2)} for ride #${rideRequestId} was successful via ${paymentDetails.payment_method}.`;
                const userMessage = {
                    token: user.fcm_token,
                    notification: {
                        title: userNotificationTitle,
                        body: userNotificationBody
                    },
                    data: {
                        type: 'PAYMENT_SUCCESS',
                        ride_request_id: String(rideRequestId),
                        amount: String(paymentDetails.amount),
                        payment_method: paymentDetails.payment_method,
                        payment_type: paymentDetails.payment_type || 'ride_fare',
                        transaction_id: paymentDetails.transaction_id || '',
                        timestamp: new Date().toISOString(),
                        user_type: 'passenger'
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            sound: 'default',
                            channelId: 'payment_notifications',
                            priority: 'high',
                            tag: `payment_${rideRequestId}`,
                            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                            color: '#4CAF50'
                        }
                    },
                    apns: {
                        payload: {
                            aps: {
                                sound: 'default',
                                badge: 1,
                                category: 'PAYMENT_SUCCESS'
                            }
                        }
                    }
                };
                try{
                    const userResult = await admin.messaging().send(userMessage);
                    results.user_notified = true;
                    results.user_message_id = userResult;
                    console.log(`✅ Payment success notification sent to passenger (User ID: ${userId})`);
                }catch(userError){
                    console.error(`❌ Failed to send payment notification to passenger:`, userError);
                    if(userError.code === 'messaging/invalid-registration-token' ||
                    userError.code === 'messaging/registration-token-not-registered'){
                        console.warn('⚠️ Invalid or expired FCM token for passenger');
                    }
                }
            }else{
                console.warn(`⚠️ No FCM token for passenger (User ID: ${userId})`);
            }
            // ============================================================
            // SEND NOTIFICATION TO DRIVER
            // ============================================================
            if(driver && driver.fcm_token){
                const driverNotificationTitle = '💰 Payment Received';
                const driverNotificationBody = `Customer paid ₹${paymentDetails.amount.toFixed(2)} for ride #${rideRequestId} via ${paymentDetails.payment_method}. Payout credited to your wallet.`;
                const driverMessage = {
                    token: driver.fcm_token,
                    notification: {
                        title: driverNotificationTitle,
                        body: driverNotificationBody
                    },
                    data: {
                        type: 'PAYMENT_RECEIVED',
                        ride_request_id: String(rideRequestId),
                        amount: String(paymentDetails.amount),
                        payment_method: paymentDetails.payment_method,
                        payment_type: paymentDetails.payment_type || 'ride_fare',
                        transaction_id: paymentDetails.transaction_id || '',
                        timestamp: new Date().toISOString(),
                        user_type: 'driver',
                        payout_status: 'credited'
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            sound: 'default',
                            channelId: 'driver_earnings',
                            priority: 'high',
                            tag: `payment_driver_${rideRequestId}`,
                            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                            color: '#4CAF50'
                        }
                    },
                    apns: {
                        payload: {
                            aps: {
                                sound: 'default',
                                badge: 1,
                                category: 'PAYMENT_RECEIVED'
                            }
                        }
                    }
                };
                try{
                    const driverResult = await admin.messaging().send(driverMessage);
                    results.driver_notified = true;
                    results.driver_message_id = driverResult;
                    console.log(`✅ Payment received notification sent to driver (Driver ID: ${driverId})`);
                }catch(driverError){
                    console.error(`❌ Failed to send payment notification to driver:`, driverError);
                    if(driverError.code === 'messaging/invalid-registration-token' ||
                    driverError.code === 'messaging/registration-token-not-registered'){
                        console.warn('⚠️ Invalid or expired FCM token for driver');
                    }
                }
            }else{
                console.warn(`⚠️ No FCM token for driver (Driver ID: ${driverId})`);
            }
            const success = results.user_notified || results.driver_notified;
            return {
                success: success,
                notification_sent: success,
                user_notified: results.user_notified,
                driver_notified: results.driver_notified,
                user_message_id: results.user_message_id,
                driver_message_id: results.driver_message_id,
                message: success 
                    ? 'Payment notifications sent successfully' 
                    : 'Failed to send payment notifications'
            };
        }catch(error){
            console.error('❌ Error sending payment success notifications:', error);
            return { 
                success: false,
                notification_sent: false,
                error: error.message 
            };
        }
    }
}

module.exports = RideRequestService;