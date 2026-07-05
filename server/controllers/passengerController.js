const { sequelize, Sequelize, } = require('../models');
const User                = require('../models/userModel');
const UserRole            = require('../models/userRoleModel');
const Wallets             = require('../models/walletModel');
const WalletTransactions  = require('../models/walletTransactionsModel');
const { Op }              = require('sequelize');
const BASE_URL            = process.env.BASE_URL || 'http://localhost:5000';
const passengerController = {

    // Get all passengers with pagination, search, and filters
    passengerDetails: async (req, res) => {
        try{
            const{ 
                page       = 1, 
                limit      = 10, 
                search     = '', 
                status     = '', 
                sort_by    = 'created_at', 
                sort_order = 'DESC' 
            } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: "Invalid pagination parameters"
                });
            }
            // Validate sort and order
            const validSortFields = ["name", "status", "created_at", "updated_at"];
            const validOrder      = ["asc", "desc"];
            const sortField       = validSortFields.includes(sort_by) ? sort_by : "created_at";
            const sortOrder       = validOrder.includes(sort_order.toLowerCase()) ? sort_order.toUpperCase() : "DESC";
            // Build where clause
            const where = {};
            if(search){
                where[Op.or] = [
                    { name   : { [Op.like]: `%${search}%` } },
                    { email  : { [Op.like]: `%${search}%` } },
                    { mobile : { [Op.like]: `%${search}%` } }
                ];
            }
            if(status === "1" || status === "0"){
                where.status = Number(status);
            }
            // Fetch passengers with pagination
            const { rows, count } = await User.findAndCountAll({
                where,
                include: [
                    {
                        model    : UserRole,
                        where    : { role_id: 2 },
                        required : true
                    }
                ],
                limit    : limitNum,
                offset   : (pageNum - 1) * limitNum,
                order    : [[sortField, sortOrder]],
                distinct : true
            });
            // Format passenger data
            const formattedPassenger = rows.map(passenger => ({
                id         : passenger.id,
                name       : passenger.name,
                email      : passenger.email,
                mobile     : passenger.mobile,
                gender     : passenger.gender,
                profile    : passenger.profile ? `${BASE_URL}/uploads/profile/${passenger.profile}` : null,
                created_at : passenger.created_at,
                updated_at : passenger.updated_at,
                status     : parseInt(passenger.status)
            }));
            const totalPages = Math.ceil(count / limitNum);
            res.status(200).json({
                success : true,
                message : 'Passengers retrieved successfully',
                data    : {
                    passengers        : formattedPassenger,
                    pagination        : {
                        current_page  : pageNum,
                        per_page      : limitNum,
                        total_records : count,
                        total_pages   : totalPages,
                        has_next      : pageNum < totalPages,
                        has_prev      : pageNum > 1
                    }
                }
            });
        }catch(err){
            console.error('getPassenger error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors: { server: err.message },
            });
        }
    },

    // Get particular passenger by ID
    getPassenger: async (req, res) => {
        try{
            const { id }    = req.params;
            const passenger = await User.findOne({
                where: { id, status: 1 },
                include: [
                    {
                        model: UserRole,
                        where: { role_id: 2 },
                        required: true
                    }
                ]
            });
            if(!passenger){
                return res.status(404).json({
                    success: false,
                    message: 'Passenger not found'
                });
            }
            const formattedPassenger = {
                id         : passenger.id,
                name       : passenger.name,
                email      : passenger.email,
                mobile     : passenger.mobile,
                gender     : passenger.gender,
                status     : passenger.status,
                profile    : passenger.profile,
                created_at : passenger.created_at,
                updated_at : passenger.updated_at,
            };
            res.status(200).json({
                success : true,
                message : 'Passenger retrieved successfully',
                data    : formattedPassenger
            });
        }catch(err){
            console.error('getPassenger error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve Passenger',
                errors: { server: err.message },
            });
        }
    },

    // Update passenger
    updatePassenger: async (req, res) => {
        try{
            const { id }                  = req.params;
            const { name, email, gender, status } = req.body;
            // Check if user exists
            const user = await User.findByPk(id);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            const updateData = {};
            // Validate and add name if provided
            if(name !== undefined){
                if(typeof name !== 'string' || name.trim().length === 0){
                    return res.status(400).json({
                        success: false,
                        message: 'Name must be a non-empty string'
                    });
                }
                updateData.name = name.trim();
            }
            // Validate and add email if provided
            if(email !== undefined){
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if(!emailRegex.test(email)){
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide a valid email address'
                    });
                }
                // Check if email is already taken by another user
                const existingUser = await User.findOne({
                    where: {
                        email: email,
                        id: { [Op.ne]: id }
                    }
                });
                if(existingUser){
                    return res.status(409).json({
                        success: false,
                        message: 'Email address is already in use'
                    });
                }
                updateData.email = email.toLowerCase().trim();
            }
            // Validate and add gender if provided
            if(gender !== undefined){
                const validGenders = ['male', 'female', 'other'];
                if(!validGenders.includes(gender.toLowerCase())){
                    return res.status(400).json({
                        success: false,
                        message: 'Gender must be one of: male, female, other'
                    });
                }
                updateData.gender = gender.toLowerCase();
            }
            // Validate and add gender if provided
            if(status !== undefined){
                if(!["1","0"].includes(status)){
                    return res.status(400).json({
                        success: false,
                        message: 'status must be one of: active or inactive'
                    });
                }
                updateData.status = status;
            }
            // Handle profile image upload if present
            if(req.file){
                // Delete old profile image if it exists
                if(user.profile){
                    const fs           = require('fs');
                    const path         = require('path');
                    const oldImagePath = path.join(process.cwd(), 'uploads', 'profile', user.profile);
                    if(fs.existsSync(oldImagePath)){
                        try{
                            fs.unlinkSync(oldImagePath);
                        }catch(deleteErr){
                            console.warn('Failed to delete old profile image:', deleteErr);
                        }
                    }
                }
                // Set new profile image filename
                updateData.profile = req.file.filename;
            }
            // If no fields to update
            if(Object.keys(updateData).length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields provided for update'
                });
            }
            await user.update(updateData);
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully'
            });
        }catch(err){
            console.error('updatePassenger error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to update passenger'
            });
        }
    },

    // Process wallet transaction for passenger
    walletTransaction: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { amount, type, reference_type, description } = req.body;

            // Validate required fields
            if (!amount || !type || !reference_type || !description) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required',
                    errors: {
                        amount: !amount ? 'Amount is required' : '',
                        type: !type ? 'Transaction type is required' : '',
                        reference_type: !reference_type ? 'Reference type is required' : '',
                        description: !description ? 'Description is required' : ''
                    }
                });
            }

            // Validate amount
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be a positive number',
                    errors: { amount: 'Invalid amount' }
                });
            }

            // Validate type
            if (!['credit', 'debit'].includes(type)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction type',
                    errors: { type: 'Type must be credit or debit' }
                });
            }

            // Validate reference_type
            const validReferenceTypes = [
                'ride_payment', 'ride_refund', 'topup', 'withdrawal',
                'bonus', 'referral_bonus', 'cashback', 'penalty',
                'adjustment', 'driver_earning', 'driver_commission'
            ];
            if (!validReferenceTypes.includes(reference_type)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid reference type',
                    errors: { reference_type: 'Invalid reference type' }
                });
            }

            // Check if user exists and is a passenger
            const user = await User.findOne({
                where: { id },
                include: [{
                    model: UserRole,
                    where: { role_id: 2 },
                    required: true
                }]
            });

            if (!user) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Passenger not found'
                });
            }

            // Get or create wallet
            let wallet = await Wallets.findOne({
                where: { user_id: id },
                transaction
            });

            if (!wallet) {
                wallet = await Wallets.create({
                    user_id: id,
                    balance: 0.00,
                    reserved_balance: 0.00,
                    total_earned: 0.00,
                    total_spent: 0.00,
                    currency: 'INR',
                    status: 'active'
                }, { transaction });
            }

            // Check wallet status
            if (wallet.status !== 'active') {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Wallet is ${wallet.status}. Cannot process transaction.`
                });
            }

            const balanceBefore = parseFloat(wallet.balance);
            let balanceAfter = balanceBefore;

            // Calculate new balance based on transaction type
            if (type === 'credit') {
                balanceAfter = balanceBefore + parsedAmount;
                wallet.total_earned = parseFloat(wallet.total_earned) + parsedAmount;
            } else if (type === 'debit') {
                // Check if sufficient balance for debit
                if (balanceBefore < parsedAmount) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient wallet balance',
                        errors: { amount: `Available balance: ${balanceBefore.toFixed(2)}` }
                    });
                }
                balanceAfter = balanceBefore - parsedAmount;
                wallet.total_spent = parseFloat(wallet.total_spent) + parsedAmount;
            }

            // Update wallet balance
            wallet.balance = balanceAfter;
            await wallet.save({ transaction });

            // Generate unique transaction ID
            const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

            // Create wallet transaction record
            const walletTransaction = await WalletTransactions.create({
                wallet_id: wallet.id,
                user_id: id,
                transaction_id: transactionId,
                reference_type: reference_type,
                reference_id: null,
                type: type,
                amount: parsedAmount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                description: description.trim(),
                payment_method: 'adjustment',
                payment_gateway: null,
                gateway_transaction_id: null,
                gateway_payment_id: null,
                gateway_order_id: null,
                status: 'completed',
                processed_at: new Date(),
                metadata: {
                    processed_by: 'admin',
                    admin_action: true
                }
            }, { transaction });

            await transaction.commit();

            res.status(200).json({
                success: true,
                message: `Wallet ${type === 'credit' ? 'credited' : 'debited'} successfully`,
                data: {
                    transaction_id: walletTransaction.transaction_id,
                    type: walletTransaction.type,
                    amount: parseFloat(walletTransaction.amount),
                    balance_before: parseFloat(walletTransaction.balance_before),
                    balance_after: parseFloat(walletTransaction.balance_after),
                    current_balance: parseFloat(wallet.balance)
                }
            });

        } catch (err) {
            await transaction.rollback();
            console.error('walletTransaction error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to process wallet transaction',
                errors: { server: err.message }
            });
        }
    }
};

module.exports = passengerController;
