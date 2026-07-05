const { Queue, Worker }      = require("bullmq");
const IORedis                = require("ioredis");
const { User, RideRequests } = require('../models');
const admin                  = require('firebase-admin');
const FirebaseService        = require('../services/firebase');
let scheduledRideQueue;
let scheduledWorker;
// Retry configuration
const RETRY_CONFIG = {
    maxRetries        : 5,
    baseDelay         : 2 * 60 * 1000,  // 2 minutes base delay
    maxDelay          : 15 * 60 * 1000, // 15 minutes max delay
    backoffMultiplier : 1.5,
    finalTimeout      : 30 * 60 * 1000  // 30 minutes total timeout
};

async function initializeBullMQ(){
    try{
        const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
            maxRetriesPerRequest : null,
            retryDelayOnFailover : 100,
            enableReadyCheck     : false,
            lazyConnect          : true
        });
        await connection.ping();
        scheduledRideQueue = new Queue("scheduledRides",{ 
            connection,
            defaultJobOptions    : {
                removeOnComplete : 10,
                removeOnFail     : 50,
                attempts         : 3,
                backoff          : {
                    type         : 'exponential',
                    delay        : 5000,
                }
            }
        });
        scheduledWorker = new Worker("scheduledRides",
            async (job) => {
                const { ride_request_id, user_id, retry_count = 0 } = job.data;
                try{
                    // 1. Send reminder notification (only on first attempt)
                    let notificationResult = { success: true };
                    if(retry_count === 0){
                        notificationResult = await sendReminderNotification(user_id, ride_request_id);
                        if(!notificationResult.success){
                            console.log(`⚠️ Failed to send reminder: ${notificationResult.reason}`);
                        }
                    }
                    // 2. Start the ride request process with retry logic
                    const rideStartResult = await startRideRequestWithRetry(ride_request_id, retry_count);
                    return{ 
                        success      : true, 
                        notification : notificationResult,
                        ride_start   : rideStartResult,
                        retry_count  : retry_count
                    };
                }catch(error){
                    console.error(`❌ Error processing scheduled ride ${ride_request_id}:`, error);
                    throw error;
                }
            },
            { connection, concurrency: 5 }
        );
        scheduledWorker.on('completed', (job, result) => {
            console.log(`✅ Scheduled ride job ${job.id} completed:`, result);
        });
        scheduledWorker.on('failed', (job, err) => {
            console.error(`❌ Scheduled ride job ${job.id} failed:`, err.message);
        });
        await scheduledRideQueue.waitUntilReady();
        console.log("✅ BullMQ initialized successfully");
    }catch(err){
        console.error("❌ Failed to initialize BullMQ:", err);
        throw err;
    }
}

// Enhanced ride start with retry logic
async function startRideRequestWithRetry(ride_request_id, retry_count = 0) {
    try{
        console.log(`Processing ride ${ride_request_id}, attempt ${retry_count + 1}`);
        const rideRequest = await RideRequests.findByPk(ride_request_id);
        if(!rideRequest){
            throw new Error('Ride request not found');
        }
        // Check if ride is still valid for processing
        const validStatuses = ['pending', 'no_drivers_available', 'notification_failed'];
        if(!validStatuses.includes(rideRequest.status)){
            return{ 
                success: false, 
                reason: `Ride status is ${rideRequest.status}`, 
                skip_retry: true 
            };
        }
        // Update status to searching if this is a retry
        if(retry_count > 0){
            await RideRequests.update(
                { 
                    status: 'searching_driver',
                    search_started_at: new Date()
                },
                { where: { id: ride_request_id } }
            );
            await sendRetryNotification(rideRequest.user_id, ride_request_id, retry_count);
        }
        // Prepare location data
        const pickup = {
            address   : rideRequest.pickup_address,
            latitude  : rideRequest.pickup_latitude,
            longitude : rideRequest.pickup_longitude
        };
        const drop = {
            address   : rideRequest.dropoff_address,
            latitude  : rideRequest.dropoff_latitude,
            longitude : rideRequest.dropoff_longitude
        };
        const stop1 = rideRequest.stop1_address ? {
            address   : rideRequest.stop1_address,
            latitude  : rideRequest.stop1_latitude,
            longitude : rideRequest.stop1_longitude
        } : null;
        const stop2 = rideRequest.stop2_address ? {
            address   : rideRequest.stop2_address,
            latitude  : rideRequest.stop2_latitude,
            longitude : rideRequest.stop2_longitude
        } : null;
        let nearbyDrivers = [];
        if(rideRequest.is_book_any_vehicle && rideRequest.eligible_vehicle_type_ids){
            // Parse the eligible vehicle type IDs
            const eligibleVehicleTypeIds = JSON.parse(rideRequest.eligible_vehicle_type_ids);
            console.log(`🔍 Searching for drivers across ${eligibleVehicleTypeIds.length} vehicle types for ride ${ride_request_id}`);
            const allNearbyDrivers = [];
            // Find drivers for each eligible vehicle type
            for(const vehicleTypeId of eligibleVehicleTypeIds){
                try{
                    const driversForType = await FirebaseService.findNearbyDrivers(pickup, vehicleTypeId);
                    const driversWithVehicleType = driversForType.map(driver => ({
                        ...driver,
                        vehicle_type_id: vehicleTypeId
                    }));
                    allNearbyDrivers.push(...driversWithVehicleType);
                    console.log(`  Found ${driversForType.length} drivers for vehicle type ${vehicleTypeId}`);
                }catch(error){
                    console.warn(`  Error finding drivers for vehicle type ${vehicleTypeId}:`, error);
                }
            }
            // Remove duplicate drivers (keep closest one)
            const uniqueDrivers = allNearbyDrivers.reduce((acc, driver) => {
                const existing = acc.find(d => d.driver_id === driver.driver_id);
                if(!existing || driver.distance < existing.distance){
                    acc = acc.filter(d => d.driver_id !== driver.driver_id);
                    acc.push(driver);
                }
                return acc;
            }, []);
            nearbyDrivers = uniqueDrivers.sort((a, b) => a.distance - b.distance);
            console.log(`  Total unique drivers found: ${nearbyDrivers.length}`);
        }else{
            // Standard single vehicle type search
            console.log(`🔍 Searching for drivers with vehicle type ${rideRequest.vehicle_type_id}`);
            nearbyDrivers = await FirebaseService.findNearbyDrivers(pickup, rideRequest.vehicle_type_id);
            console.log(`  Found ${nearbyDrivers.length} drivers`);
        }
        if(nearbyDrivers.length === 0){
            console.log(`⚠️ No drivers available for ride ${ride_request_id}, attempt ${retry_count + 1}`);
            // Check if we should retry
            if(retry_count < RETRY_CONFIG.maxRetries){
                const nextRetryDelay = calculateRetryDelay(retry_count);
                console.log(`📋 Scheduling retry ${retry_count + 1} for ride ${ride_request_id} in ${nextRetryDelay/1000/60} minutes`);
                await scheduleRetry(ride_request_id, rideRequest.user_id, retry_count + 1, nextRetryDelay);
                await RideRequests.update(
                    { status: 'no_drivers_available' },
                    { where: { id: ride_request_id } }
                );
                return { 
                    success: false, 
                    reason: 'No drivers available - retry scheduled',
                    retry_scheduled: true,
                    next_retry_in_ms: nextRetryDelay,
                    attempt: retry_count + 1
                };
            }else{
                // Max retries exceeded
                await RideRequests.update(
                    { status: 'no_drivers_available' },
                    { where: { id: ride_request_id } }
                );
                await sendFailureNotification(rideRequest.user_id, ride_request_id);
                return { 
                    success: false, 
                    reason: 'No drivers available after maximum retries',
                    max_retries_exceeded: true
                };
            }
        }
        // Drivers found - send notifications
        const notificationResult = await FirebaseService.sendRideRequestNotifications(
            nearbyDrivers, 
            rideRequest, 
            { pickup, drop, stop1, stop2, user_id: rideRequest.user_id }
        );
        console.log(`📲 Notification result:`, notificationResult);
        if(notificationResult.success && notificationResult.drivers_notified > 0){
            await RideRequests.update(
                { 
                    status: 'searching_driver',
                    drivers_notified: notificationResult.drivers_notified,
                    search_started_at: new Date(),
                    // Store the notified drivers info for Book Any Vehicle
                    notified_drivers: rideRequest.is_book_any_vehicle ? 
                        JSON.stringify(nearbyDrivers.map(d => ({
                            driver_id: d.driver_id,
                            vehicle_type_id: d.vehicle_type_id,
                            distance: d.distance
                        }))) : null
                },
                { where: { id: ride_request_id } }
            );
            console.log(`✅ Ride ${ride_request_id} started (attempt ${retry_count + 1}), ${notificationResult.drivers_notified} drivers notified`);
            return { 
                success: true, 
                drivers_notified: notificationResult.drivers_notified,
                attempt: retry_count + 1,
                is_book_any_vehicle: rideRequest.is_book_any_vehicle
            };
        }else{
            // Notification failed - retry if attempts remaining
            if(retry_count < RETRY_CONFIG.maxRetries){
                const nextRetryDelay = calculateRetryDelay(retry_count);
                await scheduleRetry(ride_request_id, rideRequest.user_id, retry_count + 1, nextRetryDelay);
                return { 
                    success: false, 
                    reason: 'Failed to notify drivers - retry scheduled',
                    retry_scheduled: true,
                    next_retry_in_ms: nextRetryDelay
                };
            }else{
                await RideRequests.update(
                    { status: 'notification_failed' },
                    { where: { id: ride_request_id } }
                );
                return { 
                    success: false, 
                    reason: 'Failed to notify drivers after maximum retries'
                };
            }
        }
    }catch(error){
        console.error(`❌ Error in startRideRequestWithRetry for ride ${ride_request_id}:`, error);
        // For system errors, also retry if attempts remaining
        if(retry_count < RETRY_CONFIG.maxRetries){
            const nextRetryDelay = calculateRetryDelay(retry_count);
            await scheduleRetry(ride_request_id, rideRequest?.user_id, retry_count + 1, nextRetryDelay);
            return { 
                success: false, 
                reason: `System error - retry scheduled: ${error.message}`,
                retry_scheduled: true
            };
        }
        return { 
            success: false, 
            reason: error.message 
        };
    }
}

// Calculate retry delay with exponential backoff
function calculateRetryDelay(retry_count) {
    const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retry_count),
        RETRY_CONFIG.maxDelay
    );
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
}

// Schedule a retry attempt
async function scheduleRetry(ride_request_id, user_id, retry_count, delay) {
    if(!scheduledRideQueue){
        throw new Error("scheduledRideQueue not initialized");
    }
    try{
        const job = await scheduledRideQueue.add(
            `retry-ride-${ride_request_id}-${retry_count}`,
            { 
                ride_request_id, 
                user_id, 
                retry_count 
            },
            { 
                delay,
                jobId: `retry-${ride_request_id}-${retry_count}-${Date.now()}`
            }
        );
        console.log(`📋 Scheduled retry job created: ${job.id} (attempt ${retry_count + 1})`);
        return { success: true, jobId: job.id };
    }catch(error){
        console.error(`❌ Error scheduling retry for ride ${ride_request_id}:`, error);
        return{ 
            success: false, 
            error: error.message 
        };
    }
}

// Send 15-minute reminder notification
async function sendReminderNotification(user_id, ride_request_id) {
    try{
        const user = await User.findByPk(user_id, { 
            attributes: ["fcm_token", "name"] 
        });

        if(!user || !user.fcm_token){
            return { 
                success: false, 
                reason: 'No FCM token found' 
            };
        }
        const rideRequest = await RideRequests.findByPk(ride_request_id, {
            attributes: ["pickup_address", "pickup_date", "pickup_time", "status"]
        });
        if(!rideRequest){
            return { 
                success: false, 
                reason: 'Ride request not found' 
            };
        }
        // Check if ride is still valid
        if(!['pending'].includes(rideRequest.status)){
            return{ 
                success: false, 
                reason: `Ride status is ${rideRequest.status}` 
            };
        }
        // Send notification
        const message = {
            token: user.fcm_token,
            notification: {
                title: "🚖 Ride Starting Soon",
                body: `Hi ${user.name}, your ride will start in 15 minutes. We're now searching for a driver.`
            },
            data: {
                type: "ride_reminder",
                ride_request_id: ride_request_id.toString(),
                pickup_time: rideRequest.pickup_time || '',
                pickup_date: rideRequest.pickup_date || ''
            },
            android: { priority: "high" },
            apns: { payload: { aps: { sound: "default" } } }
        };
        const result = await admin.messaging().send(message);
        return { 
            success: true, 
            messageId: result 
        };
    }catch(error){
        console.error(`❌ Error sending reminder for ride ${ride_request_id}:`, error);
        return{ 
            success: false, 
            reason: error.message 
        };
    }
}

// Send retry notification to user
async function sendRetryNotification(user_id, ride_request_id, retry_count) {
    try {
        const user = await User.findByPk(user_id, { 
            attributes: ["fcm_token", "name"] 
        });
        if(!user || !user.fcm_token) {
            return { success: false, reason: 'No FCM token found' };
        }
        const message = {
            token: user.fcm_token,
            notification: {
                title: "🔄 Still Searching for Driver",
                body: `Hi ${user.name}, we're still looking for a driver for your ride. Attempt ${retry_count + 1} in progress.`
            },
            data: {
                type: "driver_search_retry",
                ride_request_id: ride_request_id.toString(),
                retry_count: retry_count.toString()
            },
            android: { priority: "normal" },
            apns: { payload: { aps: { sound: "default" } } }
        };
        const result = await admin.messaging().send(message);
        console.log(`📱 Retry notification sent for ride ${ride_request_id}, attempt ${retry_count + 1}`);
        return { success: true, messageId: result };
    }catch(error){
        console.error(`❌ Error sending retry notification:`, error);
        return { success: false, reason: error.message };
    }
}

// Send final failure notification
async function sendFailureNotification(user_id, ride_request_id) {
    try{
        const user = await User.findByPk(user_id, { 
            attributes: ["fcm_token", "name"] 
        });
        if(!user || !user.fcm_token) {
            return { success: false, reason: 'No FCM token found' };
        }
        const message = {
            token: user.fcm_token,
            notification: {
                title: "❌ No Drivers Available",
                body: `Sorry ${user.name}, we couldn't find any drivers for your scheduled ride. Please try booking again later.`
            },
            data: {
                type: "ride_search_failed",
                ride_request_id: ride_request_id.toString()
            },
            android: { priority: "high" },
            apns: { payload: { aps: { sound: "default" } } }
        };
        const result = await admin.messaging().send(message);
        console.log(`📱 Failure notification sent for ride ${ride_request_id}`);
        return { success: true, messageId: result };
    }catch(error){
        console.error(`❌ Error sending failure notification:`, error);
        return { success: false, reason: error.message };
    }
}

// Original functions kept for backward compatibility
async function startRideRequest(ride_request_id) {
    return await startRideRequestWithRetry(ride_request_id, 0);
}

// Schedule the 15-minute reminder and auto-start
async function scheduleRideNotification(rideRequest){
    if(!scheduledRideQueue){
        throw new Error("scheduledRideQueue not initialized");
    }
    const { id: ride_request_id, user_id, pickup_date, pickup_time } = rideRequest;
    // Check if pickup_date and pickup_time are provided
    if(!pickup_date || !pickup_time){
        console.error(`❌ Missing pickup_date or pickup_time for ride ${ride_request_id}`);
        return { 
            success: false, 
            error: "Missing pickup date or time" 
        };
    }
    // Create and validate the pickup datetime
    // Normalize time format - handle both "HH:MM" and "HH:MM:SS"
    let normalizedTime = pickup_time.trim();
    const timeParts    = normalizedTime.split(':');
    // Add seconds if missing
    if(timeParts.length === 2){
        normalizedTime = `${normalizedTime}:00`;
    }else 
    if(timeParts.length !== 3){
        console.error(`❌ Invalid time format for ride ${ride_request_id}: ${pickup_time}`);
        return{ 
            success: false, 
            error: `Invalid time format: ${pickup_time}. Expected HH:MM or HH:MM:SS` 
        };
    }
    // Construct ISO datetime string
    const isoDateTimeString = `${pickup_date}T${normalizedTime}`;
    const pickupDateTime    = new Date(isoDateTimeString);
    if(isNaN(pickupDateTime.getTime())){
        console.error(`❌ Invalid pickup datetime for ride ${ride_request_id}: ${isoDateTimeString}`);
        return { 
            success: false, 
            error: `Invalid pickup date or time: ${pickup_date} ${pickup_time}` 
        };
    }
    // Calculate trigger time (15 minutes before pickup)
    const triggerTime = new Date(pickupDateTime.getTime() - (15 * 60 * 1000));
    const now         = new Date();
    const delay       = triggerTime.getTime() - now.getTime();
    // VALIDATION: Check if delay is valid
    if(isNaN(delay) || !isFinite(delay)){
        console.error(`❌ Invalid delay calculated for ride ${ride_request_id}:`, {
            pickupDateTime: pickupDateTime.toISOString(),
            triggerTime: triggerTime.toISOString(),
            now: now.toISOString(),
            delay: delay
        });
        return { 
            success: false, 
            error: "Failed to calculate valid delay" 
        };
    }
    // Check if trigger time is in the past
    if(delay <= 0){
        console.warn(`⚠️ Trigger time is in the past for ride ${ride_request_id}. Delay: ${delay}ms`);
        return { 
            success: false, 
            error: "Trigger time is in the past" 
        };
    }
    // Additional safety: Ensure delay is not too large (e.g., max 30 days)
    const MAX_DELAY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    if(delay > MAX_DELAY){
        console.error(`❌ Delay too large for ride ${ride_request_id}: ${delay}ms (${Math.round(delay / (24 * 60 * 60 * 1000))} days)`);
        return { 
            success: false, 
            error: "Pickup time is too far in the future (max 30 days)" 
        };
    }
    try{
        console.log(`📋 Scheduling ride ${ride_request_id}:`, {
            pickup_date,
            pickup_time,
            pickupDateTime: pickupDateTime.toISOString(),
            triggerTime: triggerTime.toISOString(),
            delayMs: delay,
            delayMinutes: Math.round(delay / 60000)
        });
        const job = await scheduledRideQueue.add(
            `scheduled-ride-${ride_request_id}`,
            { ride_request_id, user_id, retry_count: 0 },
            { 
                delay: Math.floor(delay),
                jobId: `ride-${ride_request_id}-${Date.now()}`
            }
        );
        console.log(`✅ Scheduled ride job created: ${job.id}`);
        return { success: true, jobId: job.id };
    }catch(error){
        console.error(`❌ Error scheduling ride ${ride_request_id}:`, error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

async function shutdown(){
    try{
        if(scheduledWorker){
            await scheduledWorker.close();
        }
        if(scheduledRideQueue){
            await scheduledRideQueue.close();
        }
    } catch(error) {
        console.error("❌ Error during shutdown:", error);
    }
}

module.exports = { 
    initializeBullMQ, 
    scheduleRideNotification,
    startRideRequest, 
    startRideRequestWithRetry, 
    shutdown 
};