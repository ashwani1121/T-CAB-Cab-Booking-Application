const { sequelize, Sequelize, } = require('../models');
const User                      = require('../models/userModel');
const UserRole                  = require('../models/userRoleModel');
const DriverDetails             = require('../models/driverDetailsModel');
const Wallets                   = require('../models/walletModel');
const RideRequests              = require('../models/rideRequestModel');
const WalletTransactions        = require('../models/walletTransactionsModel');
const { Op }                    = require('sequelize');
const { verify }                = require('jsonwebtoken');
const driversController         = {

    // Driver Delete Request with pagination, search, and filters
    deleteRequest: async (req, res) => {
        try{
            const {
                page       = 1,
                limit      = 10,
                search     = '',
                status     = '', 
                sort_by    = 'deletion_requested_at',
                sort_order = 'DESC'
            } = req.query;
            const offset   = (parseInt(page) - 1) * parseInt(limit);
            const whereConditions = {};
            // Search condition
            const searchCondition = search ? {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                    { mobile: { [Op.like]: `%${search}%` } }
                ]
            } : {};
            // Driver details conditions - only show deletion requests (status 1 or 2)
            const driverDetailsConditions = {
                deletion_request: {
                    [Op.in]: [1, 2] // 1: requested, 2: approved (pending processing)
                }
            };
            // Filter by specific deletion request status if provided
            if(status !== ''){
                const parsedStatus = parseInt(status);
                if([1, 2].includes(parsedStatus)){
                    driverDetailsConditions.deletion_request = parsedStatus;
                }else{
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid deletion request status',
                        errors: { status: 'Must be 1 (requested) or 2 (approved)' }
                    });
                }
            }
            // Get drivers with deletion requests
            const { count, rows } = await User.findAndCountAll({
                where: {
                    ...whereConditions,
                    ...searchCondition
                },
                include: [
                    {
                        model: UserRole,
                        where: { role_id: 3 },
                        required: true
                    },
                    {
                        model: DriverDetails,
                        as: 'DriverDetail', // Add the alias here
                        where: driverDetailsConditions,
                        required: true
                    }
                ],
                limit: parseInt(limit),
                offset: offset,
                // Use string path for ordering with the association alias
                order: [['DriverDetail', sort_by, sort_order.toUpperCase()]],
                distinct: true,
                subQuery: false // Important for correct counting with includes
            });
            const formattedDrivers = rows.map(driver => ({
                id: driver.id,
                name: driver.name,
                email: driver.email,
                mobile: driver.mobile,
                gender: driver.gender,
                account_status: driver.status,
                deletion_request: driver.DriverDetail.deletion_request,
                deletion_requested_at: driver.DriverDetail.deletion_requested_at,
                deletion_reason: driver.DriverDetail.deletion_reason,
                created_at: driver.created_at,
                updated_at: driver.updated_at
            }));
            const totalPages = Math.ceil(count / parseInt(limit));
            res.status(200).json({
                success: true,
                message: 'Driver deletion requests retrieved successfully',
                data: {
                    drivers: formattedDrivers,
                    pagination: {
                        current_page: parseInt(page),
                        per_page: parseInt(limit),
                        total_records: count,
                        total_pages: totalPages,
                        has_next: parseInt(page) < totalPages,
                        has_prev: parseInt(page) > 1
                    }
                }
            });
        }catch(err){
            console.error('deleteRequest error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors: { server: err.message },
            });
        }
    },

    // Handle deletion request approval/rejection
    handleDeleteRequest: async (req, res) => {
        try{
            const { id } = req.params;
            const { action, rejection_reason } = req.body;
            // Validate action
            if(!['approve', 'reject'].includes(action)){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action',
                    errors: { action: 'Action must be either "approve" or "reject"' }
                });
            }
            // Check if rejection reason is provided when rejecting
            if(action === 'reject' && !rejection_reason){
                return res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required',
                    errors: { rejection_reason: 'Please provide a reason for rejection' }
                });
            }
            // Check if driver exists and has a deletion request
            const driver = await User.findOne({
                where: { id },
                include: [
                    {
                        model: UserRole,
                        where: { role_id: 3 },
                        required: true
                    },
                    {
                        model: DriverDetails,
                        as: 'DriverDetail', // Add the alias here
                        where: {
                            deletion_request: {
                                [Op.in]: [1, 2] 
                            }
                        },
                        required: true
                    }
                ]
            });
            if(!driver){
                return res.status(404).json({
                    success: false,
                    message: 'Driver not found or no deletion request exists'
                });
            }
            if(action === 'approve'){
                await User.update(
                    {
                        status: 0,
                        updated_at: new Date()
                    },
                    { where: { id } }
                );
                await DriverDetails.update(
                    {
                        deletion_request: 2, // Mark as approved
                        updated_at: new Date()
                    },
                    { where: { user_id: id } }
                );
                res.status(200).json({
                    success: true,
                    message: 'Driver deletion request approved successfully. Account has been deactivated.'
                });
            }else 
            if(action === 'reject'){
                await DriverDetails.update(
                    {
                        deletion_request: 0, // Reset to no request
                        deletion_requested_at: null,
                        deletion_reason: `[REJECTED] ${rejection_reason}`, // Store rejection reason with marker
                        updated_at: new Date()
                    },
                    { where: { user_id: id } }
                );
                res.status(200).json({
                    success: true,
                    message: 'Driver deletion request rejected successfully'
                });
            }
        }catch(err){
            console.error('handleDeleteRequest error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to process deletion request',
                errors: { server: err.message }
            });
        }
    },

    // Get driver financial summary before deletion
    getDriverFinancialSummary: async (req, res) => {
        try{
            const { id } = req.params;
            const driver = await User.findOne({
                where: { id },
                include: [
                    {
                        model: UserRole,
                        where: { role_id: 3 },
                        required: true
                    },
                    {
                        model: DriverDetails,
                        as: 'DriverDetail',
                        where: {
                            deletion_request: {
                                [Op.in]: [1, 2]
                            }
                        },
                        required: true
                    },
                    {
                        model: Wallets,
                        attributes: ['balance']
                    }
                ]
            });
            if(!driver){
                return res.status(404).json({
                    success: false,
                    message: 'Driver not found or no deletion request exists'
                });
            }
            // Calculate cash rides commission (Driver owes to Admin)
            const cashRides = await RideRequests.findAll({
                where: {
                    driver_id: id,
                    payment_method: 'cash',
                    payment_status: 'paid',
                    status: 'ride_completed'
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('commission_amount')), 'total_commission'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'ride_count']
                ],
                raw: true
            });
            const driverOwesToAdmin = parseFloat(cashRides[0]?.total_commission || 0);
            const cashRideCount     = parseInt(cashRides[0]?.ride_count || 0);
            // Calculate wallet/easebuzz rides payout (Admin owes to Driver)
            const onlineRides = await RideRequests.findAll({
                where: {
                    driver_id: id,
                    payment_method: {
                        [Op.in]: ['wallet', 'easebuzz']
                    },
                    payment_status: 'paid',
                    status: 'ride_completed'
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('driver_payout')), 'total_payout'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'ride_count']
                ],
                raw: true
            });
            const adminOwesToDriver = parseFloat(onlineRides[0]?.total_payout || 0);
            const onlineRideCount   = parseInt(onlineRides[0]?.ride_count || 0);
            // Get driver deposit details (still showing deposit for refund purposes)
            const depositDetails = await DriverDetails.findOne({
                where: { user_id: id },
                attributes: ['deposit_balance', 'deposit_status']
            });
            const depositBalance = parseFloat(depositDetails?.deposit_balance || 0);
            const depositStatus  = depositDetails?.deposit_status || 'pending';
            // ============================================
            // Get cancellation charges from WALLET TRANSACTIONS
            // ============================================
            const cancellationCharges = await WalletTransactions.findAll({
                where: {
                    user_id: id,
                    reference_type: {
                        [Op.in]: ['cancellation_penalty', 'cancellation_free']
                    },
                    type: 'debit',
                    status: 'completed'
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total_charges'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'charge_count']
                ],
                raw: true
            });
            const totalCancellationCharges = parseFloat(cancellationCharges[0]?.total_charges || 0);
            const cancellationCount        = parseInt(cancellationCharges[0]?.charge_count || 0);
            // Get current wallet balance
            const walletBalance = parseFloat(driver.Wallet?.balance || 0);
            // Driver owes: Cash commission (cancellation charges already deducted from wallet)
            const totalDriverOwes = driverOwesToAdmin;
            // Admin owes: Online payouts + Current Wallet balance + Deposit refund (if applicable)
            let totalAdminOwes = adminOwesToDriver + walletBalance;
            if(depositStatus === 'paid' && depositBalance > 0){
                totalAdminOwes += depositBalance;
            }
            // Net settlement (positive = admin owes driver, negative = driver owes admin)
            const netSettlement = totalAdminOwes - totalDriverOwes;
            // Get pending rides
            const pendingRides = await RideRequests.count({
                where: {
                    driver_id: id,
                    status: {
                        [Op.in]: ['accepted', 'arrived', 'ride_started']
                    }
                }
            });
            const totalRides = await RideRequests.count({
                where: {
                    driver_id: id,
                    status: 'ride_completed'
                }
            });
            const rideStats = await RideRequests.findAll({
                where: {
                    driver_id: id,
                    status: 'ride_completed'
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('final_fare')), 'total_earnings'],
                    [sequelize.fn('SUM', sequelize.col('commission_amount')), 'total_commission'],
                    [sequelize.fn('SUM', sequelize.col('tip_amount')), 'total_tips']
                ],
                raw: true
            });
            res.status(200).json({
                success: true,
                message: 'Driver financial summary retrieved successfully',
                data: {
                    driver_info: {
                        id: driver.id,
                        name: driver.name,
                        email: driver.email,
                        mobile: driver.mobile,
                        account_status: driver.status
                    },
                    // What driver owes to admin
                    driver_owes: {
                        cash_commission: {
                            amount: driverOwesToAdmin,
                            ride_count: cashRideCount,
                            description: 'Commission from cash rides'
                        },
                        cancellation_charges: {
                            amount: totalCancellationCharges,
                            charge_count: cancellationCount,
                            description: 'Cancellation penalties (already deducted from wallet)',
                            note: 'These charges were already deducted from wallet balance'
                        },
                        total: totalDriverOwes
                    },
                    // What admin owes to driver
                    admin_owes: {
                        online_payout: {
                            amount: adminOwesToDriver,
                            ride_count: onlineRideCount,
                            description: 'Payout from wallet/easebuzz rides'
                        },
                        wallet_balance: {
                            amount: walletBalance,
                            description: 'Current wallet balance (after cancellation charges)',
                            note: `Cancellation charges of ₹${totalCancellationCharges.toFixed(2)} already deducted`
                        },
                        deposit_refund: {
                            amount: depositStatus === 'paid' ? depositBalance : 0,
                            status: depositStatus,
                            description: 'Refundable deposit amount'
                        },
                        total: totalAdminOwes
                    },
                    // Net settlement
                    settlement: {
                        net_amount: Math.abs(netSettlement),
                        settlement_type: netSettlement >= 0 ? 'admin_pays_driver' : 'driver_pays_admin',
                        description: netSettlement >= 0 
                            ? 'Admin needs to pay driver' 
                            : 'Driver needs to pay admin',
                        breakdown: {
                            admin_owes: totalAdminOwes,
                            driver_owes: totalDriverOwes,
                            cancellation_charges_already_deducted: totalCancellationCharges
                        }
                    },
                    // Additional statistics
                    statistics: {
                        total_completed_rides: totalRides,
                        pending_active_rides: pendingRides,
                        total_earnings: parseFloat(rideStats[0]?.total_earnings || 0),
                        total_commission: parseFloat(rideStats[0]?.total_commission || 0),
                        total_tips: parseFloat(rideStats[0]?.total_tips || 0),
                        total_cancellation_charges: totalCancellationCharges,
                        cancellation_count: cancellationCount
                    },
                    // Warnings
                    warnings: {
                        has_pending_rides: pendingRides > 0,
                        has_outstanding_cash: driverOwesToAdmin > 0,
                        has_pending_payout: adminOwesToDriver > 0,
                        deposit_not_refunded: depositStatus === 'paid' && depositBalance > 0,
                        wallet_balance_includes_deductions: totalCancellationCharges > 0
                    }
                }
            });
        }catch(err){
            console.error('getDriverFinancialSummary error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch driver financial summary',
                errors: { server: err.message }
            });
        }
    },

    // Get all drivers with pagination, search, and filters
    getDrivers: async (req, res) => {
        try{
            const {
                page           = 1, 
                limit          = 10, 
                search         = '', 
                status         = '',
                account_status = '',
                deposit_status = '',
                driver_type    = '',
                sort_by        = 'created_at', 
                sort_order     = 'DESC'
            } = req.query;
            const offset          = (parseInt(page) - 1) * parseInt(limit);
            const whereConditions = {};
            // Account status filter (0 = inactive, 1 = active)
            if(account_status !== ''){
                whereConditions.status = parseInt(account_status);
            }
            // Search condition
            const searchCondition = search ? {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                    { mobile: { [Op.like]: `%${search}%` } }
                ]
            } : {};
            // Driver details conditions
            const driverDetailsConditions = {};
            if(status){
                driverDetailsConditions.status = status;
            }
            if(deposit_status){
                driverDetailsConditions.deposit_status = deposit_status;
            }
            if(driver_type){
                // Validate driver_type
                if(!['nefa_driver', 'registered_driver'].includes(driver_type)){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid driver type',
                        errors: { driver_type: 'Must be either nefa_driver or registered_driver' }
                    });
                }
                driverDetailsConditions.driver_type = driver_type;
            }
            // Get drivers with role_id = 3 
            const { count, rows } = await User.findAndCountAll({
                where: {
                    ...whereConditions,
                    ...searchCondition
                },
                include: [
                    {
                        model: UserRole,
                        where: { role_id: 3 },
                        required: true
                    },
                    {
                        model: DriverDetails,
                        where: driverDetailsConditions,
                        required: true
                    }
                ],
                limit: parseInt(limit),
                offset: offset,
                order: [[sort_by, sort_order.toUpperCase()]],
                distinct: true
            });
            const formattedDrivers = rows.map(driver => ({
                id         : driver.id,
                name       : driver.name,
                email      : driver.email,
                mobile     : driver.mobile,
                gender     : driver.gender,
                status     : driver.status,
                deposit_sts: driver.DriverDetail.deposit_status,
                verify_sts : driver.DriverDetail.status,
                created_at : driver.created_at,
                updated_at : driver.updated_at
            }));
            const totalPages = Math.ceil(count / parseInt(limit));
            res.status(200).json({
                success: true,
                message: 'Drivers retrieved successfully',
                data: {
                    drivers: formattedDrivers,
                    pagination: {
                        current_page  : parseInt(page),
                        per_page      : parseInt(limit),
                        total_records : count,
                        total_pages   : totalPages,
                        has_next      : parseInt(page) < totalPages,
                        has_prev      : parseInt(page) > 1
                    }
                }
            });
        }catch(err){
            console.error('getDrivers error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors: { server: err.message },
            });
        }
    },

    // Get single driver by ID
    getDriver: async (req, res) => {
        try{
            const { id } = req.params;
            const driver = await User.findOne({
                where: { id }, 
                include: [
                    {
                        model: UserRole,
                        where: { role_id: 3 },
                        required: true
                    },
                    {
                        model: DriverDetails,
                        required: true
                    }
                ]
            });
            if(!driver){
                return res.status(404).json({
                    success: false,
                    message: 'Driver not found'
                });
            }
            const formattedDriver = {
                id: driver.id,
                name: driver.name,
                email: driver.email,
                mobile: driver.mobile,
                gender: driver.gender,
                status: driver.status,
                profile: driver.profile,
                created_at: driver.created_at,
                updated_at: driver.updated_at,
                driver_details: driver.DriverDetail
            };
            res.status(200).json({
                success: true,
                message: 'Driver retrieved successfully',
                data: formattedDriver
            });
        }catch(err){
            console.error('getDriver error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve driver',
                errors: { server: err.message },
            });
        }
    },

    // Update driver status
    updateDriverStatus: async (req, res) => {
        try{
            const { id } = req.params;
            const { verification_status, reason, driver_type, status } = req.body;
            // Check if driver exists
            const driver = await User.findOne({
                where: { id },
                include: [
                    {
                        model: UserRole,
                        where: { role_id: 3 },
                        required: true
                    },
                    {
                        model: DriverDetails,
                        required: true
                    }
                ]
            });
            if(!driver){
                return res.status(404).json({
                    success: false,
                    message: 'Driver not found'
                });
            }
            // Validate verification status
            const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
            if(verification_status && !validStatuses.includes(verification_status)){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification status',
                    errors: { verification_status: 'Status must be one of: pending, approved, rejected, suspended' }
                });
            }
            // Validate user account status
            if(status !== undefined && status !== 0 && status !== 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user status',
                    errors: { status: 'Status must be either 0 (inactive) or 1 (active)' }
                });
            }
            // Validate driver_type if provided
            if(driver_type && !['nefa_driver', 'registered_driver'].includes(driver_type)){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid driver type',
                    errors: { driver_type: 'Must be either nefa_driver or registered_driver' }
                });
            }
            // Check if reason is required for rejected/suspended verification status
            if((verification_status === 'rejected' || verification_status === 'suspended') && !reason){
                return res.status(400).json({
                    success: false,
                    message: 'Reason is required for rejected or suspended status',
                    errors: { reason: 'Reason is required when verification status is rejected or suspended' }
                });
            }
            // Update driver details (verification status, driver type, reason)
            const driverDetailsUpdate = {
                updated_at: new Date()
            };
            if(verification_status){
                driverDetailsUpdate.status = verification_status;
            }
            if(driver_type){
                driverDetailsUpdate.driver_type = driver_type;
            }
            // Add reason if provided or if verification status is rejected/suspended
            if(reason || verification_status === 'rejected' || verification_status === 'suspended'){
                driverDetailsUpdate.reason = reason || '';
            }
            // If verification status is approved or pending, clear any previous reason
            if(verification_status === 'approved' || verification_status === 'pending'){
                driverDetailsUpdate.reason = null;
            }
            // Update driver details table
            await DriverDetails.update(driverDetailsUpdate, {
                where: { user_id: id }
            });
            // Update user account status (active/inactive) in users table
            if(status !== undefined){
                await User.update(
                    { 
                        status: parseInt(status),
                        updated_at: new Date()
                    },
                    { where: { id } }
                );
            }
            res.status(200).json({
                success: true,
                message: 'Driver status updated successfully'
            });
        }catch(err){
            console.error('updateDriverStatus error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to update driver status',
                errors: { server: err.message }
            });
        }
    },

    // Delete a driver (soft delete)
    deleteDriver: async (req, res) => {
        try{
            const { id } = req.params;
            const user   = await User.findByPk(id);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'Driver not found'
                });
            }
            // Check if user is actually a driver
            const driverRole = await UserRole.findOne({
                where: { user_id: id, role_id: 3 }
            });
            if(!driverRole){
                return res.status(400).json({
                    success: false,
                    message: 'User is not a driver'
                });
            }
            await user.update({ status: 0 });
            res.status(200).json({
                success: true,
                message: 'Driver deleted successfully',
            });
        }catch(err){
            console.error('deleteDriver error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete driver',
                errors: { server: err.message },
            });
        }
    }
};
module.exports = driversController;