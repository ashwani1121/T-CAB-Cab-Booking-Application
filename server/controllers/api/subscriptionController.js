const { Op, fn, col }           = require('sequelize');
const { sequelize }             = require('../../config/db');
const Settings                  = require('../../models/settingsModel');
const Subscription              = require('../../models/subscriptionsModel');
const Vehicletypes              = require('../../models/vehicleTypesModel');
const DriverSubscriptions       = require('../../models/driverSubscriptionsModel');
const SubscriptionUsageHistory  = require('../../models/subscriptionUsageHistoryModel');
const BASE_URL                  = process.env.BASE_URL || 'http://localhost:5000';

// Format subscription data for API response
const formatSubscriptionData = async (subscription, currentDate, usageStats, totalCommissionSaved, type, queuePosition = null) => {
    const plan   = subscription.plan;
    let timeInfo = {};
    if(plan.duration_type === 'days'){
        const startDate     = new Date(subscription.start_date);
        const endDate       = new Date(subscription.end_date);
        const totalDays     = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysElapsed   = Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)));
        timeInfo = {
            duration_type: 'days',
            total_days: totalDays,
            days_elapsed: Math.max(0, daysElapsed),
            days_remaining: daysRemaining,
            start_date: subscription.start_date,
            end_date: subscription.end_date,
            progress_percentage: totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : 0
        };
    }else{
        // Ride-based subscription
        timeInfo = {
            duration_type: 'rides',
            total_rides: subscription.total_rides,
            rides_used: subscription.rides_used,
            rides_remaining: subscription.rides_remaining,
            progress_percentage: subscription.total_rides > 0 
                ? Math.min(100, Math.round((subscription.rides_used / subscription.total_rides) * 100)) 
                : 0
        };
    }
    // Format response
    const formattedData = {
        subscription_id: subscription.id,
        subscription_number: subscription.subscription_number,
        plan_details: {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: parseFloat(plan.price),
            duration_type: plan.duration_type,
            duration_value: plan.duration_value,
            commission_waiver: plan.commission_waiver === 1,
            max_daily_rides: plan.max_daily_rides,
            features: plan.features ? JSON.parse(plan.features) : []
        },
        time_info: timeInfo,
        payment_details: {
            amount_paid: parseFloat(subscription.amount_paid),
            payment_method: subscription.payment_method,
            payment_status: subscription.payment_status,
            transaction_id: subscription.transaction_id
        },
        status: subscription.status,
        type: type,
        purchased_at: subscription.created_at
    };
    // Add usage stats for active subscriptions
    if(type === 'active' && usageStats){
        formattedData.usage_statistics = {
            ...usageStats,
            average_saving_per_ride: usageStats.total_rides_with_subscription > 0 
                ? parseFloat((totalCommissionSaved / usageStats.total_rides_with_subscription).toFixed(2))
                : 0
        };
        formattedData.savings_info = {
            total_saved: totalCommissionSaved,
            estimated_remaining_savings: parseFloat(estimateRemainingSavings(subscription, plan, usageStats))
        };
    }
    // Add queue position for upcoming subscriptions
    if(type === 'upcoming' && queuePosition){
        formattedData.queue_position = queuePosition;
        formattedData.estimated_activation = subscription.start_date || 'When current subscription ends';
    }
    return formattedData;
};

// Estimate remaining savings for a subscription
const estimateRemainingSavings = (subscription, plan, usageStats) => {
    if(!usageStats || usageStats.total_rides_with_subscription === 0){
        return '0.00';
    }
    const avgSavingPerRide = usageStats.total_commission_saved / usageStats.total_rides_with_subscription;
    if(plan.duration_type === 'days'){
        // Estimate based on average rides per day
        const daysElapsed    = Math.ceil((new Date() - new Date(subscription.start_date)) / (1000 * 60 * 60 * 24));
        const avgRidesPerDay = daysElapsed > 0 ? usageStats.total_rides_with_subscription / daysElapsed : 0;
        const daysRemaining  = Math.max(0, Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)));
        return (avgRidesPerDay * daysRemaining * avgSavingPerRide).toFixed(2);
    }else{
        // Ride-based subscription
        return (subscription.rides_remaining * avgSavingPerRide).toFixed(2);
    }
};

// Generate management tips based on subscription status and usage
const generateManagementTips = (activeSubscription, upcomingSubscriptions, usageStats) => {
    const tips = [];
    // Active subscription tips
    if(activeSubscription){
        const plan = activeSubscription.plan;
        if(plan.duration_type === 'days'){
            const daysRemaining = Math.max(0, Math.ceil((new Date(activeSubscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)));
            if(daysRemaining <= 3){
                tips.push({
                    type: 'warning',
                    category: 'expiry',
                    message: `Your subscription expires in ${daysRemaining} day(s). Consider renewing to continue enjoying zero commission.`,
                    action: 'renew',
                    priority: 'high'
                });
            }else 
            if(daysRemaining <= 7){
                tips.push({
                    type: 'info',
                    category: 'expiry',
                    message: `Your subscription expires in ${daysRemaining} days. Plan your renewal in advance.`,
                    action: 'plan_renewal',
                    priority: 'medium'
                });
            }
        }else{
            // Ride-based subscription
            if(activeSubscription.rides_remaining <= 5){
                tips.push({
                    type: 'warning',
                    category: 'rides',
                    message: `Only ${activeSubscription.rides_remaining} ride(s) remaining on your subscription. Consider purchasing a new plan.`,
                    action: 'renew',
                    priority: 'high'
                });
            }else 
            if(activeSubscription.rides_remaining <= 10){
                tips.push({
                    type: 'info',
                    category: 'rides',
                    message: `${activeSubscription.rides_remaining} rides remaining. You might want to plan your next subscription.`,
                    action: 'plan_renewal',
                    priority: 'medium'
                });
            }
        }
        // Usage optimization tips
        if(usageStats && usageStats.total_rides_with_subscription > 0){
            const avgSaving = usageStats.total_commission_saved / usageStats.total_rides_with_subscription;
            tips.push({
                type: 'success',
                category: 'savings',
                message: `Great! You're saving an average of ₹${avgSaving.toFixed(2)} per ride with your subscription.`,
                action: null,
                priority: 'low'
            });
            if(plan.max_daily_rides){
                const daysElapsed    = Math.ceil((new Date() - new Date(activeSubscription.start_date)) / (1000 * 60 * 60 * 24));
                const avgRidesPerDay = daysElapsed > 0 ? usageStats.total_rides_with_subscription / daysElapsed : 0;
                if(avgRidesPerDay < plan.max_daily_rides * 0.5){
                    tips.push({
                        type: 'info',
                        category: 'optimization',
                        message: `You're using ${avgRidesPerDay.toFixed(1)} rides/day on average. Your plan allows up to ${plan.max_daily_rides} rides/day. Maximize your subscription benefits!`,
                        action: 'optimize_usage',
                        priority: 'low'
                    });
                }
            }
        }
    }else{
        // No active subscription
        tips.push({
            type: 'info',
            category: 'subscribe',
            message: 'Subscribe now to enjoy zero commission on all your rides and maximize your earnings!',
            action: 'subscribe',
            priority: 'high'
        });
    }
    // Upcoming subscriptions tips
    if(upcomingSubscriptions.length > 2){
        tips.push({
            type: 'info',
            category: 'queue',
            message: `You have ${upcomingSubscriptions.length} subscriptions queued. They will activate automatically in sequence.`,
            action: null,
            priority: 'low'
        });
    }
    return tips;
};

const subscriptionController = {

    // ========================================================================
    // GET DRIVER SUBSCRIPTIONS (ACTIVE + UPCOMING)
    // ========================================================================
    getDriverActiveSubscription: async (req, res) => {
        try{
            const driver_id   = req.user.userId;
            const transaction = await sequelize.transaction();
            try{
                const currentDate = new Date();
                // FIND ACTIVE SUBSCRIPTION (only one can be active at a time)
                const activeSubscription = await DriverSubscriptions.findOne({
                    where: {
                        driver_id: driver_id,
                        status: 'active',
                        payment_status: 'completed',
                        start_date: {
                            [Op.lte]: currentDate
                        },
                        [Op.or]: [
                            {
                                // For duration-based subscriptions (days)
                                end_date: {
                                    [Op.gte]: currentDate
                                }
                            },
                            {
                                // For ride-based subscriptions
                                rides_remaining: {
                                    [Op.gt]: 0
                                }
                            }
                        ]
                    },
                    include: [{
                        model: Subscription,
                        as: 'plan',
                        where: {
                            status: 'active'
                        },
                        required: true
                    }],
                    order: [['start_date', 'DESC']], // Latest first
                    transaction
                });
                // FIND UPCOMING SUBSCRIPTIONS (paid but not yet started)
                const upcomingSubscriptions = await DriverSubscriptions.findAll({
                    where: {
                        driver_id: driver_id,
                        payment_status: 'completed',
                        [Op.or]: [
                            {
                                status: 'active',
                                start_date: {
                                    [Op.gt]: currentDate // Future start date
                                }
                            },
                            {
                                status: 'pending' // Queued for activation
                            }
                        ]
                    },
                    include: [{
                        model: Subscription,
                        as: 'plan',
                        where: {
                            status: 'active'
                        },
                        required: true
                    }],
                    order: [['start_date', 'ASC']], // Earliest first
                    transaction
                });
                // GET USAGE STATISTICS FOR ACTIVE SUBSCRIPTION
                let usageStats = null;
                let totalCommissionSaved = 0;
                if(activeSubscription){
                    const usageHistory = await SubscriptionUsageHistory.findAll({
                        where: {
                            subscription_id: activeSubscription.id
                        },
                        attributes: [
                            [fn('COUNT', col('id')), 'total_rides'],
                            [fn('SUM', col('commission_saved')), 'total_commission_saved'],
                            [fn('SUM', col('ride_fare')), 'total_ride_fare']
                        ],
                        raw: true,
                        transaction
                    });
                    if(usageHistory && usageHistory.length > 0){
                        usageStats = {
                            total_rides_with_subscription: parseInt(usageHistory[0].total_rides) || 0,
                            total_commission_saved: parseFloat(usageHistory[0].total_commission_saved) || 0,
                            total_ride_fare: parseFloat(usageHistory[0].total_ride_fare) || 0
                        };
                        totalCommissionSaved = usageStats.total_commission_saved;
                    }
                }
                await transaction.commit();
                const responseData = {
                    has_active_subscription: !!activeSubscription,
                    has_upcoming_subscriptions: upcomingSubscriptions.length > 0,
                    total_subscriptions: (activeSubscription ? 1 : 0) + upcomingSubscriptions.length,
                    active_subscription: null,
                    upcoming_subscriptions: [],
                    queue_info: null
                };
                // NO SUBSCRIPTIONS AT ALL
                if(!activeSubscription && upcomingSubscriptions.length === 0){
                    responseData.message        = 'No active or upcoming subscriptions found';
                    responseData.recommendation = 'Subscribe now to enjoy zero commission on all rides!';
                    return res.status(200).json({
                        success: true,
                        message: 'No subscriptions found',
                        data: responseData
                    });
                }
                // PROCESS ACTIVE SUBSCRIPTION
                if(activeSubscription){
                    responseData.active_subscription = await formatSubscriptionData(
                        activeSubscription,
                        currentDate,
                        usageStats,
                        totalCommissionSaved,
                        'active'
                    );
                }
                // PROCESS UPCOMING SUBSCRIPTIONS
                if(upcomingSubscriptions.length > 0){
                    responseData.upcoming_subscriptions = await Promise.all(
                        upcomingSubscriptions.map((sub, index) => 
                            formatSubscriptionData(
                                sub,
                                currentDate,
                                null,
                                0,
                                'upcoming',
                                index + 1 // Queue position
                            )
                        )
                    );
                    // Queue information
                    responseData.queue_info = {
                        total_queued: upcomingSubscriptions.length,
                        next_activation_date: upcomingSubscriptions[0].start_date || 
                            (activeSubscription ? activeSubscription.end_date : null),
                        message: activeSubscription 
                            ? `You have ${upcomingSubscriptions.length} subscription(s) queued. They will activate automatically when your current subscription ends.`
                            : `You have ${upcomingSubscriptions.length} subscription(s) ready to activate.`
                    };
                }
                // SUBSCRIPTION MANAGEMENT TIPS
                responseData.management_tips = generateManagementTips(
                    activeSubscription,
                    upcomingSubscriptions,
                    usageStats
                );
                return res.status(200).json({
                    success: true,
                    message: 'Subscription details retrieved successfully',
                    data: responseData
                });
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                throw error;
            }
        }catch(error){
            console.error('❌ Get Driver Subscription error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve subscription details. Please try again.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // ========================================================================
    // GET ACTIVE PLANS
    // ========================================================================
    getActivePlans: async (req, res) => {
        try{
            const masterSettings = await Settings.findOne({
                where: { role: 'admin' },
                attributes: ['subscription_activate', 'commission_type']
            });
            // If no settings found or subscription is not activated
            if(!masterSettings || masterSettings.subscription_activate !== 'yes'){
                return res.status(403).json({
                    success: false,
                    message: 'Subscription plans are not active. Please contact administrator.',
                    subscription_active: false
                });
            }
            const commissionType = masterSettings.commission_type || 'percentage';
            // Get all active vehicle types with their commissions
            const vehicleTypes = await Vehicletypes.findAll({
                where: { status: 1 },
                attributes: ['id', 'name', 'commission', 'image'],
                order: [['name', 'ASC']]
            });
            const formattedData = vehicleTypes.map(vt => ({
                vehicle_type_id: vt.id,
                vehicle_type_name: vt.name,
                vehicle_image: vt.image ? `${BASE_URL}/uploads/vehicle-types/${vt.image}` : null,
                commission_value: parseFloat(vt.commission || 0),
                commission_type: commissionType,
                commission_display: commissionType === 'percentage' 
                    ? `${parseFloat(vt.commission || 0).toFixed(2)}%` 
                    : `₹${parseFloat(vt.commission || 0).toFixed(2)}`
            }));
            const {
                page  = 1,
                limit = 10,
            } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            const where = { status: 'active' };
            const { rows, count } = await Subscription.findAndCountAll({
                where,
                order: [
                    ['is_popular', 'DESC'],
                    ['sort_order', 'ASC'],
                    ['price', 'ASC']
                ],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true,
                attributes: [
                    'id', 'name', 'description', 'price', 
                    'duration_type', 'duration_value', 'commission_waiver',
                    'max_daily_rides', 'features', 'is_popular'
                ]
            });
            res.status(200).json({
                success: true,
                data: rows,
                total: count,
                page: pageNum,
                limit: limitNum,
                subscription_active: true,
                vehicleTypes: formattedData
            });
        }catch(err){
            console.error('getActivePlans error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch active subscription plans',
            });
        }
    },

    // GET SINGLE SUBSCRIPTION PLAN BY ID
    getPlanById: async (req, res) => {
        try{
            const { id } = req.params;
            const plan   = await Subscription.findByPk(id);
            if(!plan){
                return res.status(404).json({
                    success: false,
                    message: 'Subscription plan not found',
                });
            }
            res.status(200).json({
                success: true,
                data: plan,
            });
        }catch(err){
            console.error('getPlanById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch subscription plan',
            });
        }
    },

    // GET ALL DRIVER SUBSCRIPTIONS (HISTORY)
    getDriverSubscriptionHistory: async (req, res) => {
        try{
            const driver_id = req.user.userId;
            const { page      = 1, limit = 10, status = null } = req.query;
            const offset      = (parseInt(page) - 1) * parseInt(limit);
            const transaction = await sequelize.transaction();
            try{
                const whereClause = {
                    driver_id: driver_id,
                    payment_status: 'completed'
                };
                if(status && ['active', 'expired', 'cancelled', 'suspended'].includes(status)){
                    whereClause.status = status;
                }
                // Get subscriptions with pagination
                const { count, rows: subscriptions } = await DriverSubscriptions.findAndCountAll({
                    where: whereClause,
                    include: [{
                        model: Subscription,
                        as: 'plan',
                        attributes: ['id', 'name', 'description', 'price', 'duration_type', 'duration_value', 'commission_waiver']
                    }],
                    order: [['created_at', 'DESC']],
                    limit: parseInt(limit),
                    offset: offset,
                    transaction
                });
                // Process each subscription
                const subscriptionHistory = await Promise.all(subscriptions.map(async (sub) => {
                    const usageStats = await SubscriptionUsageHistory.findAll({
                        where: { subscription_id: sub.id },
                        attributes: [
                            [sequelize.fn('COUNT', sequelize.col('id')), 'total_rides'],
                            [sequelize.fn('SUM', sequelize.col('commission_saved')), 'total_saved']
                        ],
                        raw: true,
                        transaction
                    });
                    const stats = usageStats && usageStats.length > 0 ? {
                        rides_completed: parseInt(usageStats[0].total_rides) || 0,
                        commission_saved: parseFloat(usageStats[0].total_saved) || 0
                    } : {
                        rides_completed: 0,
                        commission_saved: 0
                    };
                    let periodInfo = {};
                    if(sub.plan.duration_type === 'days'){
                        periodInfo = {
                            type: 'days',
                            start_date: sub.start_date,
                            end_date: sub.end_date,
                            duration_days: sub.plan.duration_value
                        };
                    }else{
                        periodInfo = {
                            type: 'rides',
                            total_rides: sub.total_rides,
                            rides_used: sub.rides_used,
                            rides_remaining: sub.rides_remaining
                        };
                    }
                    return {
                        subscription_id: sub.id,
                        subscription_number: sub.subscription_number,
                        plan_name: sub.plan.name,
                        plan_price: parseFloat(sub.plan.price),
                        amount_paid: parseFloat(sub.amount_paid),
                        status: sub.status,
                        period: periodInfo,
                        usage: stats,
                        payment_method: sub.payment_method,
                        purchased_at: sub.created_at,
                        cancelled_at: sub.cancelled_at,
                        cancellation_reason: sub.cancellation_reason
                    };
                }));
                await transaction.commit();
                return res.status(200).json({
                    success: true,
                    message: 'Subscription history retrieved successfully',
                    data: {
                        subscriptions: subscriptionHistory,
                        pagination: {
                            total: count,
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total_pages: Math.ceil(count / parseInt(limit))
                        }
                    }
                });
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                throw error;
            }
        }catch(error){
            console.error('❌ Get Subscription History error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve subscription history. Please try again.'
            });
        }
    }
};

module.exports = subscriptionController;