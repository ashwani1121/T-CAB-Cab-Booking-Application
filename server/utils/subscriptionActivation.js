const { Queue, Worker }                           = require("bullmq");
const IORedis                                     = require("ioredis");
const { sequelize, Sequelize }                    = require('../models');
const { DriverSubscriptions, Subscription, User } = require('../models');
const admin                                       = require('firebase-admin');
const { Op }                                      = Sequelize;

let subscriptionQueue;
let subscriptionWorker;
let redisConnection;

// Initialize BullMQ for subscription activation
async function initializeSubscriptionQueue(){
    try{
        redisConnection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
            maxRetriesPerRequest: null,
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            lazyConnect: true
        });
        
        await redisConnection.ping();
        console.log('✅ Redis connection for subscriptions established');
        
        // Create subscription queue
        subscriptionQueue = new Queue("subscriptionActivation", {
            connection: redisConnection,
            defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 200,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            }
        });
        
        // Create subscription worker
        subscriptionWorker = new Worker(
            "subscriptionActivation",
            async (job) => {
                const { driver_id, expired_subscription_id } = job.data;
                
                try{
                    console.log(`🔄 Processing subscription activation for driver ${driver_id}`);
                    const result = await activateQueuedSubscription(driver_id, expired_subscription_id);
                    return result;
                }catch(error){
                    console.error(`❌ Error processing subscription activation for driver ${driver_id}:`, error);
                    throw error;
                }
            },
            { 
                connection: redisConnection, 
                concurrency: 5  
            }
        );
        
        // Event handlers
        subscriptionWorker.on('completed', (job, result) => {
            if(result.success){
                console.log(`✅ Subscription activation job ${job.id} completed:`, result.message);
            }else{
                console.log(`ℹ️  Subscription activation job ${job.id} completed (no action):`, result.reason);
            }
        });
        
        subscriptionWorker.on('failed', (job, err) => {
            console.error(`❌ Subscription activation job ${job.id} failed:`, err.message);
        });
        
        await subscriptionQueue.waitUntilReady();
        console.log("✅ BullMQ Subscription Queue initialized successfully");
        
        // Schedule daily check at midnight
        await scheduleDailyCheck();
        
        return { success: true };
    }catch(err){
        console.error("❌ Failed to initialize subscription queue:", err);
        throw err;
    }
}

// Activate the next queued subscription for a driver
async function activateQueuedSubscription(driver_id, expired_subscription_id){
    let transaction;
    
    try{
        transaction = await sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        
        // FIX: Verify the expired subscription exists and is actually expired
        const expiredSubscription = await DriverSubscriptions.findOne({
            where: {
                id: expired_subscription_id,
                driver_id: driver_id,
                status: 'expired',
                payment_status: 'completed'
            },
            lock: transaction.LOCK.UPDATE,
            transaction
        });
        
        if(!expiredSubscription){
            await transaction.rollback();
            return { 
                success: false, 
                reason: 'Expired subscription not found or not in expired status',
                driver_id,
                expired_subscription_id
            };
        }
        
        // FIX: Find the next queued subscription with row-level locking to prevent race conditions
        const queuedSubscription = await DriverSubscriptions.findOne({
            where: {
                driver_id: driver_id,
                status: 'queued',
                payment_status: 'completed'
            },
            order: [['created_at', 'ASC']], // First In First Out
            include: [{
                model: Subscription,
                as: 'plan',
                attributes: ['id', 'name', 'duration_type', 'duration_value']
            }],
            lock: transaction.LOCK.UPDATE,
            transaction
        });
        
        if(!queuedSubscription){
            await transaction.commit();
            return { 
                success: false, 
                reason: 'No queued subscription found',
                driver_id 
            };
        }
        
        // FIX: Double-check that no other active subscription exists (prevents race condition)
        const existingActive = await DriverSubscriptions.findOne({
            where: {
                driver_id: driver_id,
                status: 'active',
                payment_status: 'completed',
                id: { [Op.ne]: queuedSubscription.id }
            },
            transaction
        });
        
        if(existingActive){
            await transaction.rollback();
            console.warn(`⚠️  Driver ${driver_id} already has an active subscription ${existingActive.id}, skipping activation`);
            return {
                success: false,
                reason: 'Driver already has an active subscription',
                driver_id,
                active_subscription_id: existingActive.id
            };
        }
        
        // Calculate new dates
        const startDate = new Date();
        let endDate = null;
        let ridesRemaining = queuedSubscription.total_rides;
        
        if(queuedSubscription.plan.duration_type === 'days'){
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + queuedSubscription.plan.duration_value);
        }
        
        // FIX: Parse existing metadata safely
        let metadata = {};
        try{
            metadata = JSON.parse(queuedSubscription.metadata || '{}');
        }catch(e){
            console.warn('Failed to parse subscription metadata:', e);
        }
        
        // Activate the queued subscription
        await DriverSubscriptions.update({
            status: 'active',
            start_date: startDate,
            end_date: endDate,
            rides_remaining: ridesRemaining,
            updated_at: new Date(),
            metadata: JSON.stringify({
                ...metadata,
                activated_at: new Date(),
                activated_by: 'bullmq_worker',
                activated_after_subscription: expiredSubscription.id,
                previous_subscription_plan: expiredSubscription.subscription_number
            })
        }, {
            where: { id: queuedSubscription.id },
            transaction
        });
        
        await transaction.commit();
        
        // Send activation notification (outside transaction)
        try{
            await sendSubscriptionActivatedNotification(
                driver_id,
                queuedSubscription.plan.name,
                queuedSubscription.plan.duration_type,
                queuedSubscription.plan.duration_value
            );
        }catch(notifError){
            console.warn(`⚠️  Failed to send activation notification to driver ${driver_id}:`, notifError.message);
        }
        
        console.log(`🎉 Activated queued subscription ${queuedSubscription.id} (${queuedSubscription.plan.name}) for driver ${driver_id}`);
        
        return {
            success: true,
            message: `Subscription ${queuedSubscription.plan.name} activated`,
            driver_id,
            subscription_id: queuedSubscription.id,
            plan_name: queuedSubscription.plan.name,
            start_date: startDate,
            end_date: endDate
        };
        
    }catch(error){
        if(transaction){
            await transaction.rollback();
        }
        console.error('❌ Error activating queued subscription:', error);
        throw error;
    }
}

// Schedule activation when subscription expires (called from rideCompleted)
async function scheduleSubscriptionActivation(driver_id, expired_subscription_id){
    if(!subscriptionQueue){
        console.error("❌ Subscription queue not initialized");
        return { success: false, error: "Queue not initialized" };
    }
    
    try{
        // FIX: Use unique job ID with timestamp to prevent duplicate scheduling
        const jobId = `sub-activate-${driver_id}-${expired_subscription_id}-${Date.now()}`;
        
        // FIX: Check if a recent job already exists (within last 10 seconds)
        const recentJobId = `sub-activate-${driver_id}-${expired_subscription_id}`;
        const jobs = await subscriptionQueue.getJobs(['waiting', 'active', 'delayed']);
        
        const recentJob = jobs.find(job => 
            job.id && job.id.startsWith(recentJobId) && 
            (Date.now() - job.timestamp) < 10000 // Within 10 seconds
        );
        
        if(recentJob){
            console.log(`ℹ️  Recent activation job already exists: ${recentJob.id}`);
            return { success: true, jobId: recentJob.id, status: 'already_scheduled' };
        }
        
        const job = await subscriptionQueue.add(
            `activate-subscription-${driver_id}`,
            {
                driver_id,
                expired_subscription_id,
                scheduled_at: new Date().toISOString()
            },
            {
                jobId: jobId,
                delay: 3000  // FIX: 3 second delay to ensure transaction is fully committed
            }
        );
        
        console.log(`📋 Scheduled subscription activation job: ${job.id} for driver ${driver_id}`);
        return { success: true, jobId: job.id, status: 'scheduled' };
        
    }catch(error){
        console.error(`❌ Error scheduling subscription activation:`, error);
        return { success: false, error: error.message };
    }
}

// Daily check for expired day-based subscriptions
async function scheduleDailyCheck(){
    if(!subscriptionQueue){
        console.error("❌ Subscription queue not initialized");
        return;
    }
    
    try{
        // Remove existing repeatable job if any
        const repeatableJobs = await subscriptionQueue.getRepeatableJobs();
        for(const job of repeatableJobs){
            if(job.name === 'daily-subscription-check'){
                await subscriptionQueue.removeRepeatableByKey(job.key);
            }
        }
        
        // Add new repeatable job - runs at midnight every day
        await subscriptionQueue.add(
            'daily-subscription-check',
            { type: 'daily_check' },
            {
                repeat: {
                    pattern: '0 0 * * *', // Cron: Every day at midnight
                    tz: 'Asia/Kolkata' // Adjust to your timezone
                },
                jobId: 'daily-subscription-check'
            }
        );
        
        console.log('📅 Daily subscription check scheduled (midnight)');
    }catch(error){
        console.error('❌ Error scheduling daily check:', error);
    }
}

// Process daily check for expired subscriptions
subscriptionWorker?.on('active', async (job) => {
    if(job.data.type === 'daily_check'){
        console.log('🔄 Running daily subscription expiry check...');
        await processDailyExpiryCheck();
    }
});

// Check all day-based subscriptions for expiry
async function processDailyExpiryCheck(){
    let transaction;
    
    try{
        const currentDate = new Date();
        const BATCH_SIZE = 50;
        let offset = 0;
        let processedCount = 0;
        let errorCount = 0;
        
        while(true){
            // Start new transaction for each batch
            transaction = await sequelize.transaction({
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
            });
            
            try{
                // Find expired day-based subscriptions in batches
                const expiredSubscriptions = await DriverSubscriptions.findAll({
                    where: {
                        status: 'active',
                        payment_status: 'completed',
                        end_date: {
                            [Op.lt]: currentDate
                        }
                    },
                    include: [{
                        model: Subscription,
                        as: 'plan',
                        where: {
                            duration_type: 'days'
                        },
                        attributes: ['id', 'name', 'duration_type']
                    }, {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'fcm_token']
                    }],
                    limit: BATCH_SIZE,
                    offset: offset,
                    lock: transaction.LOCK.UPDATE,
                    transaction
                });
                
                if(expiredSubscriptions.length === 0){
                    await transaction.commit();
                    break; // No more subscriptions to process
                }
                
                console.log(`📊 Processing batch of ${expiredSubscriptions.length} expired subscriptions (offset: ${offset})`);
                
                // FIX: Collect subscription IDs for batch processing
                const expiredSubIds = [];
                
                for(const expiredSub of expiredSubscriptions){
                    try{
                        // FIX: Parse metadata safely
                        let metadata = {};
                        try{
                            metadata = JSON.parse(expiredSub.metadata || '{}');
                        }catch(e){
                            console.warn(`Failed to parse metadata for subscription ${expiredSub.id}`);
                        }
                        
                        // Mark as expired
                        await DriverSubscriptions.update({
                            status: 'expired',
                            updated_at: new Date(),
                            metadata: JSON.stringify({
                                ...metadata,
                                expired_at: new Date(),
                                expired_by: 'daily_check'
                            })
                        }, {
                            where: { id: expiredSub.id },
                            transaction
                        });
                        
                        expiredSubIds.push({
                            driver_id: expiredSub.driver_id,
                            subscription_id: expiredSub.id,
                            driver: expiredSub.driver,
                            plan: expiredSub.plan
                        });
                        
                        console.log(`✅ Marked subscription ${expiredSub.id} as expired for driver ${expiredSub.driver_id}`);
                        processedCount++;
                        
                    }catch(subError){
                        console.error(`❌ Error processing subscription ${expiredSub.id}:`, subError);
                        errorCount++;
                        // Continue with next subscription
                    }
                }
                
                // Commit this batch
                await transaction.commit();
                transaction = null;
                
                // Schedule activation jobs and send notifications (outside transaction)
                for(const expiredInfo of expiredSubIds){
                    try{
                        // Send expiry notification
                        if(expiredInfo.driver?.fcm_token){
                            await sendSubscriptionExpiredNotification(
                                expiredInfo.driver.fcm_token,
                                expiredInfo.driver.name,
                                expiredInfo.plan.name
                            ).catch(notifError => {
                                console.warn(`⚠️  Failed to send expiry notification:`, notifError.message);
                            });
                        }
                        
                        // Schedule activation of queued subscription
                        await scheduleSubscriptionActivation(
                            expiredInfo.driver_id, 
                            expiredInfo.subscription_id
                        );
                        
                    }catch(activationError){
                        console.error(`❌ Error scheduling activation for driver ${expiredInfo.driver_id}:`, activationError);
                    }
                }
                
                offset += BATCH_SIZE;
                
            }catch(batchError){
                if(transaction){
                    await transaction.rollback();
                    transaction = null;
                }
                console.error(`❌ Error processing batch at offset ${offset}:`, batchError);
                errorCount += BATCH_SIZE;
                offset += BATCH_SIZE; // Skip this batch
            }
        }
        
        console.log(`✅ Daily expiry check completed - Processed: ${processedCount}, Errors: ${errorCount}`);
        
    }catch(error){
        if(transaction){
            await transaction.rollback();
        }
        console.error('❌ Daily expiry check failed:', error);
    }
}

// Send subscription expired notification
async function sendSubscriptionExpiredNotification(fcmToken, driverName, planName){
    const message = {
        token: fcmToken,
        notification: {
            title: "⏰ Subscription Expired",
            body: `Hi ${driverName}, your ${planName} subscription has expired. Commission charges will now apply.`
        },
        data: {
            type: "subscription_expired",
            plan_name: planName,
            timestamp: new Date().toISOString()
        },
        android: { priority: "high" },
        apns: { 
            payload: { 
                aps: { 
                    sound: "default",
                    badge: 1
                } 
            } 
        }
    };
    
    const result = await admin.messaging().send(message);
    console.log(`📱 Expiry notification sent: ${result}`);
    return { success: true, messageId: result };
}

// Send subscription activated notification
async function sendSubscriptionActivatedNotification(driver_id, planName, durationType, durationValue){
    try{
        const driver = await User.findByPk(driver_id, {
            attributes: ['fcm_token', 'name']
        });
        
        if(!driver || !driver.fcm_token){
            return { success: false, reason: 'No FCM token found' };
        }
        
        const durationText = durationType === 'days' ? `${durationValue} days` : `${durationValue} rides`;
        
        const message = {
            token: driver.fcm_token,
            notification: {
                title: "🎉 Subscription Activated",
                body: `Great news ${driver.name}! Your ${planName} subscription is now active. Enjoy ${durationText} of commission-free rides!`
            },
            data: {
                type: "subscription_activated",
                plan_name: planName,
                duration_type: durationType,
                duration_value: durationValue.toString(),
                timestamp: new Date().toISOString()
            },
            android: { priority: "high" },
            apns: { 
                payload: { 
                    aps: { 
                        sound: "default",
                        badge: 1
                    } 
                } 
            }
        };
        
        const result = await admin.messaging().send(message);
        console.log(`📱 Activation notification sent to driver ${driver_id}`);
        return { success: true, messageId: result };
    }catch(error){
        console.error(`❌ Error sending activation notification:`, error);
        return { success: false, reason: error.message };
    }
}

// Shutdown function
async function shutdownSubscriptionQueue(){
    try{
        if(subscriptionWorker){
            await subscriptionWorker.close();
            console.log('✅ Subscription worker closed');
        }
        if(subscriptionQueue){
            await subscriptionQueue.close();
            console.log('✅ Subscription queue closed');
        }
        if(redisConnection){
            await redisConnection.quit();
            console.log('✅ Redis connection closed');
        }
    }catch(error){
        console.error("❌ Error during subscription queue shutdown:", error);
    }
}

module.exports = {
    initializeSubscriptionQueue,
    scheduleSubscriptionActivation,
    activateQueuedSubscription,
    shutdownSubscriptionQueue
};