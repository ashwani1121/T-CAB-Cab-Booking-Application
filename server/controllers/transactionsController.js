const { Op }                    = require('sequelize'); 
const Vehicletypes              = require('../models/vehicleTypesModel');
const Package                   = require('../models/packagesModel');
const DriverDepositTransaction  = require('../models/driverDepositModel');
const ReservationAdvancePayment = require('../models/reservationAdvancePaymentModel');
const User                      = require('../models/userModel');
const transactionsController    = {

    // GET ALL RESERVATION ADVANCE TRANSACTIONS (with pagination, search, filters)
    getReservationAdvanceTransactions: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                sort   = 'created_at',
                order  = 'desc',
            } = req.query;
            const pageNum  = Math.max(1, parseInt(page, 10));
            const limitNum = Math.min(100, parseInt(limit, 10));
            // Validate pagination
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            const where = {};
            // Search by transaction_id or user name
            if(search){
                where[Op.or] = [
                    { transaction_id: { [Op.like]: `%${search}%` } },
                    { '$user.name$': { [Op.like]: `%${search}%` } }
                ];
            }
            // Filter by status
            if(['pending', 'paid', 'used', 'expired', 'refunded', 'failed'].includes(status)){
                where.status = status;
            }
            // Validate sort & order
            const validSortFields = [
                'user_id',
                'transaction_id',
                'advance_amount',
                'estimated_total_fare',
                'payment_status',
                'status',
                'pickup_date',
                'created_at',
                'updated_at'
            ];
            const sortField = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            const { rows, count } = await ReservationAdvancePayment.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'mobile']
                    }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                attributes: [
                    'id',
                    'user_id',
                    'transaction_id',
                    'package_id',
                    'vehicle_type_id',
                    'estimated_total_fare',
                    'advance_amount',
                    'remaining_amount',
                    'pickup_date',
                    'pickup_time',
                    'payment_status',
                    'status',
                    'is_custom_trip',
                    'custom_km',
                    'custom_days',
                    'created_at',
                    'updated_at'
                ],
            });
            res.status(200).json({
                success: true,
                data: {
                    payments: rows,
                    pagination: {
                        total_records: count,
                        current_page: pageNum,
                        per_page: limitNum,
                        total_pages: Math.ceil(count / limitNum),
                    },
                },
            });
        }catch(err){
            console.error('getReservationAdvanceTransactions error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // GET SINGLE RESERVATION ADVANCE TRANSACTION DETAILS (for view modal)
    getReservationAdvanceTransactionById: async (req, res) => {
        try{
            const { id } = req.params;
            if(!id || isNaN(id)){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction ID',
                });
            }
            const payment = await ReservationAdvancePayment.findOne({
                where: { id },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'mobile']
                    },
                    {
                        model: Vehicletypes,
                        as: 'vehicleType',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Package,
                        as: 'package',
                        attributes: ['id', 'name', 'km'],
                        required: false
                    }
                ]
            });
            if(!payment){
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found',
                });
            }
            // Parse location data if stored as JSON strings
            let pickupLocation = null;
            let dropLocation   = null;
            try{
                if(payment.pickup_location){
                    pickupLocation = typeof payment.pickup_location === 'string' ? JSON.parse(payment.pickup_location) : payment.pickup_location;
                }
            }catch(e){
                pickupLocation = { address: payment.pickup_location };
            }
            try{
                if(payment.drop_location){
                    dropLocation = typeof payment.drop_location === 'string' ? JSON.parse(payment.drop_location) : payment.drop_location;
                }
            }catch(e){
                dropLocation = { address: payment.drop_location };
            }
            // Format response data
            const responseData = {
                id                      : payment.id,
                transaction_id          : payment.transaction_id,
                user                    : payment.user,
                trip_type               : payment.is_custom_trip ? 'Custom Trip' : 'Package Reservation',
                is_custom_trip          : payment.is_custom_trip,
                package                 : payment.package ? {
                    id                  : payment.package.id,
                    name                : payment.package.name,
                    km                  : payment.package.km,
                } : null,
                custom_details          : payment.is_custom_trip ? {
                    km                  : payment.custom_km,
                    days                : payment.custom_days
                } : null,
                vehicle_type            : payment.vehicleType ? {
                    id                  : payment.vehicleType.id,
                    name                : payment.vehicleType.name
                } : null,
                pickup_location         : pickupLocation,
                drop_location           : dropLocation,
                pickup_date             : payment.pickup_date,
                pickup_time             : payment.pickup_time,
                estimated_total_fare    : payment.estimated_total_fare,
                advance_amount          : payment.advance_amount,
                remaining_amount        : payment.remaining_amount,
                payment_status          : payment.payment_status,
                status                  : payment.status,
                gateway_transaction_id  : payment.gateway_transaction_id,
                bank_ref_num            : payment.bank_ref_num,
                paid_at                 : payment.paid_at,
                used_at                 : payment.used_at,
                expires_at              : payment.expires_at,
                created_at              : payment.created_at,
                updated_at              : payment.updated_at,
            };
            res.status(200).json({
                success: true,
                data: responseData,
            });
        }catch(err){
            console.error('getReservationAdvanceTransactionById error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // GET ALL DRIVER DEPOSIT TRANSACTIONS (with pagination, search, filters)
    getDriverDepositTransactions: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                sort   = 'created_at',
                order  = 'desc',
            } = req.query;
            const pageNum  = Math.max(1, parseInt(page, 10));
            const limitNum = Math.min(100, parseInt(limit, 10));
            // Validate pagination
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            const where = {};
            // Search by transaction_id, description, or driver name
            if(search){
                where[Op.or] = [
                    { transaction_id: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } },
                    { '$driver.name$': { [Op.like]: `%${search}%` } }
                ];
            }
            // Filter by status
            if(['pending', 'completed', 'failed', 'refunded'].includes(status)){
                where.status = status;
            }
            // Validate sort & order
            const validSortFields = [
                'driver_id', 
                'transaction_id', 
                'transaction_type', 
                'amount', 
                'status', 
                'created_at', 
                'updated_at'
            ];
            const sortField = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            const { rows, count } = await DriverDepositTransaction.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'email', 'mobile']
                    }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                attributes: [
                    'id',
                    'driver_id',
                    'transaction_id',
                    'transaction_type',
                    'amount',
                    'balance_before',
                    'balance_after',
                    'payment_method',
                    'status',
                    'description',
                    'created_at',
                    'updated_at'
                ],
            });
            res.status(200).json({
                success: true,
                data: {
                    transactions: rows,
                    pagination: {
                        total_records: count,
                        current_page: pageNum,
                        per_page: limitNum,
                        total_pages: Math.ceil(count / limitNum),
                    },
                },
            });
        }catch(err){
            console.error('getDriverDepositTransactions error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },
};
module.exports = transactionsController;