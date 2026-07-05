const { sequelize, Sequelize, User, Role, UserRole, RideRequests, Settings } = require('../models');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const bcrypt           = require('bcryptjs');
const { v4: uuidv4 }   = require('uuid');
const apiController    = require('./api/apiController');
const BASE_URL         = process.env.BASE_URL || 'http://localhost:5000';
const adminController  = {

    // Login
    loginUser: async (req, res) => {
        let transaction;
        try{
            transaction = await sequelize.transaction();
            const { email, mobile, password, rememberMe, fcm_token } = req.body;
            const user = await User.findOne({
                where: {
                    [email ? 'email' : 'mobile']: email || mobile,
                },
                include: [
                    {
                        model      : UserRole,
                        attributes : ['role_id'],
                        include    : [
                            {
                                model      : Role,
                                attributes : ['name'],
                                where      : { 
                                    name   : { 
                                        [Op.notIn]: ['User', 'Driver'] 
                                    } 
                                }
                            }
                        ]
                    }
                ]
            });
            if(!user){
                await transaction.rollback();
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email/mobile or password',
                });
            }
            // Verify password (assuming passwords are hashed)
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if(!isPasswordValid){
                await transaction.rollback();
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email/mobile or password',
                });
            }
            // Check user status
            if(user.status !== 1){
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Account is inactive',
                });
            }
            const updateData = { updated_at: new Date() };
            // Handle rememberMe
            let rememberToken = null;
            if(rememberMe){
                rememberToken = uuidv4();
                updateData.remember_token = rememberToken;
            }else{
                updateData.remember_token = null;
            }
            // Update FCM token if provided
            if(fcm_token) updateData.fcm_token = fcm_token;
            await user.update(updateData, { transaction });
            const payload = {
                userId  : user.id,
                email   : user.email,
                mobile  : user.mobile,
                role    : user.UserRoles[0].Role.name.toLowerCase(), 
            };
            const accessToken   = apiController.generateAccessToken(payload);
            const refreshToken  = apiController.generateRefreshToken();
            await apiController.storeRefreshToken(user.id, refreshToken, transaction);
            // Fetch admin settings
            const adminSettings = await Settings.findOne({ where: { role: 'admin' } });
            const settingsData  = adminSettings ? {
                companyName: adminSettings.company_name,
                companyLogo: adminSettings.logo ? `${BASE_URL}/uploads/settings/${adminSettings.logo}` : null
            } : {
                companyName: null,
                companyLogo: null
            };
            await transaction.commit();
            res.json({
                success            : true,
                message            : 'Login successful',
                accessToken,       
                refreshToken,
                user               : {
                    id             : user.id,
                    name           : user.name,
                    email          : user.email,
                    mobile         : user.mobile,
                    profile        : user.profile ? `${BASE_URL}/uploads/profile/${user.profile}` : null,
                    role_id        : user.UserRoles[0].role_id,
                    role_name      : user.UserRoles[0].Role.name,
                    remember_token : rememberToken,
                },
                settings: settingsData
            });
        }catch(err){
            if(transaction) await transaction.rollback();
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: err.message
            });
        }
    },

    // Logout
    logoutUser: async (req, res) => {
        try{
            const { user_id } = req.body;
            // Clear FCM token from user record
            if(user_id){
                try{
                    const user = await User.findByPk(user_id);
                    if(user){
                        await user.update({ 
                            fcm_token: null,
                            updated_at: new Date()
                        });
                    }else{
                        console.warn(`User ${user_id} not found during logout FCM token cleanup`);
                    }
                }catch(fcmError){
                    console.error('Error clearing FCM token during logout:', fcmError);
                }
            }
            res.status(200).json({
                success: true,
                message: ' ADMIN Logged out successfully',
            });
        }catch(err){
            console.error('Logout error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }        
    },

    // Dashboard Data
    getDashboardData: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const today         = new Date();
            const startDate     = fromDate ? new Date(fromDate) : new Date(today.setHours(0, 0, 0, 0));
            const endDate       = toDate ? new Date(toDate) : new Date(today.setHours(23, 59, 59, 999));
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            // Calculate previous period dates for comparison
            const periodDiff    = endDate.getTime() - startDate.getTime();
            const prevEndDate   = new Date(startDate.getTime() - 1);
            const prevStartDate = new Date(prevEndDate.getTime() - periodDiff);
            prevStartDate.setHours(0, 0, 0, 0);
            prevEndDate.setHours(23, 59, 59, 999);
            // First, get role IDs for passenger and driver roles
            const roles = await Role.findAll({
                where: {
                    name: {
                        [Op.in]: ['User', 'Driver'] 
                    }
                }
            });
            const passengerRole = roles.find(role => role.name.toLowerCase() === 'user');
            const driverRole    = roles.find(role => role.name.toLowerCase() === 'driver');
            if(!passengerRole || !driverRole){
                throw new Error('Passenger or Driver role not found in the system');
            }
            // Parallel queries for better performance
            const [
                liveRides,
                totalPassengers,
                totalDrivers,
                totalNewUsers,
                currentPeriodRides,
                previousPeriodRides,
                currentEarnings,
                previousEarnings
            ] = await Promise.all([

                // Live Rides 
                RideRequests.count({
                    where: {
                        status: {
                            [Op.in]: ['searching_driver', 'accepted', 'arrived', 'ride_started']
                        }
                    }
                }),
                // Total Passengers 
                User.count({
                    include         : [{
                        model       : UserRole,
                        where       : {
                            role_id : passengerRole.id
                        },
                        required    : true
                    }],
                    where           : {
                        created_at  : {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }),
                // Total Drivers 
                User.count({
                    include         : [{
                        model       : UserRole,
                        where       : {
                            role_id : driverRole.id
                        },
                        required    : true
                    }],
                    where           : {
                        created_at  : {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }),
                // New Users
                User.count({
                    where           : {
                        created_at  : {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }),
                // Current period completed rides
                RideRequests.count({
                    where           : {
                        status      : 'ride_completed',
                        created_at  : {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }),
                // Previous period completed rides
                RideRequests.count({
                    where           : {
                        status      : 'ride_completed',
                        created_at  : {
                            [Op.between]: [prevStartDate, prevEndDate]
                        }
                    }
                }),
                // Current period earnings
                RideRequests.findOne({
                    attributes      : [
                        [sequelize.fn('SUM', sequelize.col('final_fare')), 'totalEarnings']
                    ],
                    where           : {
                        status      : 'ride_completed',
                        payment_status : 'paid',
                        created_at  : {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    raw: true
                }),
                // Previous period earnings
                RideRequests.findOne({
                    attributes      : [
                        [sequelize.fn('SUM', sequelize.col('final_fare')), 'totalEarnings']
                    ],
                    where           : {
                        status      : 'ride_completed',
                        payment_status: 'paid',
                        created_at  : {
                            [Op.between]: [prevStartDate, prevEndDate]
                        }
                    },
                    raw: true
                })
            ]);

            // Helper function to calculate percentage change
            const calculatePercentageChange = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            // Helper function to format currency
            const formatCurrency = (amount) => {
                return new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(amount || 0);
            };

            // Calculate changes
            const currentEarningsValue  = parseFloat(currentEarnings?.totalEarnings || 0);
            const previousEarningsValue = parseFloat(previousEarnings?.totalEarnings || 0);
            const earningsChange        = calculatePercentageChange(currentEarningsValue, previousEarningsValue);
            const ridesChange           = calculatePercentageChange(currentPeriodRides, previousPeriodRides);

            // Get additional metrics for comparison with previous period
            const [
                prevPassengers,
                prevDrivers,
                prevNewUsers
            ] = await Promise.all([

                // Previous period passengers
                User.count({
                    include         : [{
                        model       : UserRole,
                        where       : {
                            role_id : passengerRole.id
                        },
                        required    : true
                    }],
                    where           : {
                        created_at  : {
                            [Op.between]: [prevStartDate, prevEndDate]
                        }
                    }
                }),
                // Previous period drivers
                User.count({
                    include         : [{
                        model       : UserRole,
                        where       : {
                            role_id : driverRole.id
                        },
                        required    : true
                    }],
                    where           : {
                        created_at  : {
                            [Op.between]: [prevStartDate, prevEndDate]
                        }
                    }
                }),
                // Previous period new users
                User.count({
                    where           : {
                        created_at  : {
                            [Op.between]: [prevStartDate, prevEndDate]
                        }
                    }
                })
            ]);
            const dashboard        = {
                liveRides          : {
                    value          : liveRides,
                    change         : 0, // Live rides don't have historical comparison
                    changeType     : 'neutral'
                },
                totalPassengers    : {
                    value          : totalPassengers,
                    change         : calculatePercentageChange(totalPassengers, prevPassengers),
                    changeType     : totalPassengers >= prevPassengers ? 'positive' : 'negative'
                },
                totalDrivers       : {
                    value          : totalDrivers,
                    change         : calculatePercentageChange(totalDrivers, prevDrivers),
                    changeType     : totalDrivers >= prevDrivers ? 'positive' : 'negative'
                },
                totalEarnings      : {
                    value          : currentEarningsValue,
                    formattedValue : formatCurrency(currentEarningsValue),
                    change         : earningsChange,
                    changeType     : earningsChange >= 0 ? 'positive' : 'negative'
                },
                totalNewUsers      : {
                    value          : totalNewUsers,
                    change         : calculatePercentageChange(totalNewUsers, prevNewUsers),
                    changeType     : totalNewUsers >= prevNewUsers ? 'positive' : 'negative'
                },
                totalRideCompleted : {
                    value          : currentPeriodRides,
                    change         : ridesChange,
                    changeType     : ridesChange >= 0 ? 'positive' : 'negative'
                }
            };
            res.json({
                success      : true,
                data         : dashboard,
                dateRange    : {
                    fromDate : startDate.toISOString().split('T')[0],
                    toDate   : endDate.toISOString().split('T')[0]
                }
            });
        }catch(err){
            console.error('Dashboard data error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data'
            });
        }
    },

    // Completed Ride chart
    getCompletedRidesChart: async (req, res) => {
        try{
            const { fromDate, toDate } = req.query;
            let startDate, endDate;
            if(fromDate && toDate){
                startDate     = new Date(fromDate + 'T00:00:00.000Z');
                endDate       = new Date(toDate + 'T23:59:59.999Z');
            }else{
                const today   = new Date();
                startDate     = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
                endDate       = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            }
            // Generate array of dates for the range
            const dateArray   = [];
            const currentDate = new Date(startDate);
            while(currentDate <= endDate){
                dateArray.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            // Get completed rides data grouped by date
            const ridesData = await RideRequests.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('ride_completed_at')), 'date'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'completedRides']
                ],
                where: {
                    status: 'ride_completed',
                    ride_completed_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('DATE', sequelize.col('ride_completed_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('ride_completed_at')), 'ASC']],
                raw: true
            });
            // Create a map for quick lookup
            const ridesMap = new Map();
            ridesData.forEach(item => {
                ridesMap.set(item.date, parseInt(item.completedRides));
            });
            // Format data for chart with all dates (including zero values)
            const chartData    = dateArray.map(date => {
                const dateStr  = date.toISOString().split('T')[0];
                // Format date differently based on date range length
                const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                let formattedDate;
                if(daysDiff <= 7){
                    // For week or less - show day name and date
                    formattedDate = date.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        day: 'numeric' 
                    });
                }else 
                if(daysDiff <= 31){
                    // For month or less - show month and day
                    formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }else{
                    // For longer periods - show month and day
                    formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }
                return{
                    date: formattedDate,
                    fullDate: dateStr,
                    completedRides: ridesMap.get(dateStr) || 0
                };
            });
            // Calculate additional metrics
            const totalRides   = chartData.reduce((sum, item) => sum + item.completedRides, 0);
            const averageRides = chartData.length > 0 ? Math.round(totalRides / chartData.length) : 0;
            const peakRides    = chartData.length > 0 ? Math.max(...chartData.map(item => item.completedRides)) : 0;
            res.json({
                success: true,
                data: chartData,
                summary: {
                    totalRides,
                    averageRides,
                    peakRides,
                    dateRange: {
                        fromDate: startDate.toISOString().split('T')[0],
                        toDate: endDate.toISOString().split('T')[0]
                    }
                }
            });
        }catch(err){
            console.error('Completed rides chart error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch completed rides chart data'
            });
        }
    },

    // Revenue Analysis Chart
    getRevenueChart: async (req, res) => {
        try{
            const { fromDate, toDate } = req.query;
            let startDate, endDate;
            if(fromDate && toDate){
                startDate = new Date(fromDate + 'T00:00:00.000Z');
                endDate   = new Date(toDate + 'T23:59:59.999Z');
            }else{
                const today = new Date();
                startDate   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
                endDate     = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            }
            // Generate array of dates for the range
            const dateArray   = [];
            const currentDate = new Date(startDate);
            while(currentDate <= endDate){
                dateArray.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            // Get revenue data grouped by date
            const revenueData = await RideRequests.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('ride_completed_at')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('final_fare')), 'totalRevenue'],
                    [sequelize.fn('SUM', sequelize.col('commission_amount')), 'commission'],
                    [sequelize.fn('SUM', sequelize.col('driver_payout')), 'driverPayout'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'ridesCount']
                ],
                where: {
                    status            : 'ride_completed',
                    payment_status    : 'paid',
                    ride_completed_at : {
                        [Op.between]  : [startDate, endDate]
                    }
                },
                group: [sequelize.fn('DATE', sequelize.col('ride_completed_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('ride_completed_at')), 'ASC']],
                raw  : true
            });
            // Create a map for quick lookup
            const revenueMap = new Map();
            revenueData.forEach(item => {
                revenueMap.set(item.date, {
                    totalRevenue : parseFloat(item.totalRevenue || 0),
                    commission   : parseFloat(item.commission || 0),
                    driverPayout : parseFloat(item.driverPayout || 0),
                    ridesCount   : parseInt(item.ridesCount || 0)
                });
            });
            // Format data for chart with all dates (including zero values)
            const chartData    = dateArray.map(date => {
                const dateStr  = date.toISOString().split('T')[0];
                // Format date differently based on date range length
                const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                let formattedDate;
                if(daysDiff <= 7){
                    // For week or less - show day name and date
                    formattedDate = date.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        day: 'numeric' 
                    });
                }else if(daysDiff <= 31){
                    // For month or less - show month and day
                    formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }else{
                    // For longer periods - show month and day
                    formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }
                const dayData = revenueMap.get(dateStr) || {
                    totalRevenue: 0,
                    commission  : 0,
                    driverPayout: 0,
                    ridesCount  : 0
                };
                return {
                    date         : formattedDate,
                    fullDate     : dateStr,
                    totalRevenue : dayData.totalRevenue,
                    commission   : dayData.commission,
                    driverPayout : dayData.driverPayout,
                    ridesCount   : dayData.ridesCount
                };
            });
            // Calculate additional metrics
            const totalRevenue      = chartData.reduce((sum, item) => sum + item.totalRevenue, 0);
            const totalCommission   = chartData.reduce((sum, item) => sum + item.commission, 0);
            const totalDriverPayout = chartData.reduce((sum, item) => sum + item.driverPayout, 0);
            const totalRides        = chartData.reduce((sum, item) => sum + item.ridesCount, 0);
            const averageRevenue    = chartData.length > 0 ? Math.round(totalRevenue / chartData.length) : 0;
            const peakRevenue       = chartData.length > 0 ? Math.max(...chartData.map(item => item.totalRevenue)) : 0;
            const averagePerRide    = totalRides > 0 ? Math.round(totalRevenue / totalRides) : 0;
            // Helper function to format currency
            const formatCurrency = (amount) => {
                return new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(amount || 0);
            };
            res.json({
                success: true,
                data: chartData,
                summary: {
                    totalRevenue: {
                        value: totalRevenue,
                        formatted: formatCurrency(totalRevenue)
                    },
                    totalCommission: {
                        value: totalCommission,
                        formatted: formatCurrency(totalCommission)
                    },
                    totalDriverPayout: {
                        value: totalDriverPayout,
                        formatted: formatCurrency(totalDriverPayout)
                    },
                    averageRevenue: {
                        value: averageRevenue,
                        formatted: formatCurrency(averageRevenue)
                    },
                    peakRevenue: {
                        value: peakRevenue,
                        formatted: formatCurrency(peakRevenue)
                    },
                    averagePerRide: {
                        value: averagePerRide,
                        formatted: formatCurrency(averagePerRide)
                    },
                    totalRides,
                    dateRange: {
                        fromDate: startDate.toISOString().split('T')[0],
                        toDate: endDate.toISOString().split('T')[0]
                    }
                }
            });
        }catch(err){
            console.error('Revenue chart error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch revenue chart data'
            });
        }
    },

    // Ride Status Distribution Chart
    getRideStatusChart: async (req, res) => {
        try{
            const { fromDate, toDate } = req.query;
            let startDate, endDate;
            if(fromDate && toDate){
                startDate   = new Date(fromDate + 'T00:00:00.000Z');
                endDate     = new Date(toDate + 'T23:59:59.999Z');
            }else{
                const today = new Date();
                startDate   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
                endDate     = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            }
            // Get ride status distribution with detailed breakdown
            const statusData = await RideRequests.findAll({
                attributes: [
                    'status',
                    'cancelled_by',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                where: {
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: ['status', 'cancelled_by'],
                order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                raw: true
            });
            // Process the data to create meaningful categories
            const processedData   = {};
            let totalRides        = 0;
            statusData.forEach(item => {
                const status      = item.status;
                const cancelledBy = item.cancelled_by;
                const count       = parseInt(item.count);
                totalRides       += count;
                if(status === 'ride_completed'){
                    processedData['Completed'] = (processedData['Completed'] || 0) + count;
                }else 
                if(status === 'cancelled'){
                    if(cancelledBy === 'driver'){
                        processedData['Cancelled by Driver'] = (processedData['Cancelled by Driver'] || 0) + count;
                    }else 
                    if(cancelledBy === 'passenger' || cancelledBy === 'user'){
                        processedData['Cancelled by Passenger'] = (processedData['Cancelled by Passenger'] || 0) + count;
                    }else{
                        // For cancelled rides without specific cancelled_by info
                        processedData['Cancelled (Other)'] = (processedData['Cancelled (Other)'] || 0) + count;
                    }
                }else 
                if(['searching_driver', 'accepted', 'arrived', 'ride_started'].includes(status)){
                    processedData['Ongoing'] = (processedData['Ongoing'] || 0) + count;
                }else{
                    // For other statuses like expired, no_drivers_available, timeout
                    processedData['Other'] = (processedData['Other'] || 0) + count;
                }
            });
            // Convert to array format for chart with colors and percentages
            const chartData      = Object.entries(processedData).map(([name, value], index) => {
                const percentage = totalRides > 0 ? ((value / totalRides) * 100).toFixed(1) : 0;
                // Define colors for different status categories
                const colors = {
                    'Completed'              : '#10b981', // Green
                    'Cancelled by Driver'    : '#ef4444', // Red
                    'Cancelled by Passenger' : '#f97316', // Orange
                    'Cancelled (Other)'      : '#6b7280', // Gray
                    'Ongoing'                : '#3b82f6', // Blue
                    'Other'                  : '#8b5cf6' // Purple
                };
                return {
                    name,
                    value,
                    percentage: parseFloat(percentage),
                    color: colors[name] || '#6b7280',
                    formattedValue: value.toLocaleString('en-IN')
                };
            });

            // Sort by value descending
            chartData.sort((a, b) => b.value - a.value);

            // Calculate additional metrics
            const completedRides   = processedData['Completed'] || 0;
            const cancelledRides   = (processedData['Cancelled by Driver'] || 0) + (processedData['Cancelled by Passenger'] || 0) + (processedData['Cancelled (Other)'] || 0);
            const ongoingRides     = processedData['Ongoing'] || 0;
            const completionRate   = totalRides > 0 ? ((completedRides / totalRides) * 100).toFixed(1) : 0;
            const cancellationRate = totalRides > 0 ? ((cancelledRides / totalRides) * 100).toFixed(1) : 0;

            // Get top cancellation reason if available
            const topCancellationReason = await RideRequests.findAll({
                attributes: [
                    'cancellation_reason',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                where: {
                    status: 'cancelled',
                    cancellation_reason: {
                        [Op.not]: null,
                        [Op.ne]: ''
                    },
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: ['cancellation_reason'],
                order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                limit: 1,
                raw: true
            });
            res.json({
                success : true,
                data    : chartData,
                summary : {
                    totalRides,
                    completedRides,
                    cancelledRides,
                    ongoingRides,
                    completionRate: parseFloat(completionRate),
                    cancellationRate: parseFloat(cancellationRate),
                    topCancellationReason: topCancellationReason[0]?.cancellation_reason || 'No data',
                    dateRange    : {
                        fromDate : startDate.toISOString().split('T')[0],
                        toDate   : endDate.toISOString().split('T')[0]
                    }
                }
            });
        }catch(err){
            console.error('Ride status chart error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch ride status chart data'
            });
        }
    },

    // Payment Type Distribution Chart
    getPaymentTypeChart: async (req, res) => {
        try{
            const { fromDate, toDate } = req.query;
            let startDate, endDate;
            if(fromDate && toDate){
                startDate = new Date(fromDate + 'T00:00:00.000Z');
                endDate   = new Date(toDate + 'T23:59:59.999Z');
            }else{
                const today = new Date();
                startDate   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
                endDate     = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            }
            // Get payment type distribution
            const paymentData = await RideRequests.findAll({
                attributes: [
                    'payment_method',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('final_fare')), 'totalAmount']
                ],
                where: {
                    status: 'ride_completed',
                    payment_status: 'paid',
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: ['payment_method'],
                order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                raw: true
            });
            // Process the data
            let totalTransactions   = 0;
            let totalAmount         = 0;
            const processedData     = {};
            paymentData.forEach(item => {
                const paymentMethod = item.payment_method || 'Unknown';
                const count         = parseInt(item.count);
                const amount        = parseFloat(item.totalAmount || 0);
                totalTransactions  += count;
                totalAmount        += amount;
                // Normalize payment method names
                let normalizedMethod = paymentMethod.toLowerCase();
                switch (normalizedMethod) {
                    case 'cash':
                        processedData['Cash'] = { count, amount };
                        break;
                    case 'card':
                    case 'credit_card':
                    case 'debit_card':
                        processedData['Card'] = { 
                            count: (processedData['Card']?.count || 0) + count, 
                            amount: (processedData['Card']?.amount || 0) + amount 
                        };
                        break;
                    case 'wallet':
                    case 'digital_wallet':
                        processedData['Wallet'] = { 
                            count: (processedData['Wallet']?.count || 0) + count, 
                            amount: (processedData['Wallet']?.amount || 0) + amount 
                        };
                        break;
                    case 'upi':
                    case 'google_pay':
                    case 'phonepe':
                    case 'paytm':
                        processedData['UPI'] = { 
                            count: (processedData['UPI']?.count || 0) + count, 
                            amount: (processedData['UPI']?.amount || 0) + amount 
                        };
                        break;
                    default:
                        processedData['Other'] = { 
                            count: (processedData['Other']?.count || 0) + count, 
                            amount: (processedData['Other']?.amount || 0) + amount 
                        };
                }
            });
            // Convert to chart format with colors and percentages
            const chartData = Object.entries(processedData).map(([name, data]) => {
                const percentage = totalTransactions > 0 ? ((data.count / totalTransactions) * 100).toFixed(1) : 0;
                const amountPercentage = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : 0;
                // Define colors for different payment methods
                const colors = {
                    'Cash'  : '#059669',   // Green
                    'Card'  : '#3b82f6',   // Blue
                    'Wallet': '#f59e0b',   // Orange
                    'UPI'   : '#8b5cf6',   // Purple
                    'Other' : '#6b7280'    // Gray
                };
                return {
                    name,
                    value: data.count,
                    amount: data.amount,
                    percentage: parseFloat(percentage),
                    amountPercentage: parseFloat(amountPercentage),
                    color: colors[name] || '#6b7280',
                    formattedValue: data.count.toLocaleString('en-IN'),
                    formattedAmount: new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(data.amount)
                };
            });
            // Sort by transaction count descending
            chartData.sort((a, b) => b.value - a.value);
            // Calculate additional metrics
            const averageTransactionValue = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
            const mostUsedMethod          = chartData.length > 0 ? chartData[0].name : 'None';
            const digitalPaymentPercent   = chartData
                .filter(item => ['Card', 'Wallet', 'UPI'].includes(item.name))
                .reduce((sum, item) => sum + item.percentage, 0);
            // Helper function to format currency
            const formatCurrency = (amount) => {
                return new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(amount || 0);
            };
            res.json({
                success: true,
                data: chartData,
                summary: {
                    totalTransactions,
                    totalAmount: {
                        value: totalAmount,
                        formatted: formatCurrency(totalAmount)
                    },
                    averageTransactionValue: {
                        value: averageTransactionValue,
                        formatted: formatCurrency(averageTransactionValue)
                    },
                    mostUsedMethod,
                    digitalPaymentPercent: parseFloat(digitalPaymentPercent.toFixed(1)),
                    cashPercent: chartData.find(item => item.name === 'Cash')?.percentage || 0,
                    dateRange: {
                        fromDate: startDate.toISOString().split('T')[0],
                        toDate: endDate.toISOString().split('T')[0]
                    }
                }
            });
        }catch(err){
            console.error('Payment type chart error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payment type chart data'
            });
        }
    },

    // Driver Supply vs Passenger Demand Chart
    getDriverSupplyDemandChart: async (req, res) => {
        try{
            const { fromDate, toDate } = req.query;
            let startDate, endDate;
            if(fromDate && toDate){
                startDate     = new Date(fromDate + 'T00:00:00.000Z');
                endDate       = new Date(toDate + 'T23:59:59.999Z');
            }else{
                const today   = new Date();
                startDate     = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 0, 0, 0, 0);
                endDate       = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            }
            // Generate array of dates for the range
            const dateArray   = [];
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                dateArray.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            // Get ride requests (demand) grouped by date
            const demandData = await RideRequests.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('requested_at')), 'date'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalRequests']
                ],
                where: {
                    requested_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('DATE', sequelize.col('requested_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('requested_at')), 'ASC']],
                raw: true
            });
            // Get unique drivers who accepted rides (supply) grouped by date
            const supplyData = await RideRequests.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('accepted_at')), 'date'],
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('driver_id'))), 'activeDrivers']
                ],
                where: {
                    status: {
                        [Op.in]: ['accepted', 'arrived', 'ride_started', 'ride_completed']
                    },
                    driver_id: {
                        [Op.not]: null
                    },
                    accepted_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('DATE', sequelize.col('accepted_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('accepted_at')), 'ASC']],
                raw: true
            });
            // Get cancelled rides due to no drivers available
            const noDriversData = await RideRequests.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'noDriversCancellations']
                ],
                where: {
                    status: {
                        [Op.in]: ['no_drivers_available', 'expired', 'timeout']
                    },
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('DATE', sequelize.col('created_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
                raw: true
            });
            // Create maps for quick lookup
            const demandMap    = new Map();
            const supplyMap    = new Map();
            const noDriversMap = new Map();
            demandData.forEach(item => {
                demandMap.set(item.date, parseInt(item.totalRequests));
            });
            supplyData.forEach(item => {
                supplyMap.set(item.date, parseInt(item.activeDrivers));
            });
            noDriversData.forEach(item => {
                noDriversMap.set(item.date, parseInt(item.noDriversCancellations));
            });
            // Format data for chart with all dates
            const chartData    = dateArray.map(date => {
                const dateStr  = date.toISOString().split('T')[0];
                // Format date based on range length
                const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                let formattedDate;
                if(daysDiff <= 7){
                    formattedDate = date.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        day: 'numeric' 
                    });
                }else 
                if(daysDiff <= 31){
                    formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }else{
                    formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }
                const demand = demandMap.get(dateStr) || 0;
                const supply = supplyMap.get(dateStr) || 0;
                const noDriversCancellations = noDriversMap.get(dateStr) || 0;
                // Calculate supply-demand ratio
                const supplyDemandRatio = demand > 0 ? (supply / demand) : 0;
                return {
                    date              : formattedDate,
                    fullDate          : dateStr,
                    totalRequests     : demand,
                    activeDrivers     : supply,
                    noDriversCancellations,
                    supplyDemandRatio : parseFloat(supplyDemandRatio.toFixed(2)),
                    supplyGap         : Math.max(0, demand - supply)
                };
            });
            // Calculate summary metrics
            const totalRequests               = chartData.reduce((sum, item) => sum + item.totalRequests, 0);
            const totalActiveDrivers          = chartData.reduce((sum, item) => sum + item.activeDrivers, 0);
            const totalNoDriversCancellations = chartData.reduce((sum, item) => sum + item.noDriversCancellations, 0);
            const averageSupplyDemandRatio    = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.supplyDemandRatio, 0) / chartData.length : 0;
            const totalSupplyGap              = chartData.reduce((sum, item) => sum + item.supplyGap, 0);
            // Identify peak demand and supply shortage days
            const peakDemandDay  = chartData.reduce((max, item) => item.totalRequests > max.totalRequests ? item : max, chartData[0] || {});
            const worstSupplyDay = chartData.reduce((worst, item) => item.supplyDemandRatio < worst.supplyDemandRatio ? item : worst, chartData[0] || {});
            res.json({
                success: true,
                data: chartData,
                summary: {
                    totalRequests,
                    totalActiveDrivers,
                    totalNoDriversCancellations,
                    averageSupplyDemandRatio: parseFloat(averageSupplyDemandRatio.toFixed(2)),
                    totalSupplyGap,
                    noDriversCancellationRate: totalRequests > 0 ? 
                        parseFloat(((totalNoDriversCancellations / totalRequests) * 100).toFixed(1)) : 0,
                    peakDemandDay: {
                        date: peakDemandDay?.date || 'N/A',
                        requests: peakDemandDay?.totalRequests || 0
                    },
                    worstSupplyDay: {
                        date: worstSupplyDay?.date || 'N/A',
                        ratio: worstSupplyDay?.supplyDemandRatio || 0
                    },
                    dateRange: {
                        fromDate: startDate.toISOString().split('T')[0],
                        toDate: endDate.toISOString().split('T')[0]
                    }
                }
            });
        }catch(err){
            console.error('Driver supply demand chart error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch driver supply demand chart data'
            });
        }
    },

    // Top Cities/Districts/States by Rides Chart
    getTopLocationsChart: async (req, res) => {
        try{
            const { fromDate, toDate, limit = 10, groupBy = 'district' } = req.query;
            let startDate, endDate;
            if(fromDate && toDate){
                startDate   = new Date(fromDate + 'T00:00:00.000Z');
                endDate     = new Date(toDate + 'T23:59:59.999Z');
            }else{
                const today = new Date();
                startDate   = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
                endDate     = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            }
            // Validate groupBy parameter
            const validGroupBy = ['district', 'state', 'city'];
            const groupByField = validGroupBy.includes(groupBy) ? groupBy : 'district';
            // Determine the column to group by
            let groupColumn, labelName;
            switch(groupByField){
                case 'state':
                    groupColumn = 'pickup_state';
                    labelName   = 'state';
                    break;
                case 'district':
                    groupColumn = 'pickup_district';
                    labelName   = 'district';
                    break;
                default:
                    groupColumn = 'pickup_district';
                    labelName   = 'district';
            }
            // Get location-based rides data with state info for context
            const locationRidesData = await RideRequests.findAll({
                attributes: [
                    [sequelize.col(groupColumn), 'location'],
                    [sequelize.col('pickup_state'), 'state'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalRides'],
                    [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'ride_completed' THEN 1 END")), 'completedRides'],
                    [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'cancelled' THEN 1 END")), 'cancelledRides'],
                    [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status IN ('no_drivers_available', 'expired', 'timeout') THEN 1 END")), 'noDriversCancellations'],
                    [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'ride_completed' AND payment_status = 'paid' THEN final_fare ELSE 0 END")), 'totalRevenue'],
                    [sequelize.fn('AVG', sequelize.literal("CASE WHEN status = 'ride_completed' THEN final_fare END")), 'averageFare'],
                    [sequelize.fn('AVG', sequelize.literal("CASE WHEN status = 'ride_completed' THEN estimated_distance END")), 'averageDistance'],
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('driver_id'))), 'uniqueDrivers']
                ],
                where: {
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    },
                    [groupColumn]: {
                        [Op.not]: null,
                        [Op.ne]: ''
                    }
                },
                group: [groupColumn, 'pickup_state'],
                having: sequelize.literal('totalRides > 0'),
                order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                limit: parseInt(limit),
                raw: true
            });
            // Process the location data
            const processedData              = locationRidesData.map((item, index) => {
                const location               = item.location || 'Unknown';
                const state                  = item.state || '';
                const totalRides             = parseInt(item.totalRides || 0);
                const completedRides         = parseInt(item.completedRides || 0);
                const cancelledRides         = parseInt(item.cancelledRides || 0);
                const noDriversCancellations = parseInt(item.noDriversCancellations || 0);
                const totalRevenue           = parseFloat(item.totalRevenue || 0);
                const averageFare            = parseFloat(item.averageFare || 0);
                const averageDistance        = parseFloat(item.averageDistance || 0);
                const uniqueDrivers          = parseInt(item.uniqueDrivers || 0);
                const completionRate         = totalRides > 0 ? ((completedRides / totalRides) * 100) : 0;
                const cancellationRate       = totalRides > 0 ? ((cancelledRides / totalRides) * 100) : 0;
                const noDriversRate          = totalRides > 0 ? ((noDriversCancellations / totalRides) * 100) : 0;
                const driverUtilization      = totalRides > 0 && uniqueDrivers > 0 ? (totalRides / uniqueDrivers) : 0;
                // Generate colors for the chart
                const colors = [
                    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
                ];
                return {
                    rank: index + 1,
                    location,
                    state,
                    displayName: groupByField === 'state' ? location : `${location}, ${state}`,
                    totalRides,
                    completedRides,
                    cancelledRides,
                    noDriversCancellations,
                    totalRevenue,
                    averageFare,
                    averageDistance,
                    uniqueDrivers,
                    completionRate: parseFloat(completionRate.toFixed(1)),
                    cancellationRate: parseFloat(cancellationRate.toFixed(1)),
                    noDriversRate: parseFloat(noDriversRate.toFixed(1)),
                    driverUtilization: parseFloat(driverUtilization.toFixed(1)),
                    color: colors[index % colors.length],
                    formattedRevenue: new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(totalRevenue),
                    formattedAverageFare: new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(averageFare),
                    formattedDistance: `${averageDistance.toFixed(1)} km`
                };
            });
            // Calculate summary metrics
            const totalRidesAllLocations   = processedData.reduce((sum, item) => sum + item.totalRides, 0);
            const totalRevenueAllLocations = processedData.reduce((sum, item) => sum + item.totalRevenue, 0);
            const topLocation              = processedData.length > 0 ? processedData[0] : null;
            const locationCount            = processedData.length;
            const totalUniqueDrivers       = processedData.reduce((sum, item) => sum + item.uniqueDrivers, 0);
            // Calculate market share for top locations
            const processedDataWithShare   = processedData.map(item => ({
                ...item,
                marketShare: totalRidesAllLocations > 0 ? 
                    parseFloat(((item.totalRides / totalRidesAllLocations) * 100).toFixed(1)) : 0,
                revenueShare: totalRevenueAllLocations > 0 ? 
                    parseFloat(((item.totalRevenue / totalRevenueAllLocations) * 100).toFixed(1)) : 0
            }));
            // Get growth data by comparing with previous period
            const periodDiff         = endDate.getTime() - startDate.getTime();
            const prevEndDate        = new Date(startDate.getTime() - 1);
            const prevStartDate      = new Date(prevEndDate.getTime() - periodDiff);
            const previousPeriodData = await RideRequests.findAll({
                attributes: [
                    [sequelize.col(groupColumn), 'location'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalRides'],
                    [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'ride_completed' AND payment_status = 'paid' THEN final_fare ELSE 0 END")), 'totalRevenue']
                ],
                where: {
                    created_at: {
                        [Op.between]: [prevStartDate, prevEndDate]
                    },
                    [groupColumn]: {
                        [Op.not]: null,
                        [Op.ne]: ''
                    }
                },
                group: [groupColumn],
                raw: true
            });
            // Create maps for previous period data
            const prevRidesMap      = new Map();
            const prevRevenueMap    = new Map();
            previousPeriodData.forEach(item => {
                const location      = item.location || 'Unknown';
                prevRidesMap.set(location, parseInt(item.totalRides || 0));
                prevRevenueMap.set(location, parseFloat(item.totalRevenue || 0));
            });
            // Add growth data to processed results
            const finalData         = processedDataWithShare.map(item => {
                const prevRides     = prevRidesMap.get(item.location) || 0;
                const prevRevenue   = prevRevenueMap.get(item.location) || 0;
                const ridesGrowth   = prevRides > 0 ? 
                    parseFloat((((item.totalRides - prevRides) / prevRides) * 100).toFixed(1)) : 
                    (item.totalRides > 0 ? 100 : 0);
                const revenueGrowth = prevRevenue > 0 ? 
                    parseFloat((((item.totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : 
                    (item.totalRevenue > 0 ? 100 : 0);
                return {
                    ...item,
                    previousPeriodRides: prevRides,
                    previousPeriodRevenue: prevRevenue,
                    ridesGrowth,
                    revenueGrowth,
                    ridesGrowthType: ridesGrowth >= 0 ? 'positive' : 'negative',
                    revenueGrowthType: revenueGrowth >= 0 ? 'positive' : 'negative'
                };
            });
            res.json({
                success: true,
                data: finalData,
                meta: {
                    groupBy: groupByField,
                    labelName
                },
                summary: {
                    totalLocations: locationCount,
                    totalRides: totalRidesAllLocations,
                    totalRevenue: {
                        value: totalRevenueAllLocations,
                        formatted: new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                        }).format(totalRevenueAllLocations)
                    },
                    topLocation: topLocation ? {
                        name: topLocation.displayName,
                        rides: topLocation.totalRides,
                        marketShare: topLocation.marketShare,
                        completionRate: topLocation.completionRate
                    } : null,
                    averageRidesPerLocation: locationCount > 0 ? Math.round(totalRidesAllLocations / locationCount) : 0,
                    averageRevenuePerLocation: locationCount > 0 ? Math.round(totalRevenueAllLocations / locationCount) : 0,
                    totalUniqueDrivers,
                    averageCompletionRate: processedData.length > 0 ? 
                        parseFloat((processedData.reduce((sum, item) => sum + item.completionRate, 0) / processedData.length).toFixed(1)) : 0,
                    averageNoDriversRate: processedData.length > 0 ? 
                        parseFloat((processedData.reduce((sum, item) => sum + item.noDriversRate, 0) / processedData.length).toFixed(1)) : 0,
                    dateRange: {
                        fromDate: startDate.toISOString().split('T')[0],
                        toDate: endDate.toISOString().split('T')[0]
                    }
                }
            });
        }catch(err){
            console.error('Top locations chart error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch top locations chart data'
            });
        }
    },
};
module.exports = adminController;