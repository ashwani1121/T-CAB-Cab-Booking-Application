const express                       = require('express');
const bodyParser                    = require('body-parser');
const querystring                   = require('querystring');
const crypto                        = require('crypto');
const axios                         = require("axios");
const { v4: uuidv4 }                = require("uuid");
const { sequelize, Sequelize, Op }  = require('../../models');
const { User }                      = require("../../models");
const { Role }                      = require("../../models");
const { UserRole }                  = require("../../models");
const { DriverDetails }             = require("../../models");
const { DriverDeposit }             = require("../../models");
const { Package }                   = require("../../models");
const { Wallets }                   = require("../../models");
const { WalletTransactions }        = require("../../models");
const { ReservationAdvancePayment } = require("../../models");
const { RideRequests }              = require("../../models");
const { RidePaymentOrder }          = require("../../models");
const { Subscription }              = require("../../models");
const { DriverSubscriptions }       = require("../../models");
const rideController                = require('./rideController'); 
require("dotenv").config();

// ============================================================
// SUBSCRIPTION PAYMENT WEBHOOK HANDLER
// ============================================================
const handleSubscriptionWebhook = async (webhookData, res) => {
    let transaction;
    try{
        const {
            txnid,
            status,
            amount,
            easepayid,
            bank_ref_num,
            udf1: user_id,
            udf2: plan_id,
            udf3: payment_type,
            udf4: subscription_number,
            udf5: duration_type,
            udf6: duration_value,
            udf7: subscription_status,  // 'active' or 'queued'
            udf8: previous_subscription_id,
            error: errorMsg,
            error_Message
        } = webhookData;
        
        console.log(`📥 Processing subscription webhook for txnid: ${txnid}, status: ${status}`);
        
        transaction = await sequelize.transaction();
        
        // Find the subscription record
        const subscription = await DriverSubscriptions.findOne({
            where: { transaction_id: txnid },
            include: [{
                model: Subscription,
                as: 'plan',
                attributes: ['id', 'name', 'duration_type', 'duration_value']
            }],
            transaction
        });
        
        if(!subscription){
            console.error(`❌ Subscription not found for txnid: ${txnid}`);
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: "Subscription record not found"
            });
        }
        
        // ============================================================
        // HANDLE SUCCESSFUL PAYMENT
        // ============================================================
        if(status === 'success'){
            // Update subscription with payment success
            const updateData = {
                payment_status: 'completed',
                gateway_transaction_id: easepayid || null,
                gateway_payment_id: easepayid || null,
                metadata: JSON.stringify({
                    ...JSON.parse(subscription.metadata || '{}'),
                    payment_completed_at: new Date(),
                    easepayid: easepayid,
                    bank_ref_num: bank_ref_num,
                    webhook_received_at: new Date()
                }),
                updated_at: new Date()
            };
            
            // FIX: Check the original subscription_status from UDF, not database status
            // The database might have been set to 'queued' during initiation
            const wasQueued = subscription_status === 'queued';
            
            if(wasQueued){
                // Keep as queued, will be activated when previous subscription expires
                updateData.status = 'queued';
                console.log(`📋 Subscription ${subscription.id} set to queued, will activate when subscription ${previous_subscription_id} expires`);
            }else{
                // Set to active immediately
                updateData.status = 'active';
                console.log(`🎉 Subscription ${subscription.id} activated immediately`);
            }
            
            await DriverSubscriptions.update(updateData, {
                where: { transaction_id: txnid },
                transaction
            });
            
            await transaction.commit();
            
            return res.status(200).json({
                success: true,
                message: wasQueued 
                    ? "Subscription payment successful - queued for activation"
                    : "Subscription activated successfully",
                transaction_id: txnid,
                subscription_number: subscription_number,
                subscription_status: wasQueued ? 'queued' : 'active',
                is_queued: wasQueued
            });
        }
        // ============================================================
        // HANDLE FAILED OR CANCELLED PAYMENT
        // ============================================================
        else if(status === 'failure' || status === 'userCancelled'){
            console.log(`❌ Subscription payment failed for txnid: ${txnid}, reason: ${status}`);
            
            const failureReason = errorMsg || error_Message || 'Payment failed or cancelled by user';
            
            await DriverSubscriptions.update({
                payment_status: 'failed',
                status: 'cancelled',
                cancellation_reason: failureReason,
                cancelled_at: new Date(),
                metadata: JSON.stringify({
                    ...JSON.parse(subscription.metadata || '{}'),
                    payment_failed_at: new Date(),
                    failure_reason: failureReason,
                    easepayid: easepayid,
                    bank_ref_num: bank_ref_num,
                    webhook_received_at: new Date()
                }),
                updated_at: new Date()
            }, {
                where: { transaction_id: txnid },
                transaction
            });
            
            await transaction.commit();
            
            return res.status(200).json({
                success: false,
                message: "Subscription payment failed",
                transaction_id: txnid,
                reason: failureReason
            });
        }
        // ============================================================
        // HANDLE UNKNOWN STATUS
        // ============================================================
        else{
            console.log(`⚠️  Unknown payment status: ${status} for txnid: ${txnid}`);
            
            await DriverSubscriptions.update({
                metadata: JSON.stringify({
                    ...JSON.parse(subscription.metadata || '{}'),
                    unknown_status_at: new Date(),
                    received_status: status,
                    webhook_received_at: new Date()
                }),
                updated_at: new Date()
            }, {
                where: { transaction_id: txnid },
                transaction
            });
            
            await transaction.commit();
            
            return res.status(200).json({
                success: false,
                message: "Unknown payment status",
                transaction_id: txnid,
                status: status
            });
        }
    }catch(error){
        console.error("❌ Subscription webhook error:", error.message);
        if(transaction){
            try{
                await transaction.rollback();
                console.log("↩️  Transaction rolled back");
            }catch(rollbackError){
                console.error("❌ Transaction rollback error:", rollbackError);
            }
        }
        return res.status(200).json({
            success: false,
            message: "Webhook processing error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const easebuzzController            = {

    // ============================================================
    // WEBHOOK HANDLER 
    // ============================================================
    webhook: async (req, res) => {
        let transaction;
        const webhookStartTime = Date.now();
        try{
            // 1. PARSE AND VALIDATE WEBHOOK DATA
            let webhookData = req.body;
            if(req.rawBody){
                console.log("📥 Raw webhook body received:", req.rawBody.toString().substring(0, 200));
            }
            // Handle URL-encoded data if body parser failed
            if(!webhookData || Object.keys(webhookData).length === 0){
                if (req.rawBody && req.rawBody.length > 0) {
                    webhookData = querystring.parse(req.rawBody.toString());
                    console.log("🔄 Manually parsed webhook data");
                }
            }
            // Validate webhook data exists
            if(!webhookData || Object.keys(webhookData).length === 0){
                console.error("❌ Empty webhook body received");
                return res.status(200).json({
                    success: false,
                    message: "Empty webhook payload"
                });
            }
            // 2. EXTRACT AND VALIDATE REQUIRED FIELDS
            const {
                txnid,
                status,
                amount,
                email,
                firstname,
                hash,
                easepayid,
                bank_ref_num,
                productinfo,
                udf1, udf2, udf3, udf4, udf5, udf6, udf7, udf8, udf9, udf10,
                error: errorMsg,
                error_Message
            } = webhookData;
            // Validate required fields
            if(!txnid || !status || !amount || !email || !firstname || !hash){
                console.error("❌ Missing required webhook parameters:", {
                    txnid: !!txnid,
                    status: !!status,
                    amount: !!amount,
                    email: !!email,
                    firstname: !!firstname,
                    hash: !!hash
                });
                return res.status(400).json({
                    success: false,
                    message: "Missing required webhook parameters"
                });
            }
            // 3. VERIFY HASH SIGNATURE
            const {
                udf1: user_udf     = '',
                udf2: pkg_udf      = '',
                udf3: veh_udf      = '',
                udf4: fare_udf     = '',
                udf5: date_udf     = '',
                udf6: km_udf       = '',
                udf7: days_udf     = '',
                udf8: udf8_val     = '',
                udf9: udf9_val     = '',
                udf10: udf10_val   = ''
            } = webhookData;
            const productInfoToUse = productinfo || "";
            const hashString       = `${process.env.EASEBUZZ_SALT}|${status}|${udf10_val}|${udf9_val}|${udf8_val}|${days_udf}|${km_udf}|${date_udf}|${fare_udf}|${veh_udf}|${pkg_udf}|${user_udf}|${email}|${firstname}|${productInfoToUse}|${amount}|${txnid}|${process.env.EASEBUZZ_KEY}`;
            const computedHash     = crypto.createHash("sha512").update(hashString).digest("hex");
            if(computedHash !== hash){
                console.error("❌ Hash mismatch detected!", {
                    received: hash,
                    computed: computedHash,
                    txnid: txnid
                });
                return res.status(400).json({
                    success: false,
                    message: "Hash verification failed - Possible tampering detected"
                });
            }
            // 4. DETERMINE TRANSACTION TYPE
            const isWalletTopup    = txnid.startsWith('TOPUP_');
            const isAdvancePayment = txnid.startsWith('ADV_');
            const isRidePayment    = txnid.startsWith('RIDE_');
            const isSubscription   = txnid.startsWith('SUB_');
            const isDriverDeposit  = !isWalletTopup && !isAdvancePayment && !isRidePayment && !isSubscription;
            // 5. ROUTE TO APPROPRIATE HANDLER
            if(isWalletTopup){
                return await handleWalletTopupWebhook(webhookData, res);
            }else 
            if(isAdvancePayment){
                return await handleAdvancePaymentWebhook(webhookData, res);
            }else 
            if(isRidePayment){
                console.log("🚗 Routing to ride payment handler");
                return await handleRidePaymentWebhook(webhookData, res);
            }else 
            if(isDriverDeposit){
                console.log("👤 Routing to driver deposit handler");
                return await handleDriverDepositWebhook(webhookData, res);
            }else
            if(isSubscription){
                console.log("📦 Routing to subscription payment handler");
                return await handleSubscriptionWebhook(webhookData, res);
            }else{
                console.log("No Transaction Id matched");
            }
        }catch(err){
            if(transaction){
                try{
                    await transaction.rollback();
                    console.log("↩️ Transaction rolled back");
                }catch(rollbackError){
                    console.error("❌ Transaction rollback error:", rollbackError);
                }
            }
            const processingTime = Date.now() - webhookStartTime;
            return res.status(200).json({
                success: false,
                message: "Webhook processing error",
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // ============================================================
    // SUBSCRIPTION PAYMENT INITIATION
    // ============================================================
    initiateSubscriptionPayment: async (req, res) => {
        let transaction;
        try{
            const { plan_id } = req.body;
            const errors = [];
            
            // Validate user authentication
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: User not authenticated"
                });
            }
            
            const userId = req.user.userId;
            
            // Fetch user details with role verification
            const user = await User.findOne({
                where: { id: userId },
                include: [{
                    model: UserRole,
                    required: true,
                    include: [{
                        model: Role,
                        required: true,
                        where: { name: 'Driver' } 
                    }]
                }]
            });
            
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
            
            // Check if user is a driver
            const isDriver = user.UserRoles?.some(ur => ur.Role?.name === 'Driver');
            if(!isDriver){
                return res.status(403).json({
                    success: false,
                    message: "Only drivers can purchase subscriptions"
                });
            }
            
            // Validate plan_id
            if(!plan_id){
                errors.push("Subscription plan is required");
            }
            
            if(errors.length > 0){
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: errors
                });
            }
            
            // Fetch subscription plan details
            const plan = await Subscription.findOne({
                where: { 
                    id: plan_id,
                    status: 'active'
                }
            });
            
            if(!plan){
                return res.status(404).json({
                    success: false,
                    message: "Subscription plan not found or inactive"
                });
            }
            
            // FIX: Use transaction for checking existing subscriptions
            transaction = await sequelize.transaction();
            
            // Check for existing active subscription
            const existingSubscriptions = await DriverSubscriptions.findAll({
                where: {
                    driver_id: userId,
                    status: {
                        [Op.in]: ['active', 'queued']
                    },
                    payment_status: 'completed',
                    [Op.or]: [
                        // For days-based subscriptions, check end_date
                        {
                            end_date: {
                                [Op.gte]: new Date()
                            }
                        },
                        // For rides-based subscriptions, check rides_remaining
                        {
                            rides_remaining: {
                                [Op.gt]: 0
                            }
                        },
                        // For queued subscriptions
                        {
                            status: 'queued'
                        }
                    ]
                },
                order: [['end_date', 'DESC'], ['created_at', 'DESC']],
                include: [{
                    model: Subscription,
                    as: 'plan',
                    attributes: ['id', 'name', 'duration_type', 'duration_value']
                }],
                transaction
            });
            
            // FIX: Limit maximum queued subscriptions (prevent abuse)
            const MAX_QUEUED_SUBSCRIPTIONS = 3;
            const queuedCount = existingSubscriptions.filter(s => s.status === 'queued').length;
            
            if(queuedCount >= MAX_QUEUED_SUBSCRIPTIONS){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `You already have ${queuedCount} queued subscriptions. Please wait for them to activate before purchasing more.`,
                    queued_subscriptions: queuedCount,
                    max_allowed: MAX_QUEUED_SUBSCRIPTIONS
                });
            }
            
            // Find the last subscription (active or queued with latest end_date)
            const lastSubscription = existingSubscriptions.length > 0 ? existingSubscriptions[0] : null;
            
            // DETERMINE START DATE AND STATUS FOR NEW SUBSCRIPTION
            let startDate = new Date();
            let subscriptionStatus = 'active';
            let isQueued = false;
            
            if(lastSubscription){
                isQueued = true;
                subscriptionStatus = 'queued';
                
                // For day-based subscriptions, start after current one ends
                if(lastSubscription.end_date){
                    startDate = new Date(lastSubscription.end_date);
                    startDate.setDate(startDate.getDate() + 1); // Start next day after current expires
                    console.log(`📅 Queueing subscription after day-based subscription:`, {
                        current_ends: lastSubscription.end_date,
                        new_starts: startDate.toISOString()
                    });
                } 
                // For ride-based subscriptions, we can't predict exact end date
                else if(lastSubscription.rides_remaining > 0){
                    // Keep current date - will be updated when previous subscription completes
                    console.log(`📅 Queueing subscription after ride-based subscription:`, {
                        rides_remaining: lastSubscription.rides_remaining
                    });
                }
            }
            
            // Generate unique transaction ID
            const txnid = `SUB_${uuidv4().replace(/-/g, "_").substring(0, 16)}`;
            
            if(!/^[a-zA-Z0-9_\|\-\/]{1,40}$/.test(txnid)){
                await transaction.rollback();
                return res.status(500).json({
                    success: false,
                    message: "Invalid transaction ID format"
                });
            }
            
            // Generate subscription number
            const subscriptionNumber = `SUBSC-${Date.now()}-${userId}`;
            const subscriptionAmount = parseFloat(plan.price).toFixed(2);
            
            // Prepare payment data for Easebuzz
            const paymentData = {
                key            : process.env.EASEBUZZ_KEY,
                txnid          : txnid,
                amount         : subscriptionAmount,
                productinfo    : `Subscription ${plan.name}`,
                firstname      : user.name.trim(),
                phone          : user.mobile.toString().trim(),
                email          : user.email.trim(),
                surl           : `${process.env.BASE_URL}/payment/success`,
                furl           : `${process.env.BASE_URL}/payment/failure`,
                udf1           : userId.toString(),
                udf2           : plan_id.toString(),
                udf3           : 'subscription',
                udf4           : subscriptionNumber,
                udf5           : plan.duration_type,
                udf6           : plan.duration_value.toString(),
                udf7           : isQueued ? 'queued' : 'active',  // Queue status
                udf8           : lastSubscription ? lastSubscription.id.toString() : '',  // Previous subscription ID
                udf9           : '',
                udf10          : ''
            };
            
            // Generate hash for Easebuzz
            const hashString = `${paymentData.key}|${paymentData.txnid}|${paymentData.amount}|${paymentData.productinfo}|${paymentData.firstname}|${paymentData.email}|${paymentData.udf1}|${paymentData.udf2}|${paymentData.udf3}|${paymentData.udf4}|${paymentData.udf5}|${paymentData.udf6}|${paymentData.udf7}|${paymentData.udf8}|${paymentData.udf9}|${paymentData.udf10}|${process.env.EASEBUZZ_SALT}`;
            const hash = crypto.createHash("sha512").update(hashString).digest("hex");
            paymentData.hash = hash;
            
            // Calculate subscription dates
            let endDate = null;
            let totalRides = null;
            let ridesRemaining = null;
            
            if(plan.duration_type === 'days'){
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + plan.duration_value);
            }else if(plan.duration_type === 'rides'){
                totalRides = plan.duration_value;
                ridesRemaining = plan.duration_value;
            }
            
            // Create pending subscription record
            await DriverSubscriptions.create({
                driver_id               : userId,
                plan_id                 : plan_id,
                transaction_id          : txnid,
                subscription_number     : subscriptionNumber,
                start_date              : startDate,
                end_date                : endDate,
                rides_remaining         : ridesRemaining,
                rides_used              : 0,
                total_rides             : totalRides,
                amount_paid             : subscriptionAmount,
                payment_status          : 'pending',
                payment_method          : 'easebuzz',
                payment_gateway         : 'easebuzz',
                gateway_order_id        : txnid,
                status                  : subscriptionStatus, // 'active' or 'queued' - will remain 'queued' until payment
                auto_renew              : false,
                metadata                : JSON.stringify({
                    plan_name           : plan.name,
                    plan_description    : plan.description,
                    commission_waiver   : plan.commission_waiver,
                    max_daily_rides     : plan.max_daily_rides,
                    initiated_at        : new Date(),
                    user_agent          : req.headers['user-agent'],
                    is_queued           : isQueued,
                    queued_after_subscription: lastSubscription ? lastSubscription.id : null,
                    current_subscription_end_date: lastSubscription?.end_date || null,
                    current_subscription_rides_remaining: lastSubscription?.rides_remaining || null
                }),
                created_at              : new Date(),
                updated_at              : new Date()
            }, { transaction });
            
            // Commit transaction before calling external API
            await transaction.commit();
            transaction = null; // Mark as committed
            
            // Call Easebuzz API to initiate payment
            const response = await axios.post(
                "https://testpay.easebuzz.in/payment/initiateLink",
                new URLSearchParams(paymentData).toString(), {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Accept: "application/json",
                    },
                }
            );
            
            if(response.data && response.data.status === 1){
                return res.status(200).json({
                    success             : true,
                    message             : isQueued 
                        ? "Subscription payment initiated successfully. Your subscription will be queued and activated after your current subscription expires."
                        : "Subscription payment initiated successfully",
                    data                : response.data.data,
                    transaction_id      : txnid,
                    subscription_number : subscriptionNumber,
                    amount              : subscriptionAmount,
                    subscription_info   : {
                        is_queued       : isQueued,
                        status          : subscriptionStatus,
                        will_start_on   : startDate.toISOString(),
                        current_subscription: lastSubscription ? {
                            subscription_number: lastSubscription.subscription_number,
                            plan_name: lastSubscription.plan.name,
                            status: lastSubscription.status,
                            end_date: lastSubscription.end_date,
                            rides_remaining: lastSubscription.rides_remaining
                        } : null,
                        queue_position  : queuedCount + 1
                    },
                    plan_details        : {
                        name            : plan.name,
                        description     : plan.description,
                        duration_type   : plan.duration_type,
                        duration_value  : plan.duration_value,
                        start_date      : startDate,
                        end_date        : endDate,
                        total_rides     : totalRides,
                        commission_waiver: plan.commission_waiver
                    }
                });
            }else{
                // Update subscription as failed
                await DriverSubscriptions.update({
                    payment_status: 'failed',
                    status: 'cancelled',
                    cancellation_reason: response.data?.error_desc || "Payment initiation failed",
                    cancelled_at: new Date(),
                    updated_at: new Date()
                }, {
                    where: { transaction_id: txnid }
                });
                
                return res.status(400).json({
                    success: false,
                    message: response.data?.error_desc || "Payment initiation failed",
                    error: response.data
                });
            }
        }catch(error){
            console.error("Failed to initiate subscription payment:", error.message);
            
            // Rollback if transaction is still active
            if(transaction){
                try{
                    await transaction.rollback();
                }catch(rollbackError){
                    console.error("Transaction rollback error:", rollbackError);
                }
            }
            
            if(error.response){
                return res.status(error.response.status).json({
                    success: false,
                    message: error.response.data?.error_desc || "Payment gateway error",
                    error: error.response.data
                });
            }
            
            return res.status(500).json({
                success: false,
                message: "Something went wrong. Please try again later!",
            });
        }
    },

    // ============================================================
    // CREATE ORDER WITH QR CODE 
    // ============================================================
    createOrderWithQR: async (req, res) => {
        let transaction;
        try{
            const { ride_request_id } = req.body;
            // 2. INPUT VALIDATION
            const errors = [];
            if(!ride_request_id){
                errors.push("Ride request ID is required");
            }else 
            if(isNaN(ride_request_id) || parseInt(ride_request_id) <= 0){
                errors.push("Invalid ride request ID format");
            }
            if(errors.length > 0){
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: errors
                });
            }
            // 3. ENVIRONMENT CONFIGURATION VALIDATION
            if(!process.env.EASEBUZZ_KEY || !process.env.EASEBUZZ_SALT){
                console.error("❌ Missing payment gateway configuration");
                return res.status(500).json({
                    success: false,
                    message: "Payment gateway configuration error"
                });
            }
            // 4. START DATABASE TRANSACTION
            transaction = await sequelize.transaction();
            // 5. FETCH RIDE REQUEST WITH CUSTOMER DETAILS
            const rideRequest = await RideRequests.findOne({
                where: { id: ride_request_id },
                include: [{
                    model: User,
                    as: 'passenger',
                    attributes: ['id', 'name', 'email', 'mobile']
                }],
                transaction,
                lock: true 
            });
            if(!rideRequest){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Ride request not found"
                });
            }
            // 7. RIDE STATUS VALIDATION
            if(rideRequest.status !== 'ride_completed'){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Ride must be completed before generating payment QR. Current status: ${rideRequest.status}`
                });
            }
            // 8. PAYMENT METHOD VALIDATION
            if(rideRequest.payment_method !== 'cash'){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `QR payment is only available for cash payment rides. Current payment method: ${rideRequest.payment_method}`
                });
            }
            // 9. CHECK FOR DUPLICATE PAYMENT
            if(rideRequest.payment_status === 'paid'){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Payment has already been completed for this ride"
                });
            }
            // Check for existing pending payment orders
            const existingOrder = await RidePaymentOrder.findOne({
                where: {
                    ride_request_id: ride_request_id,
                    payment_status: ['pending', 'success']
                },
                transaction
            });
            if(existingOrder){
                if(existingOrder.payment_status === 'success'){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: "Payment has already been completed for this ride"
                    });
                }
                // Check if pending order is still valid (not expired)
                if(existingOrder.expires_at && new Date(existingOrder.expires_at) > new Date()){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: "A payment QR code already exists for this ride",
                        data: {
                            qr_code_url: existingOrder.qr_code,
                            payment_link: existingOrder.payment_url,
                            expires_at: existingOrder.expires_at,
                            order_id: existingOrder.order_id
                        }
                    });
                }
            }
            // 10. FARE VALIDATION
            const finalFare = parseFloat(rideRequest.final_fare);
            if(!finalFare || isNaN(finalFare) || finalFare <= 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Invalid final fare amount in ride request"
                });
            }
            if(finalFare > 100000){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Final fare cannot exceed ₹1,00,000"
                });
            }
            // 11. CUSTOMER DETAILS VALIDATION
            const customer = rideRequest.passenger;
            if(!customer){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Customer details not found for this ride"
                });
            }
            const customerName  = (customer.name || rideRequest.rider_name || 'Customer').trim();
            const customerEmail = (customer.email || `customer${customer.id}@placeholder.com`).trim();
            const customerPhone = (customer.mobile || rideRequest.rider_mobile || '').toString().trim();
            if(!customerPhone){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Customer phone number not found"
                });
            }
            // Validate phone format
            if(!/^[6-9]\d{9}$/.test(customerPhone)){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Invalid customer phone number format"
                });
            }
            // 12. GENERATE ORDER DETAILS
            const uniqueRequestNumber = `RIDE${ride_request_id}_${Date.now().toString().slice(-8)}`;
            const orderId             = `RIDE_${ride_request_id}_${uuidv4().replace(/-/g, "_").substring(0, 10)}`;
            const amount              = finalFare;
            const udf1                = ride_request_id.toString();
            const udf2                = 'ride_fare';
            const udf3                = customer.id.toString();
            const udf4                = orderId.toString();
            const udf5                = orderId;
            // 13. GENERATE AUTHORIZATION HASH
            const hashString          = `${process.env.EASEBUZZ_KEY}|${uniqueRequestNumber}|${amount}|${amount}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${process.env.EASEBUZZ_SALT}`;
            const authorization       = crypto.createHash("sha512").update(hashString).digest("hex");
            // 14. SET EXPIRY TIME (24 HOURS)
            const expiresAt           = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            const expiryDateFormatted = expiresAt.toISOString().replace('T', ' ').substring(0, 19);
            const instaCollectPayload = {
                key: process.env.EASEBUZZ_KEY,
                unique_request_number: uniqueRequestNumber,
                amount: amount.toFixed(2),
                per_transaction_amount: amount.toFixed(2),
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_email: customerEmail,
                notify_customer_on_create: true,
                notification_cycle_type: "daily",
                allowed_collection_modes: ["upi", "bank_account"],
                expiry_date: expiryDateFormatted,
                udf1: udf1,
                udf2: udf2,
                udf3: udf3,
                udf4: udf4,
                udf5: udf5
            };
            // 16. CALL EASEBUZZ INSTA-COLLECT API
            const easebuzzResponse = await axios.post(
                "https://testpay.easebuzz.in/api/v1/insta-collect/order/create/",
                instaCollectPayload,{
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": authorization,
                        "WIRE-API-KEY": process.env.EASEBUZZ_KEY,
                        "Accept": "application/json"
                    },
                    timeout: 30000
                }
            );
            // 17. VALIDATE EASEBUZZ RESPONSE
            if(!easebuzzResponse.data || !easebuzzResponse.data.success){
                console.error("❌ Easebuzz API Error:", easebuzzResponse.data);
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Failed to create payment order with Easebuzz",
                    error: easebuzzResponse.data?.message || "Unknown error from payment gateway"
                });
            }
            const transactionOrder = easebuzzResponse.data.data.transaction_order;
            const virtualAccount   = transactionOrder.virtual_account;
            const qrCodeUrl        = virtualAccount.upi_qrcode_url;
            const upiHandle        = virtualAccount.upi_handle;
            const paymentLink      = transactionOrder.payment_link;
            // 18. CREATE PAYMENT ORDER RECORD IN DATABASE
            const orderRecord      = await RidePaymentOrder.create({
                order_id: orderId,
                ride_request_id: ride_request_id,
                transaction_id: transactionOrder.id,
                amount: parseFloat(finalFare).toFixed(2),
                payment_type: 'ride_fare',
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                payment_url: paymentLink,
                qr_code: qrCodeUrl,
                payment_status: 'pending',
                breakdown: rideRequest.actual_fare_breakdown || rideRequest.fare_breakdown || null,
                metadata: {
                    ride_details: {
                        pickup: rideRequest.pickup_address,
                        drop: rideRequest.dropoff_address,
                        completed_at: rideRequest.ride_completed_at,
                        distance: rideRequest.actual_distance || rideRequest.estimated_distance,
                        duration: rideRequest.actual_duration || rideRequest.estimated_duration
                    },
                    driver_id: driverId,
                    customer_id: customer.id,
                    easebuzz_order_id: transactionOrder.id,
                    unique_request_number: uniqueRequestNumber,
                    virtual_account: {
                        account_number: virtualAccount.account_number,
                        ifsc: virtualAccount.ifsc,
                        upi_handle: upiHandle
                    },
                    created_via: 'driver_app_insta_collect',
                    original_payment_method: 'cash'
                },
                expires_at: expiresAt,
                created_at: new Date(),
                updated_at: new Date()
            }, { transaction });
            await transaction.commit();
            return res.status(201).json({
                success: true,
                message: "Payment QR code generated successfully",
                data: {
                    order_id: orderId,
                    qr_code_url: qrCodeUrl,
                    payment_link: paymentLink,
                    virtual_account: {
                        upi_handle: upiHandle,
                        account_number: virtualAccount.account_number,
                        ifsc: virtualAccount.ifsc
                    },
                    amount: parseFloat(finalFare).toFixed(2),
                    expires_at: expiresAt,
                    ride_request_id: ride_request_id
                }
            });
        }catch(error){
            if(transaction){
                try{
                    await transaction.rollback();
                }catch(rollbackError){
                    console.error("❌ Transaction rollback error:", rollbackError);
                }
            }
            console.error("❌ Easebuzz API Error:", error);
            if(error.response){
                console.error("❌ Easebuzz API Response:", error.response.data);
                return res.status(error.response.status || 500).json({
                    success: false,
                    message: error.response.data?.message || "Payment gateway error",
                    error: process.env.NODE_ENV === 'development' ? error.response.data : undefined
                });
            }
            if(error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'){
                return res.status(504).json({
                    success: false,
                    message: "Payment gateway timeout. Please try again."
                });
            }
            if(error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND'){
                return res.status(503).json({
                    success: false,
                    message: "Payment gateway service unavailable. Please try again later."
                });
            }
            return res.status(500).json({
                success: false,
                message: "Failed to create payment order",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    
    // ============================================================
    // INITIATE DRIVER DEPOSIT PAYMENT
    // ============================================================
    initiatePayment: async (req, res) => {
        try{
            const { firstname, phone, email, amount } = req.body;
            const errors = []; 
            // Validation 
            if(!firstname || firstname.trim() === ""){
                errors.push("First name is required");
            }else 
            if(!/^[a-zA-Z0-9&\-._ '()/,@]+$/.test(firstname)){
                errors.push("First name contains invalid characters");
            }else 
            if(firstname.length < 2 || firstname.length > 50) {
                errors.push("First name must be between 2 and 50 characters");
            }
            if(!phone || phone.toString().trim() === ""){
                errors.push("Phone number is required");
            }else 
            if(!/^(\+\d{1,4}[-]?)?\d{5,20}$/.test(phone.toString())){
                errors.push("Invalid phone number format");
            }
            if(!email || email.trim() === ""){
                errors.push("Email is required");
            }else 
            if(!/^(([^<>()\[\]\.,;:\s@"]+(\.[^<>()\[\]\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
                errors.push("Invalid email format");
            }else 
            if(email.length > 100){
                errors.push("Email is too long");
            }
            if(!amount && amount !== 0){
                errors.push("Amount is required");
            }else 
            if(!/^[0-9.]*$/.test(amount.toString())){
                errors.push("Amount must contain only numbers and decimal point");
            }else 
            if(isNaN(amount) || parseFloat(amount) <= 0){
                errors.push("Amount must be a positive number");
            }else 
            if(parseFloat(amount) > 100000){
                errors.push("Amount cannot exceed ₹1,00,000");
            }
            if(errors.length > 0){
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: errors
                });
            }
            if(!process.env.EASEBUZZ_KEY || !/^[a-zA-Z0-9_]{1,15}$/.test(process.env.EASEBUZZ_KEY)){
                return res.status(500).json({
                    success: false,
                    message: "Invalid merchant key configuration"
                });
            }
            const txnid = uuidv4().replace(/-/g, "_").substring(0, 20);
            if(!/^[a-zA-Z0-9_\|\-\/]{1,40}$/.test(txnid)){
                return res.status(500).json({
                    success: false,
                    message: "Invalid transaction ID format"
                });
            }
            const paymentData = {
                key           : process.env.EASEBUZZ_KEY,
                txnid         : txnid,
                amount        : parseFloat(amount).toFixed(2),
                productinfo   : "Driver Registration Deposit Amount",
                firstname     : firstname.trim(),
                phone         : phone.toString().trim(),
                email         : email.trim(),
                surl          : `${process.env.BASE_URL}/payment/success`,
                furl          : `${process.env.BASE_URL}/payment/failure`
            };
            const hashString  = `${paymentData.key}|${paymentData.txnid}|${paymentData.amount}|${paymentData.productinfo}|${paymentData.firstname}|${paymentData.email}|||||||||||${process.env.EASEBUZZ_SALT}`;
            const hash        = crypto.createHash("sha512").update(hashString).digest("hex");
            paymentData.hash  = hash;
            const response    = await axios.post("https://testpay.easebuzz.in/payment/initiateLink",
                new URLSearchParams(paymentData).toString(),{
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Accept: "application/json",
                    },
                }
            );
            if(response.data && response.data.status === 1){
                return res.status(200).json({
                    success : true,
                    message : "Payment initiated successfully",
                    data    : response.data.data
                });
            }else{
                return res.status(400).json({
                    success : false,
                    message : response.data?.error_desc || "Payment initiation failed",
                    error   : response.data
                });
            }
        }catch(error){
            console.error("Failed to initiate payment:", error.message);
            if(error.response){
                return res.status(error.response.status).json({
                    success: false,
                    message: error.response.data?.error_desc || "Payment gateway error",
                    error: error.response.data
                });
            }
            return res.status(500).json({
                success: false,
                message: "Something went wrong. Please try again later!",
            });
        }
    },

    // ============================================================
    // INITIATE RESERVATION ADVANCE PAYMENT
    // ============================================================
    initiateReservationAdvance: async (req, res) => {
        try{
            const { 
                package_id,          
                vehicle_type_id, 
                trip_id,
                estimated_total_fare,
                pickup_date,
                pickup_time,
                pickup,
                drop,
                custom_km,           
                custom_days          
            } = req.body;
            const errors = [];
            // Validate user authentication
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            // Validate pickup and drop locations BEFORE storing
            if(!pickup || typeof pickup !== 'object'){
                errors.push("Valid pickup location is required");
            }else{
                if(!pickup.address) errors.push("Pickup address is required");
                if(!pickup.latitude || !pickup.longitude) errors.push("Pickup coordinates are required");
                if(!pickup.state) errors.push("Pickup state is required");
                if(!pickup.district) errors.push("Pickup district is required");
            }
            if(!drop || typeof drop !== 'object'){
                errors.push("Valid drop location is required");
            }else{
                if(!drop.address) errors.push("Drop address is required");
                if(!drop.latitude || !drop.longitude) errors.push("Drop coordinates are required");
                if(!drop.state) errors.push("Drop state is required");
                if(!drop.district) errors.push("Drop district is required");
            }
            
            // Fetch user details
            const user = await User.findOne({
                where: { id: req.user.userId },
                include: [{
                    model: UserRole,
                    where: { role_id: 2 },
                    required: true
                }]
            });
            
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
            
            // Determine if this is a custom trip or standard reservation
            const isCustomTrip          = custom_km && custom_days && !package_id;
            const isStandardReservation = package_id && !custom_km && !custom_days;
            
            if(!isCustomTrip && !isStandardReservation){
                errors.push("Either provide package_id OR (custom_km and custom_days), not both");
            }
            
            let packageData        = null;
            let advanceAmount      = 0;
            let productDescription = '';
            
            // STANDARD RESERVATION - Validate package
            if(isStandardReservation){
                if(!package_id){
                    errors.push("Package ID is required for standard reservation");
                }else{
                    packageData = await Package.findOne({
                        where: { id: package_id, status: 1 }
                    });
                    if(!packageData){
                        errors.push("Invalid or inactive package selected");
                    }else{
                        advanceAmount = parseFloat(packageData.advance || 0);
                        if(advanceAmount <= 0){
                            errors.push("Package does not require advance payment");
                        }
                        productDescription = `Advance Payment - ${packageData.name} Package`;
                    }
                }
            }
            
            // CUSTOM TRIP - Validate custom parameters
            if(isCustomTrip){
                if(!custom_km){
                    errors.push("Custom kilometers (custom_km) is required for custom trips");
                }else{
                    const parsedKm = parseFloat(custom_km);
                    if(isNaN(parsedKm) || parsedKm <= 0){
                        errors.push("Invalid custom_km value. Must be a positive number");
                    }else if(parsedKm > 1000){
                        errors.push("Custom trip cannot exceed 1000 km");
                    }
                }
                if(!custom_days){
                    errors.push("Number of days (custom_days) is required for custom trips");
                }else{
                    const parsedDays = parseInt(custom_days);
                    if(isNaN(parsedDays) || parsedDays <= 0){
                        errors.push("Invalid custom_days value. Must be a positive integer");
                    }else if(parsedDays > 30){
                        errors.push("Custom trip cannot exceed 30 days");
                    }
                }
                
                if(estimated_total_fare){
                    advanceAmount = parseFloat(estimated_total_fare) * 0.30;
                }else{
                    errors.push("Estimated fare is required for custom trips");
                }
                productDescription = `Custom Reservation - ${custom_km}km for ${custom_days} days`;
            }
            
            // Validate vehicle type
            if(!vehicle_type_id){
                errors.push("Vehicle type is required");
            }
            
            // Validate trip_id
            if(!trip_id || trip_id !== 3){
                errors.push("Invalid trip type. Advance payment is only for reservation trips");
            }
            
            // Validate estimated fare
            if(!estimated_total_fare){
                errors.push("Estimated fare is required");
            }else if(isNaN(estimated_total_fare) || parseFloat(estimated_total_fare) <= 0){
                errors.push("Invalid estimated fare amount");
            }
            
            // Validate dates
            if(!pickup_date || !pickup_time){
                errors.push("Pickup date and time are required");
            }
            
            if(errors.length > 0){
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: errors
                });
            }
            
            // Generate unique transaction ID
            const txnid = `ADV_${uuidv4().replace(/-/g, "_").substring(0, 17)}`;
            const udf1  = user.id.toString();
            const udf2  = package_id ? package_id.toString() : 'custom';
            const udf3  = vehicle_type_id.toString();
            const udf4  = estimated_total_fare.toString();
            const udf5  = pickup_date;
            const udf6  = custom_km ? custom_km.toString() : '';
            const udf7  = custom_days ? custom_days.toString() : '';
            const udf8  = '';
            const udf9  = '';
            const udf10 = '';
            const paymentData = {
                key           : process.env.EASEBUZZ_KEY,
                txnid         : txnid,
                amount        : advanceAmount.toFixed(2),
                productinfo   : productDescription,
                firstname     : user.name.trim(),
                phone         : user.mobile.toString().trim(),
                email         : user.email.trim(),
                surl          : `${process.env.BASE_URL}/payment/success`,
                furl          : `${process.env.BASE_URL}/payment/failure`,
                udf1          : udf1,
                udf2          : udf2,
                udf3          : udf3,
                udf4          : udf4,
                udf5          : udf5,
                udf6          : udf6,
                udf7          : udf7,
                udf8          : udf8,
                udf9          : udf9,
                udf10         : udf10
            };
            
            // CRITICAL FIX: Hash string must exactly match UDF fields sent
            // Format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|...|udf10|salt
            const hashString = `${paymentData.key}|${paymentData.txnid}|${paymentData.amount}|${paymentData.productinfo}|${paymentData.firstname}|${paymentData.email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${udf6}|${udf7}|${udf8}|${udf9}|${udf10}|${process.env.EASEBUZZ_SALT}`;
            
            const hash = crypto.createHash("sha512").update(hashString).digest("hex");
            paymentData.hash = hash;
            
            // Log for debugging (remove in production)
            console.log('Hash String:', hashString);
            console.log('Generated Hash:', hash);
            
            // PROPERLY STRINGIFY LOCATION DATA
            const pickupLocationString = JSON.stringify({
                address       : pickup.address,
                latitude      : pickup.latitude,
                longitude     : pickup.longitude,
                district      : pickup.district,
                state         : pickup.state
            });
            
            const dropLocationString = JSON.stringify({
                address       : drop.address,
                latitude      : drop.latitude,
                longitude     : drop.longitude,
                district      : drop.district,
                state         : drop.state
            });
            
            // Create pending advance payment record
            await ReservationAdvancePayment.create({
                user_id              : user.id,
                transaction_id       : txnid,
                package_id           : isStandardReservation ? package_id : null, 
                vehicle_type_id      : vehicle_type_id,
                trip_id              : trip_id,
                estimated_total_fare : estimated_total_fare,
                advance_amount       : advanceAmount,
                pickup_date          : pickup_date,
                pickup_time          : pickup_time,
                pickup_location      : pickupLocationString,  
                drop_location        : dropLocationString,
                custom_km            : isCustomTrip ? parseFloat(custom_km) : null,     
                custom_days          : isCustomTrip ? parseInt(custom_days) : null,    
                is_custom_trip       : isCustomTrip,                                   
                payment_status       : 'pending',
                status               : 'pending',
                created_at           : new Date(),
                updated_at           : new Date()
            });
            
            // Call Easebuzz API
            const response = await axios.post(
                "https://testpay.easebuzz.in/payment/initiateLink",
                new URLSearchParams(paymentData).toString(),{
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Accept: "application/json",
                    },
                }
            );
            
            if(response.data && response.data.status === 1){
                return res.status(200).json({
                    success         : true,
                    message         : isCustomTrip ? "Custom trip advance payment initiated successfully" : "Advance payment initiated successfully",
                    data            : response.data.data,
                    transaction_id  : txnid,
                    advance_amount  : advanceAmount,
                    trip_type       : isCustomTrip ? 'custom' : 'standard',
                    ...(isCustomTrip && {
                        custom_km   : custom_km,
                        custom_days : custom_days
                    }),
                    ...(isStandardReservation && {
                        package_name: packageData.name
                    }),
                    estimated_total : estimated_total_fare
                });
            }else{
                return res.status(400).json({
                    success: false,
                    message: response.data?.error_desc || "Payment initiation failed",
                    error: response.data
                });
            }
        }catch(error){
            console.error("Failed to initiate advance payment:", error.message);
            if(error.response){
                return res.status(error.response.status).json({
                    success: false,
                    message: error.response.data?.error_desc || "Payment gateway error",
                    error: error.response.data
                });
            }
            return res.status(500).json({
                success: false,
                message: "Something went wrong. Please try again later!",
            });
        }
    },

    // ============================================================
    // INITIATE WALLET TOP-UP PAYMENT
    // ============================================================
    initiateWalletTopup: async (req, res) => {
        try{
            const { amount } = req.body;
            const errors = [];
            // Validate user authentication
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: User not authenticated"
                });
            }
            const userId = req.user.userId;
            // Fetch user details
            const user = await User.findOne({
                where: { id: userId },
                include: [{
                    model: UserRole,
                    required: true
                }]
            });
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
            // Validate amount
            if(!amount && amount !== 0){
                errors.push("Amount is required");
            }else 
            if(!/^[0-9.]*$/.test(amount.toString())){
                errors.push("Amount must contain only numbers and decimal point");
            }else 
            if(isNaN(amount) || parseFloat(amount) <= 0){
                errors.push("Amount must be a positive number");
            }else 
            if(parseFloat(amount) < 10){
                errors.push("Minimum top-up amount is ₹10");
            }else 
            if(parseFloat(amount) > 50000){
                errors.push("Maximum top-up amount is ₹50,000");
            }
            if(errors.length > 0){
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: errors
                });
            }
            // Check or create wallet
            let wallet = await Wallets.findOne({
                where: { user_id: userId }
            });
            if(!wallet){
                wallet = await Wallets.create({
                    user_id          : userId,
                    balance          : 0.00,
                    reserved_balance : 0.00,
                    total_earned     : 0.00,
                    total_spent      : 0.00,
                    currency         : 'INR',
                    status           : 'active',
                    created_at       : new Date(),
                    updated_at       : new Date()
                });
            }
            // Check if wallet is active
            if(wallet.status !== 'active'){
                return res.status(403).json({
                    success: false,
                    message: `Wallet is ${wallet.status}. Please contact support.`
                });
            }
            // Generate unique transaction ID
            const txnid = `TOPUP_${uuidv4().replace(/-/g, "_").substring(0, 15)}`;
            if(!/^[a-zA-Z0-9_\|\-\/]{1,40}$/.test(txnid)){
                return res.status(500).json({
                    success: false,
                    message: "Invalid transaction ID format"
                });
            }
            const topupAmount = parseFloat(amount).toFixed(2);
            const paymentData = {
                key           : process.env.EASEBUZZ_KEY,
                txnid         : txnid,
                amount        : topupAmount,
                productinfo   : "Wallet Top-up",
                firstname     : user.name.trim(),
                phone         : user.mobile.toString().trim(),
                email         : user.email.trim(),
                surl          : `${process.env.BASE_URL}/payment/success`,
                furl          : `${process.env.BASE_URL}/payment/failure`,
                udf1          : userId.toString(),
                udf2          : wallet.id.toString(),
                udf3          : 'wallet_topup',
                udf4          : '',
                udf5          : '',
                udf6          : '',
                udf7          : '',
                udf8          : '',
                udf9          : '',
                udf10         : ''
            };
            // Generate hash
            const hashString  = `${paymentData.key}|${paymentData.txnid}|${paymentData.amount}|${paymentData.productinfo}|${paymentData.firstname}|${paymentData.email}|${paymentData.udf1}|${paymentData.udf2}|${paymentData.udf3}|${paymentData.udf4}|${paymentData.udf5}|${paymentData.udf6}|${paymentData.udf7}|${paymentData.udf8}|${paymentData.udf9}|${paymentData.udf10}|${process.env.EASEBUZZ_SALT}`;
            const hash        = crypto.createHash("sha512").update(hashString).digest("hex");
            paymentData.hash  = hash;
            // Create pending wallet transaction
            await WalletTransactions.create({
                wallet_id           : wallet.id,
                user_id             : userId,
                transaction_id      : txnid,
                reference_type      : 'topup',
                reference_id        : null,
                type                : 'credit',
                amount              : topupAmount,
                balance_before      : wallet.balance,
                balance_after       : wallet.balance,
                description         : `Wallet top-up of ₹${topupAmount}`,
                payment_method      : 'easebuzz',
                payment_gateway     : 'easebuzz',
                gateway_order_id    : txnid,
                status              : 'pending',
                metadata            : JSON.stringify({
                    initiated_at    : new Date(),
                    user_agent      : req.headers['user-agent']
                }),
                created_at          : new Date(),
                updated_at          : new Date()
            });
            // Call Easebuzz API
            const response = await axios.post(
                "https://testpay.easebuzz.in/payment/initiateLink",
                new URLSearchParams(paymentData).toString(), {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Accept: "application/json",
                    },
                }
            );
            if(response.data && response.data.status === 1){
                return res.status(200).json({
                    success         : true,
                    message         : "Wallet top-up initiated successfully",
                    data            : response.data.data,
                    transaction_id  : txnid,
                    amount          : topupAmount,
                    current_balance : parseFloat(wallet.balance)
                });
            }else{
                // Update transaction as failed
                await WalletTransactions.update({
                    status: 'failed',
                    failure_reason: response.data?.error_desc || "Payment initiation failed",
                    failed_at: new Date(),
                    updated_at: new Date()
                }, {
                    where: { transaction_id: txnid }
                });
                return res.status(400).json({
                    success: false,
                    message: response.data?.error_desc || "Payment initiation failed",
                    error: response.data
                });
            }
        }catch(error){
            console.error("Failed to initiate wallet top-up:", error.message);
            if(error.response){
                return res.status(error.response.status).json({
                    success: false,
                    message: error.response.data?.error_desc || "Payment gateway error",
                    error: error.response.data
                });
            }
            return res.status(500).json({
                success: false,
                message: "Something went wrong. Please try again later!",
            });
        }
    },

    // ============================================================
    // TRANSACTION STATUS CHECK
    // ============================================================
    transactionStatus: async (req, res) => {
        try{
            const { key, txnid, hash } = req.body;
            const errors = [];
            if(!key || key.trim() === ""){
                errors.push("Merchant key is required");
            }else if(!/^[a-zA-Z0-9_]{1,15}$/.test(key)){
                errors.push("Invalid merchant key format");
            }
            if(!txnid || txnid.trim() === ""){
                errors.push("Transaction ID is required");
            }else 
            if(!/^[a-zA-Z0-9_\|\-\/]{1,40}$/.test(txnid)){
                errors.push("Invalid transaction ID format");
            }
            if(!hash || hash.trim() === ""){
                errors.push("Hash is required");
            }else if(!/^[a-zA-Z0-9]{64,128}$/.test(hash)){
                errors.push("Invalid hash format");
            }
            if(errors.length > 0){
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: errors
                });
            }
            if(key.trim() !== process.env.EASEBUZZ_KEY){
                return res.status(403).json({
                    success : false,
                    message : "Invalid merchant key"
                });
            }
            const expectedHashString = `${key.trim()}|${txnid.trim()}|${process.env.EASEBUZZ_SALT}`;
            const expectedHash = crypto.createHash("sha512").update(expectedHashString).digest("hex");
            if(hash.trim() !== expectedHash){
                return res.status(403).json({
                    success : false,
                    message : "Invalid hash signature"
                });
            }
            const transactionData = {
                key   : key.trim(),
                txnid : txnid.trim(),
                hash  : hash.trim()
            };
            const response = await axios.post(
                "https://testpay.easebuzz.in/transaction/v2.1/retrieve",
                new URLSearchParams(transactionData).toString(),{
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Accept: "application/json",
                    },
                }
            );
            if(response.data && response.data.status === 1){
                return res.status(200).json({
                    success : true,
                    message : "Transaction status retrieved successfully",
                    data    : response.data.msg
                });
            }else{
                return res.status(400).json({
                    success : false,
                    message : response.data?.error_desc || "Failed to retrieve transaction status",
                    error   : response.data
                });
            }
        }catch(err){
            console.error("Transaction status error:", err);
            if(err.response){
                return res.status(err.response.status).json({
                    success: false,
                    message: err.response.data?.error_desc || "Payment gateway error",
                    error: err.response.data
                });
            }
            return res.status(500).json({
                success: false,
                message: "Something went wrong. Please try again later!",
            });
        }
    },
};

// ============================================================
// RIDE PAYMENT WEBHOOK HANDLER
// ============================================================
async function handleRidePaymentWebhook(webhookData, res) {
    let transaction;
    const startTime = Date.now();
    try{
        const {
            txnid,
            status,
            amount,
            easepayid,
            bank_ref_num,
            udf1, // ride_request_id
            udf2, // payment_type
            error: errorMsg,
            error_Message
        } = webhookData;
        // 1. FIND PAYMENT ORDER
        const order = await RidePaymentOrder.findOne({
            where: { transaction_id: txnid }
        });
        if(!order){
            console.error('❌ Ride payment order not found:', txnid);
            return res.status(404).json({
                success: false,
                message: "Ride payment order not found"
            });
        }
        // 2. CHECK FOR DUPLICATE PROCESSING
        if(order.payment_status === 'success'){
            console.log('⚠️ Payment already processed:', txnid);
            return res.status(200).json({
                success: true,
                message: "Payment already processed",
                data: {
                    transaction_id: txnid,
                    already_processed: true,
                    processed_at: order.paid_at
                }
            });
        }
        // 3. START DATABASE TRANSACTION
        transaction         = await sequelize.transaction();
        const paymentStatus = status.toLowerCase();
        const rideRequestId = udf1 || order.ride_request_id;
        // 4. HANDLE SUCCESS STATUS
        if(paymentStatus === "success"){
            await order.update({
                payment_status: 'success',
                gateway_transaction_id: easepayid || null,
                gateway_payment_id: easepayid || null,
                bank_ref_num: bank_ref_num || null,
                paid_at: new Date(),
                metadata: {
                    ...order.metadata,
                    webhook_status: status,
                    bank_ref_num,
                    easepayid,
                    completed_at: new Date()
                },
                updated_at: new Date()
            }, { transaction });
            // Fetch ride request with lock
            const rideRequest = await RideRequests.findByPk(rideRequestId, {
                transaction,
                lock: true
            });
            if(!rideRequest){
                await transaction.rollback();
                console.error('❌ Ride request not found:', rideRequestId);
                return res.status(404).json({
                    success: false,
                    message: "Ride request not found"
                });
            }
            // Update ride request payment status
            await RideRequests.update({
                payment_status: 'paid',
                payment_method: 'easebuzz',
                updated_at: new Date()
            }, {
                where: { id: rideRequestId },
                transaction
            });
            // 5. HANDLE DRIVER WALLET TRANSACTIONS
            if(rideRequest.driver_id){
                const driverId         = rideRequest.driver_id;
                const finalFare        = parseFloat(rideRequest.final_fare);
                const commissionAmount = parseFloat(rideRequest.commission_amount || 0);
                const driverPayout     = parseFloat(rideRequest.driver_payout || (finalFare - commissionAmount));
                // Get driver wallet
                const driverWallet     = await Wallets.findOne({
                    where: {
                        user_id: driverId,
                        status: 'active'
                    },
                    lock: true,
                    transaction
                });
                if(!driverWallet){
                    console.error(`⚠️ Driver wallet not found for driver ${driverId}`);
                }else{
                    const currentBalance = parseFloat(driverWallet.balance);
                    // Check for existing commission deduction
                    const existingCommissionDeduction = await WalletTransactions.findOne({
                        where: {
                            reference_type: 'driver_commission',
                            reference_id: rideRequestId,
                            type: 'debit',
                            status: 'completed'
                        },
                        transaction
                    });
                    if(existingCommissionDeduction){
                        // SCENARIO 1: Reverse commission deduction
                        console.log("🔄 Reversing commission deduction");
                        const newBalance = currentBalance + commissionAmount;
                        await Wallets.update({
                            balance: parseFloat(newBalance.toFixed(2)),
                            updated_at: new Date()
                        }, {
                            where: { id: driverWallet.id },
                            transaction
                        });
                        // Create commission reversal transaction
                        await WalletTransactions.create({
                            wallet_id: driverWallet.id,
                            user_id: driverId,
                            transaction_id: `COMM_REV_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                            reference_type: 'commission_reversal',
                            reference_id: rideRequestId,
                            type: 'credit',
                            amount: parseFloat(commissionAmount.toFixed(2)),
                            balance_before: currentBalance,
                            balance_after: newBalance,
                            description: `Commission reversal for ride #${rideRequestId} - Customer paid via Easebuzz`,
                            status: 'completed',
                            processed_at: new Date(),
                            metadata: JSON.stringify({
                                ride_request_id: rideRequestId,
                                original_deduction_id: existingCommissionDeduction.id,
                                payment_order_id: order.order_id,
                                gateway_transaction_id: easepayid,
                                payment_method: 'easebuzz',
                                note: 'Commission previously deducted for cash payment now reversed'
                            }),
                            created_at: new Date(),
                            updated_at: new Date()
                        }, { transaction });
                        // Now credit driver payout
                        const newBalanceAfterPayout = newBalance + driverPayout;
                        await Wallets.update({
                            balance: parseFloat(newBalanceAfterPayout.toFixed(2)),
                            total_earned: parseFloat(driverWallet.total_earned || 0) + parseFloat(driverPayout.toFixed(2)),
                            updated_at: new Date()
                        }, {
                            where: { id: driverWallet.id },
                            transaction
                        });
                        await WalletTransactions.create({
                            wallet_id: driverWallet.id,
                            user_id: driverId,
                            transaction_id: `PAYOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                            reference_type: 'driver_payout',
                            reference_id: rideRequestId,
                            type: 'credit',
                            amount: parseFloat(driverPayout.toFixed(2)),
                            balance_before: newBalance,
                            balance_after: newBalanceAfterPayout,
                            description: `Driver payout for ride #${rideRequestId} - Paid by Admin via Easebuzz`,
                            status: 'completed',
                            processed_at: new Date(),
                            metadata: JSON.stringify({
                                ride_request_id: rideRequestId,
                                final_fare: finalFare,
                                commission_amount: commissionAmount,
                                driver_payout: driverPayout,
                                payment_order_id: order.order_id,
                                gateway_transaction_id: easepayid,
                                payment_method: 'easebuzz',
                                note: 'Admin credited driver payout after customer paid via Easebuzz'
                            }),
                            created_at: new Date(),
                            updated_at: new Date()
                        }, { transaction });
                        console.log(`✅ Driver payout of ₹${driverPayout} credited to driver ${driverId}`);
                    }else{
                        // SCENARIO 2: Direct payout (no previous commission deduction)
                        console.log("💵 Processing direct driver payout");
                        const newBalance = currentBalance + driverPayout;
                        await Wallets.update({
                            balance: parseFloat(newBalance.toFixed(2)),
                            total_earned: parseFloat(driverWallet.total_earned || 0) + parseFloat(driverPayout.toFixed(2)),
                            updated_at: new Date()
                        }, {
                            where: { id: driverWallet.id },
                            transaction
                        });
                        await WalletTransactions.create({
                            wallet_id: driverWallet.id,
                            user_id: driverId,
                            transaction_id: `PAYOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                            reference_type: 'driver_payout',
                            reference_id: rideRequestId,
                            type: 'credit',
                            amount: parseFloat(driverPayout.toFixed(2)),
                            balance_before: currentBalance,
                            balance_after: newBalance,
                            description: `Driver payout for ride #${rideRequestId} - Paid by Admin via Easebuzz`,
                            status: 'completed',
                            processed_at: new Date(),
                            metadata: JSON.stringify({
                                ride_request_id: rideRequestId,
                                final_fare: finalFare,
                                commission_amount: commissionAmount,
                                driver_payout: driverPayout,
                                payment_order_id: order.order_id,
                                gateway_transaction_id: easepayid,
                                payment_method: 'easebuzz',
                                note: 'Direct payout after Easebuzz payment'
                            }),
                            created_at: new Date(),
                            updated_at: new Date()
                        }, { transaction });
                    }
                }
            }
            await transaction.commit();
            const processingTime = Date.now() - startTime;
            return res.status(200).json({
                success: true,
                message: "Ride payment successful",
                data: {
                    transaction_id: txnid,
                    order_id: order.order_id,
                    ride_request_id: rideRequestId,
                    amount: parseFloat(order.amount),
                    gateway_transaction_id: easepayid,
                    payment_method_updated: 'easebuzz',
                    driver_payout_credited: true,
                    processing_time_ms: processingTime
                }
            });
        }
        // 6. HANDLE FAILURE STATUS
        else 
        if(paymentStatus === "failure" || paymentStatus === "failed"){
            console.log("❌ Processing failed payment:", txnid);
            await order.update({
                payment_status: 'failed',
                gateway_transaction_id: easepayid || null,
                metadata: {
                    ...order.metadata,
                    webhook_status: status,
                    error_message: error_Message || errorMsg || 'Payment failed',
                    bank_ref_num,
                    failed_at: new Date()
                },
                updated_at: new Date()
            }, { transaction });
            await transaction.commit();
            console.log('❌ Ride payment failed:', txnid);
            return res.status(200).json({
                success: true,
                message: "Payment failed",
                payment_failed: true,
                data: {
                    transaction_id: txnid,
                    failure_reason: error_Message || errorMsg || 'Payment failed'
                }
            });
        }
        // 7. HANDLE OTHER STATUSES
        else{
            console.log(`⏳ Payment status: ${paymentStatus}`);
            await order.update({
                payment_status: paymentStatus === "usercancelled" ? 'cancelled' : 'pending',
                gateway_transaction_id: easepayid || null,
                metadata: {
                    ...order.metadata,
                    webhook_status: status,
                    updated_at: new Date()
                },
                updated_at: new Date()
            }, { transaction });
            await transaction.commit();
            return res.status(200).json({
                success: true,
                message: `Payment ${paymentStatus}`,
                data: { transaction_id: txnid, status: paymentStatus }
            });
        }
    }catch(error){
        if(transaction){
            try{
                await transaction.rollback();
            }catch(rollbackError){
                console.error("❌ Transaction rollback error:", rollbackError);
            }
        }
        console.error("❌ Ride payment webhook error:", {
            error: error.message,
            stack: error.stack,
            txnid: webhookData?.txnid
        });
        return res.status(500).json({
            success: false,
            message: "Webhook processing error",
            error: error.message
        });
    }
}

// ============================================================
// WALLET TOPUP WEBHOOK HANDLER
//============================================================
async function handleWalletTopupWebhook(webhookData, res) {
    let transaction;
    const startTime = Date.now();
    
    try {
        const {
            txnid,
            status,
            amount,
            email,
            easepayid,
            bank_ref_num,
            udf1, // user_id
            udf2, // wallet_id
            error: errorMsg,
            error_Message
        } = webhookData;
        
        console.log("💰 Processing wallet topup webhook:", {
            txnid,
            status,
            amount,
            user_id: udf1
        });
        
        // Find wallet transaction
        const walletTransaction = await WalletTransactions.findOne({
            where: { transaction_id: txnid }
        });
        
        if (!walletTransaction) {
            console.error('❌ Wallet transaction not found:', txnid);
            return res.status(404).json({
                success: false,
                message: "Wallet transaction record not found"
            });
        }
        
        // Check for duplicate processing
        if (walletTransaction.status === 'completed') {
            console.log('⚠️ Transaction already processed:', txnid);
            return res.status(200).json({
                success: true,
                message: "Wallet top-up already processed",
                data: {
                    transaction_id: txnid,
                    already_processed: true,
                    processed_at: walletTransaction.processed_at
                }
            });
        }
        
        // Get wallet
        const wallet = await Wallets.findByPk(walletTransaction.wallet_id);
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });
        }
        
        transaction = await sequelize.transaction();
        
        const paymentStatus = status.toLowerCase();
        const topupAmount = parseFloat(amount);
        
        if (paymentStatus === "success") {
            console.log("✅ Processing successful wallet topup");
            
            const currentBalance = parseFloat(wallet.balance);
            const newBalance = currentBalance + topupAmount;
            
            // Update wallet
            await wallet.update({
                balance: parseFloat(newBalance.toFixed(2)),
                total_earned: parseFloat(wallet.total_earned || 0) + parseFloat(topupAmount.toFixed(2)),
                updated_at: new Date()
            }, { transaction });
            
            // Update transaction
            await walletTransaction.update({
                balance_after: parseFloat(newBalance.toFixed(2)),
                gateway_transaction_id: easepayid || null,
                gateway_payment_id: easepayid || null,
                bank_ref_num: bank_ref_num || null,
                status: 'completed',
                processed_at: new Date(),
                metadata: JSON.stringify({
                    ...JSON.parse(walletTransaction.metadata || '{}'),
                    webhook_status: status,
                    bank_ref_num,
                    easepayid,
                    completed_at: new Date()
                }),
                updated_at: new Date()
            }, { transaction });
            
            await transaction.commit();
            
            const processingTime = Date.now() - startTime;
            console.log(`✅ Wallet topup processed successfully in ${processingTime}ms`);
            
            return res.status(200).json({
                success: true,
                message: "Wallet top-up successful",
                data: {
                    transaction_id: txnid,
                    amount: topupAmount,
                    previous_balance: currentBalance,
                    new_balance: newBalance,
                    gateway_transaction_id: easepayid,
                    processing_time_ms: processingTime
                }
            });
        } else if (paymentStatus === "failure" || paymentStatus === "failed") {
            console.log("❌ Processing failed wallet topup");
            
            await walletTransaction.update({
                status: 'failed',
                failed_at: new Date(),
                failure_reason: error_Message || errorMsg || 'Payment failed',
                gateway_transaction_id: easepayid || null,
                metadata: JSON.stringify({
                    ...JSON.parse(walletTransaction.metadata || '{}'),
                    webhook_status: status,
                    error_message: error_Message || errorMsg,
                    bank_ref_num,
                    failed_at: new Date()
                }),
                updated_at: new Date()
            }, { transaction });
            
            await transaction.commit();
            
            return res.status(200).json({
                success: true,
                message: "Wallet top-up failed",
                payment_failed: true,
                data: {
                    transaction_id: txnid,
                    failure_reason: error_Message || errorMsg || 'Payment failed'
                }
            });
        } else {
            console.log(`⏳ Wallet topup status: ${paymentStatus}`);
            
            await walletTransaction.update({
                status: paymentStatus === "usercancelled" ? 'cancelled' : 'pending',
                gateway_transaction_id: easepayid || null,
                metadata: JSON.stringify({
                    ...JSON.parse(walletTransaction.metadata || '{}'),
                    webhook_status: status,
                    updated_at: new Date()
                }),
                updated_at: new Date()
            }, { transaction });
            
            await transaction.commit();
            
            return res.status(200).json({
                success: true,
                message: `Payment ${paymentStatus}`,
                data: {
                    transaction_id: txnid,
                    status: paymentStatus
                }
            });
        }
        
    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("❌ Transaction rollback error:", rollbackError);
            }
        }
        
        console.error("❌ Wallet topup webhook error:", {
            error: error.message,
            stack: error.stack,
            txnid: webhookData?.txnid
        });
        
        return res.status(500).json({
            success: false,
            message: "Webhook processing error",
            error: error.message
        });
    }
}

// ============================================================
// HELPER: Handle Advance Payment Webhook 
// ============================================================
async function handleAdvancePaymentWebhook(webhookData, res){
    let transaction;
    try{
        const { 
            txnid, status, amount, email, easepayid, 
            bank_ref_num, udf1, udf2, udf3, udf4, udf5, udf6, udf7 
        } = webhookData;
        // Find advance payment record
        const advancePayment = await ReservationAdvancePayment.findOne({
            where: { transaction_id: txnid }
        });
        if(!advancePayment){
            console.error('❌ Advance payment record not found for txnid:', txnid);
            return res.status(404).json({
                success: false,
                message: "Advance payment record not found"
            });
        }
        // Check if already processed
        if(advancePayment.payment_status === 'success'){
            console.log('⚠️ Payment already processed:', txnid);
            return res.status(200).json({
                success: true,
                message: "Advance payment already processed",
                data: {
                    transaction_id: txnid,
                    already_processed: true
                }
            });
        }
        transaction         = await sequelize.transaction();
        const paymentStatus = status.toLowerCase();
        if(paymentStatus === "success"){
            // Update payment record
            await advancePayment.update({
                payment_status         : 'success',
                status                 : 'paid',
                gateway_transaction_id : easepayid || null,
                gateway_payment_id     : easepayid || null,
                bank_ref_num           : bank_ref_num || null,
                paid_at                : new Date(),
                payment_response       : JSON.stringify(webhookData),
                updated_at             : new Date()
            }, { transaction });
            await transaction.commit();
            // ============================================================
            // AUTO-CREATE RIDE REQUEST AFTER SUCCESSFUL PAYMENT
            // ============================================================
            try{
                // Refetch to ensure we have latest data
                const freshPayment = await ReservationAdvancePayment.findByPk(advancePayment.id);
                console.log("pickup date and time issue log");
                console.log(freshPayment);
                // Parse and validate location data
                let pickupData, dropData;
                try{
                    pickupData = typeof freshPayment.pickup_location === 'string' 
                        ? JSON.parse(freshPayment.pickup_location) 
                        : freshPayment.pickup_location;
                    
                    dropData = typeof freshPayment.drop_location === 'string' 
                        ? JSON.parse(freshPayment.drop_location) 
                        : freshPayment.drop_location;
                }catch(parseError){
                    console.error('❌ Error parsing location data:', parseError);
                    throw new Error('Invalid location data format');
                }
                // Validate required location fields
                const requiredPickupFields = ['address', 'latitude', 'longitude', 'state', 'district'];
                const requiredDropFields   = ['address', 'latitude', 'longitude', 'state', 'district'];
                const missingPickupFields  = requiredPickupFields.filter(field => !pickupData?.[field]);
                const missingDropFields    = requiredDropFields.filter(field => !dropData?.[field]);
                if(missingPickupFields.length > 0 || missingDropFields.length > 0){
                    console.error('❌ Missing location fields:', {
                        pickup: missingPickupFields,
                        drop: missingDropFields
                    });
                    throw new Error('Incomplete location data');
                }
                let formattedPickupTime = freshPayment.pickup_time;
                // Try to convert various time formats to HH:MM
                if(formattedPickupTime){
                    try{
                        // If it's already in HH:MM format, validate it
                        if(/^\d{2}:\d{2}$/.test(formattedPickupTime)){
                            // Valid format, use as-is
                            console.log('✅ Time already in HH:MM format:', formattedPickupTime);
                        }
                        // If it includes seconds (HH:MM:SS), extract HH:MM
                        else if(/^\d{2}:\d{2}:\d{2}$/.test(formattedPickupTime)){
                            formattedPickupTime = formattedPickupTime.substring(0, 5);
                            console.log('✅ Converted HH:MM:SS to HH:MM:', formattedPickupTime);
                        }
                        // If it's a full datetime string, parse it
                        else{
                            const timeObj = new Date(formattedPickupTime);
                            if(!isNaN(timeObj.getTime())){
                                const hours = timeObj.getHours().toString().padStart(2, '0');
                                const minutes = timeObj.getMinutes().toString().padStart(2, '0');
                                formattedPickupTime = `${hours}:${minutes}`;
                                console.log('✅ Converted datetime to HH:MM:', formattedPickupTime);
                            }else{
                                throw new Error('Invalid time format');
                            }
                        }
                    }catch(timeError){
                        console.error('❌ Time conversion error:', timeError);
                        throw new Error('Invalid pickup time format in database');
                    }
                }else{
                    throw new Error('Pickup time is missing');
                }
                console.log(freshPayment.pickup_date,formattedPickupTime);
                // Determine trip type
                const isCustomTrip = freshPayment.is_custom_trip || (freshPayment.custom_km && freshPayment.custom_days);
                // Build ride request payload
                const rideRequestBody   = {
                    trip_id             : freshPayment.trip_id,
                    vehicle_type_id     : freshPayment.vehicle_type_id,
                    advance_payment_id  : freshPayment.id,
                    pickup              : {
                        address         : pickupData.address,
                        latitude        : parseFloat(pickupData.latitude),
                        longitude       : parseFloat(pickupData.longitude),
                        district        : pickupData.district,
                        state           : pickupData.state
                    },
                    drop                : {
                        address         : dropData.address,
                        latitude        : parseFloat(dropData.latitude),
                        longitude       : parseFloat(dropData.longitude),
                        district        : dropData.district,
                        state           : dropData.state
                    },
                    pickup_date         : freshPayment.pickup_date,
                    pickup_time         : formattedPickupTime,
                    payment_method      : 'cash',
                    is_scheduled        : false
                };
                // Add package_id OR custom trip parameters
                if(isCustomTrip){
                    rideRequestBody.custom_km = freshPayment.custom_km;
                    rideRequestBody.custom_days = freshPayment.custom_days;
                    console.log('📦 Custom trip request:', {
                        km: freshPayment.custom_km,
                        days: freshPayment.custom_days,
                        pickup_time: formattedPickupTime
                    });
                }else{
                    rideRequestBody.package_id = freshPayment.package_id;
                    console.log('📦 Standard package request:', freshPayment.package_id);
                }
                // Create mock request/response
                const mockReq = {
                    user: {
                        userId: freshPayment.user_id
                    },
                    body: rideRequestBody
                };
                let rideRequestResult  = null;
                let responseStatusCode = null;
                const mockRes = {
                    status: function(code){
                        responseStatusCode = code;
                        return this;
                    },
                    json: function(data){
                        rideRequestResult = data;
                        return this;
                    }
                };
                // Call ride controller
                console.log('🚗 Calling ride controller with:', {
                    user_id: freshPayment.user_id,
                    trip_id: freshPayment.trip_id,
                    vehicle_type_id: freshPayment.vehicle_type_id,
                    is_custom: isCustomTrip
                });
                await rideController.requestRide(mockReq, mockRes);
                // Check if ride request succeeded
                if(responseStatusCode === 200 && rideRequestResult?.success){
                    console.log('✅ Ride request created successfully:', rideRequestResult.ride_request_id);
                    return res.status(200).json({
                        success: true,
                        message: "Advance payment successful and ride request created automatically",
                        data: {
                            transaction_id: txnid,
                            advance_payment_id: freshPayment.id,
                            ride_request_id: rideRequestResult.ride_request_id,
                            payment_summary: rideRequestResult.payment_summary,
                            search_details: rideRequestResult.search_details,
                            auto_created: true,
                            trip_type: isCustomTrip ? 'custom' : 'standard'
                        }
                    });
                }else{
                    // Ride creation failed
                    console.error('❌ Ride request failed:', {
                        statusCode: responseStatusCode,
                        result: rideRequestResult
                    });
                    return res.status(200).json({
                        success: true,
                        message: "Advance payment successful but automatic ride creation failed. Please create ride manually.",
                        data: {
                            transaction_id: txnid,
                            advance_payment_id: freshPayment.id,
                            can_create_ride: true,
                            auto_booking_failed: true,
                            error: rideRequestResult?.message || 'Ride request failed',
                            error_details: rideRequestResult?.errors || null
                        }
                    });
                }
            }catch(autoBookingError){
                console.error('❌ Error in auto-booking after payment:', {
                    error: autoBookingError.message,
                    stack: autoBookingError.stack
                });
                return res.status(200).json({
                    success: true,
                    message: "Advance payment successful but automatic ride creation failed. Please create ride manually.",
                    data: {
                        transaction_id: txnid,
                        advance_payment_id: advancePayment.id,
                        can_create_ride: true,
                        auto_booking_failed: true,
                        error: autoBookingError.message
                    }
                });
            }
        }else 
        if(paymentStatus === "failure" || paymentStatus === "failed"){
            // Payment failed
            await advancePayment.update({
                payment_status         : 'failed',
                status                 : 'failed',
                gateway_transaction_id : easepayid || null,
                failure_reason         : webhookData.error_Message || webhookData.error || 'Payment failed',
                failed_at              : new Date(),
                payment_response       : JSON.stringify(webhookData),
                updated_at             : new Date()
            }, { transaction });
            await transaction.commit();
            console.log('❌ Payment failed for txnid:', txnid);
            return res.status(200).json({
                success: true,
                message: "Advance payment failed",
                payment_failed: true,
                data: {
                    transaction_id: txnid,
                    failure_reason: webhookData.error_Message || webhookData.error || 'Payment failed'
                }
            });
        }else 
        if(paymentStatus === "pending" || paymentStatus === "userCancelled"){
            // Payment pending or cancelled
            await advancePayment.update({
                payment_status         : paymentStatus === "userCancelled" ? 'cancelled' : 'pending',
                status                 : paymentStatus === "userCancelled" ? 'cancelled' : 'pending',
                gateway_transaction_id : easepayid || null,
                payment_response       : JSON.stringify(webhookData),
                updated_at             : new Date()
            }, { transaction });
            await transaction.commit();
            return res.status(200).json({
                success: true,
                message: `Payment ${paymentStatus}`,
                data: {
                    transaction_id: txnid,
                    status: paymentStatus
                }
            });
        }else{
            // Unknown status
            if(transaction) await transaction.rollback();
            console.error('❌ Unknown payment status:', paymentStatus);
            return res.status(400).json({
                success: false,
                message: "Invalid payment status",
                status: paymentStatus
            });
        }
    }catch(error){
        if(transaction) await transaction.rollback();
        console.error("❌ Advance payment webhook error:", {
            error: error.message,
            stack: error.stack,
            txnid: webhookData?.txnid
        });
        return res.status(500).json({
            success: false,
            message: "Webhook processing error",
            error: error.message
        });
    }
}

// ============================================================
// HELPER: Handle Driver Deposit Webhook 
// ============================================================
async function handleDriverDepositWebhook(webhookData, res){
    let transaction;
    try{
        const {
            txnid, status, amount, email, firstname,
            easepayid, bank_ref_num, productinfo
        } = webhookData;
        // Validate required fields
        if(!txnid || !status || !amount || !email){
            return res.status(400).json({
                success: false,
                message: "Missing required webhook data"
            });
        }
        // Get driver role first
        const driverRole = await Role.findOne({
            where: { name: "Driver" }
        });
        if(!driverRole){
            return res.status(500).json({
                success: false,
                message: "Driver role not found in system"
            });
        }
        // Find user with driver role
        const user = await User.findOne({
            where: { email: email.trim() },
            include: [{
                model: UserRole,
                where: { role_id: driverRole.id },
                required: true
            }]
        });
        if(!user){
            return res.status(404).json({
                success: false,
                message: "Driver not found with provided email"
            });
        }
        // Find driver details
        const driverDetails = await DriverDetails.findOne({
            where: { user_id: user.id }
        });
        if(!driverDetails){
            return res.status(404).json({
                success: false,
                message: "Driver details not found"
            });
        }
        // Check if transaction already exists and is completed
        const existingTransaction = await DriverDeposit.findOne({
            where: { transaction_id: txnid }
        });
        if(existingTransaction){
            if(existingTransaction.status === 'completed'){
                return res.status(200).json({
                    success: true,
                    message: "Payment already processed successfully"
                });
            }
        }
        // Start transaction
        transaction = await sequelize.transaction();
        const currentBalance = parseFloat(driverDetails.deposit_balance || 0);
        const depositAmount  = parseFloat(amount);
        const paymentStatus  = status.toLowerCase();
        console.log(paymentStatus);
        // Handle successful payment
        if(paymentStatus === "success"){
            const newBalance = currentBalance + depositAmount;
            // Update driver details
            await driverDetails.update({
                deposit_status: "paid",
                deposit_balance: newBalance,
                updated_at: new Date()
            }, { transaction });
            // Create or update deposit record
            if(existingTransaction){
                await existingTransaction.update({
                    status: 'completed',
                    balance_after: newBalance,
                    gateway_transaction_id: easepayid || existingTransaction.gateway_transaction_id,
                    gateway_payment_id: easepayid || existingTransaction.gateway_payment_id,
                    processed_at: new Date(),
                    updated_at: new Date(),
                    metadata: JSON.stringify({
                        firstname, email,
                        webhook_status: status,
                        bank_ref_num,
                        easepayid,
                        updated_from_webhook: true
                    })
                }, { transaction });
            }else{
                await DriverDeposit.create({
                    driver_id: user.id,
                    transaction_id: txnid,
                    transaction_type: 'deposit_paid',
                    amount: depositAmount,
                    balance_before: currentBalance,
                    balance_after: newBalance,
                    payment_method: 'easebuzz',
                    payment_gateway: 'easebuzz',
                    gateway_transaction_id: easepayid || null,
                    gateway_payment_id: easepayid || null,
                    gateway_order_id: txnid,
                    status: 'completed',
                    description: productinfo || "Security Deposit",
                    metadata: JSON.stringify({
                        firstname, email,
                        webhook_status: status,
                        bank_ref_num,
                        easepayid
                    }),
                    processed_at: new Date(),
                    created_at: new Date(),
                    updated_at: new Date()
                }, { transaction });
            }
            await transaction.commit();
            return res.status(200).json({
                success: true,
                message: "Deposit payment processed successfully",
                data: {
                    transaction_id: txnid,
                    amount: depositAmount,
                    new_balance: newBalance
                }
            });
        }
        // Handle failed payment
        else 
        if(paymentStatus === "failure" || paymentStatus === "failed"){
            // Update driver details to failed status
            await driverDetails.update({
                deposit_status: "failed",
                updated_at: new Date()
            }, { transaction });
            // Create or update deposit record
            if(existingTransaction){
                await existingTransaction.update({
                    status: 'failed',
                    failed_at: new Date(),
                    failure_reason: webhookData.error_Message || webhookData.error || 'Payment failed',
                    updated_at: new Date(),
                    metadata: JSON.stringify({
                        firstname, email,
                        webhook_status: status,
                        error_message: webhookData.error_Message || webhookData.error,
                        bank_ref_num,
                        updated_from_webhook: true
                    })
                }, { transaction });
            }else{
                await DriverDeposit.create({
                    driver_id: user.id,
                    transaction_id: txnid,
                    transaction_type: 'deposit_paid',
                    amount: depositAmount,
                    balance_before: currentBalance,
                    balance_after: currentBalance,
                    payment_method: 'easebuzz',
                    payment_gateway: 'easebuzz',
                    gateway_transaction_id: easepayid || null,
                    status: 'failed',
                    description: `${productinfo || 'Security Deposit'} - Payment Failed`,
                    metadata: JSON.stringify({
                        firstname, email,
                        webhook_status: status,
                        error_message: webhookData.error_Message || webhookData.error,
                        bank_ref_num
                    }),
                    failed_at: new Date(),
                    failure_reason: webhookData.error_Message || webhookData.error || 'Payment failed',
                    created_at: new Date(),
                    updated_at: new Date()
                }, { transaction });
            }
            await transaction.commit();
            return res.status(200).json({
                success: true,
                message: "Payment failure recorded",
                data: {
                    transaction_id: txnid,
                    status: 'failed'
                }
            });
        }
        // Handle pending/other statuses
        else 
        if(paymentStatus === "pending" || paymentStatus === "userCancelled"){
            if(transaction) await transaction.rollback();
            return res.status(200).json({
                success: true,
                message: `Payment status: ${paymentStatus}`,
                data: {
                    transaction_id: txnid,
                    status: paymentStatus
                }
            });
        }
        // Handle unknown status
        else{
            if(transaction) await transaction.rollback();
            return res.status(200).json({
                success: false,
                message: "Unknown payment status received",
                data: {
                    transaction_id: txnid,
                    status: status
                }
            });
        }
    }catch(error){
        // Rollback transaction if it exists
        if(transaction){
            try{
                await transaction.rollback();
            }catch(rollbackError){
                console.error("❌ Transaction rollback error:", rollbackError);
            }
        }
        console.error("❌ Driver deposit webhook error:", error);
        // Handle specific database errors
        if(error.name === 'SequelizeUniqueConstraintError'){
            return res.status(200).json({
                success: true,
                message: "Transaction already processed (duplicate detected)"
            });
        }
        if(error.name === 'SequelizeForeignKeyConstraintError'){
            return res.status(200).json({
                success: false,
                message: "Invalid driver reference"
            });
        }
        // Return 200 to acknowledge webhook receipt (prevents retries)
        // But indicate processing failure in the response
        return res.status(200).json({
            success: false,
            message: "Webhook processing error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// ============================================================
// HELPER: Verify Bank Account Internally
// ============================================================
const verifyBankAccountInternal = async (params) => {
    try{
        const { account_number, account_ifsc } = params;
        // Validate environment variables
        if(!process.env.EASEBUZZ_KEY || !process.env.EASEBUZZ_SALT){
            throw new Error("Payment gateway configuration error");
        }
        // Generate unique request number
        const requestNumber    = `BANK_${uuidv4().replace(/-/g, "").substring(0, 20).toUpperCase()}`;
        const verificationData = {
            key                     : process.env.EASEBUZZ_KEY,
            account_number          : account_number.toString().trim(),
            account_ifsc            : account_ifsc.trim().toUpperCase(),
            verification_type       : "pennyless",
            unique_request_number   : requestNumber,
            consent                 : true
        };
        console.log(verificationData);
        // Generate authorization hash
        const authHashString = `${process.env.EASEBUZZ_KEY}|${verificationData.account_number}|${process.env.EASEBUZZ_SALT}`;
        const authHash       = crypto.createHash("sha512").update(authHashString).digest("hex");
        const response       = await axios.post(
            "https://api.easebuzz.in/verify/v1/bank_account/",
            verificationData,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": authHash,
                    "Accept": "application/json"
                },
                timeout: 60000
            }
        );
        if(response.data){
            const responseData = response.data;
            console.log("Bank verification response:");
            console.log(responseData);
            if(responseData.success === true && responseData.data && (responseData.data.status === "success" || responseData.data.status === 1 || responseData.data.status === "1")){
                const bankName            = responseData.data?.account_holder_name || responseData.data?.name_at_bank || null;
                const nameMatchPercentage = responseData.data?.name_match_percentage || responseData.data?.fuzzy_score || null;
                const nameMatchStatus     = responseData.data?.name_match_status || null;
                const isNameMatchGood     = nameMatchPercentage >= 70 || nameMatchStatus === 'MATCH';
                return{
                    success                     : true,
                    verified                    : true,
                    message                     : "Bank account verified successfully",
                    data                        : {
                        request_number          : requestNumber,
                        account_number_masked   : account_number.toString().slice(-4).padStart(account_number.toString().length, '*'),
                        account_ifsc            : account_ifsc.trim().toUpperCase(),
                        account_holder_name     : bankName,
                        bank_name               : responseData.data?.bank_name || null,
                        branch_name             : responseData.data?.branch_name || null,
                        verification_type_used  : responseData.data?.verification_type || "pennyless",
                        amount_deposited        : responseData.data?.amount_deposited || null,
                        name_match              : {
                            percentage          : nameMatchPercentage,
                            status              : nameMatchStatus,
                            is_acceptable       : isNameMatchGood,
                            expected_name       : account_holder_name.trim(),
                            bank_registered_name: bankName,
                            message             : isNameMatchGood 
                                ? "✅ Name matches with bank records" 
                                : "⚠️ Name doesn't match closely. Please verify account details."
                        },
                        transaction_id          : responseData.data?.transaction_id || null,
                        verified_at             : new Date(),
                        can_save_to_db          : isNameMatchGood,
                        raw_response            : responseData.data
                    }
                };
            }else{
                const failureReason = getFailureReasonMessage(responseData.data?.easebuzz_response_code);
                return {
                    success                         : false,
                    verified                        : false,
                    message                         : failureReason || responseData.message || "Bank account verification failed",
                    data                            : {
                        request_number              : requestNumber,
                        account_number_masked       : account_number.toString().slice(-4).padStart(account_number.toString().length, '*'),
                        account_ifsc                : account_ifsc.trim().toUpperCase(),
                        error_code                  : responseData.data?.easebuzz_response_code || responseData.error_code || 'UNKNOWN',
                        failure_reason              : failureReason,
                        verification_type_attempted : "pennyless",
                        user_message                : getUserFriendlyErrorMessage(responseData.data?.easebuzz_response_code),
                        raw_response                : responseData.data || responseData
                    }
                };
            }
        }
        throw new Error("Invalid response from verification service");
    }catch(error){
        console.error("❌ Bank verification error:", error.message);
        if(error.response){
            const errorData     = error.response.data;
            const failureReason = getFailureReasonMessage(errorData?.easebuzz_response_code);
            return{
                success             : false,
                verified            : false,
                message             : failureReason || errorData?.message || "Verification service error",
                data                : {
                    error_code      : errorData?.easebuzz_response_code || errorData?.error_code || 'UNKNOWN',
                    failure_reason  : failureReason,
                    user_message    : getUserFriendlyErrorMessage(errorData?.easebuzz_response_code),
                    raw_error       : errorData
                }
            };
        }
        if(error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'){
            return{
                success             : false,
                verified            : false,
                message             : "Verification request timed out. Please try again.",
                data                : {
                    error_code      : 'FAILURE_UPSTREAM_TIMEOUT',
                    user_message    : 'The verification took too long. Please try again in a few moments.'
                }
            };
        }
        throw error;
    }
};

// ============================================================
// HELPER: User-Friendly Error Messages
// ============================================================
function getUserFriendlyErrorMessage(code){
    const messages                             = {
        'FAILURE_INVALID_IFSC'                 : 'The IFSC code you entered is invalid. Please check and try again.',
        'FAILURE_INVALID_ACC_NO'               : 'The account number you entered is invalid. Please verify and try again.',
        'FAILURE_FROZEN_ACCOUNT'               : 'This account is frozen by the bank. Please contact your bank.',
        'FAILURE_DORMANT_ACCOUNT'              : 'This account is inactive. Please activate it with your bank first.',
        'FAILURE_CLOSED_ACCOUNT'               : 'This account has been closed. Please use an active account.',
        'FAILURE_INVALID_ACC_OR_IFSC'          : 'The account number or IFSC code is incorrect. Please double-check your details.',
        'FAILURE_BLOCKED_OR_FROZEN_ACCOUNT'    : 'This account is blocked or frozen. Please contact your bank.',
        'FAILURE_IMPS_NOT_ENABLED'             : 'IMPS is not enabled for this account. Please enable it through your bank.',
        'FAILURE_UPSTREAM_DOWN'                : 'Bank services are temporarily unavailable. Please try again later.',
        'FAILURE_BENE_BANK_OFFLINE'            : 'Your bank is currently offline. Please try again later.',
        'FAILURE_UPSTREAM_TIMEOUT'             : 'Verification is taking longer than usual. Please try again.',
        'FAILURE_TECHNICAL_ERROR'              : 'A technical error occurred. Please try again.',
        'FAILURE_UNKNOWN_ERROR'                : 'An unexpected error occurred. Please try again or contact support.'
    };
    return messages[code] || 'Unable to verify account. Please check your details and try again.';
}

// ============================================================
// HELPER: Get Human-Readable Failure Reason
// ============================================================
function getFailureReasonMessage(code){
    const failureReasons                       = {
        'FAILURE_INVALID_IFSC'                 : 'Invalid IFSC code provided',
        'FAILURE_INVALID_ACC_NO'               : 'Invalid account number',
        'FAILURE_FROZEN_ACCOUNT'               : 'Account is frozen by the bank',
        'FAILURE_DORMANT_ACCOUNT'              : 'Account is dormant/inactive',
        'FAILURE_TECHNICAL_ERROR'              : 'Technical error occurred during verification',
        'FAILURE_UNKNOWN_ERROR'                : 'Unknown error occurred',
        'FAILURE_BENE_AMOUNT_LIMIT_EXCEEDED'   : 'Beneficiary amount limit exceeded',
        'FAILURE_UPSTREAM_DOWN'                : 'Bank service is currently unavailable',
        'FAILURE_BENE_BANK_OFFLINE'            : 'Beneficiary bank is offline',
        'FAILURE_INVALID_ACC_OR_IFSC'          : 'Invalid account number or IFSC code',
        'FAILURE_CLOSED_ACCOUNT'               : 'Account has been closed',
        'FAILURE_IMPS_NOT_ENABLED'             : 'IMPS not enabled for this account',
        'FAILURE_BENE_RISK_THRESHOLD_EXCEEDED' : 'Beneficiary risk threshold exceeded',
        'FAILURE_NRE_ACCOUNT'                  : 'NRE accounts cannot be verified',
        'FAILURE_SUSPECTED_FRAUD'              : 'Transaction flagged as suspected fraud',
        'FAILURE_BLOCKED_OR_FROZEN_ACCOUNT'    : 'Account is blocked or frozen',
        'FAILURE_MEMO_ON_ACCOUNT'              : 'Account has a memo/restriction',
        'FAILURE_UPSTREAM_TIMEOUT'             : 'Bank service timeout'
    };
    return failureReasons[code] || null;
}
module.exports = { ...easebuzzController, verifyBankAccountInternal };