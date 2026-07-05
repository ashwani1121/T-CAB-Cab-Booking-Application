const jwt           = require('jsonwebtoken');
const crypto        = require('crypto');
const { Op }        = require('sequelize');
const { sequelize, Sequelize, RefreshToken, User, UserRole, Role, Otp } = require('../../models');
const { sendSMS }   = require('../../services/otp');
const apiController = {

    // Send OTP
    sendOTP: async (req, res) => {
        try{
            const { mobile } = req.body;
            // Validate mobile number
            if(!mobile || !/^[0-9]{10}$/.test(mobile)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid 10-digit mobile number is required'
                });
            }
            // Check if OTP was sent recently (rate limiting)
            const recentOTP = await Otp.findOne({
                where: {
                    mobile,
                    created_at: {
                        [Op.gte]: new Date(Date.now() - 60000) // Within last 1 minute
                    }
                }
            });
            if(recentOTP){
                return res.status(429).json({
                    success: false,
                    message: 'Please wait before requesting another OTP'
                });
            }
            const otp         = crypto.randomInt(100000, 999999).toString();
            const expires_at  = new Date(Date.now() + 5 * 60 * 1000);
            const smsResponse = await sendSMS(mobile, otp);
            await Otp.create({
                mobile,
                otp,
                expires_at,
                verified: false,
                attempts: 0
            });
            return res.status(200).json({
                success: true,
                message: 'OTP sent successfully'
            });
        }catch(error){
            console.error('Send OTP Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP',
                error: error.message
            });
        }
    },

    // Verify OTP
    verifyOTP: async (req, res) => {
        try{
            const { mobile, otp } = req.body;
            // Validate input
            if(!mobile || !otp){
                return res.status(400).json({
                    success: false,
                    message: 'Mobile number and OTP are required'
                });
            }
            if(!/^[0-9]{10}$/.test(mobile)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid 10-digit mobile number is required'
                });
            }
            if(!/^[0-9]{6}$/.test(otp)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid 6-digit OTP is required'
                });
            }
            // Find the latest OTP for this mobile
            const otpRecord = await Otp.findOne({
                where: {
                    mobile,
                    verified: false
                },
                order: [['created_at', 'DESC']]
            });
            if(!otpRecord){
                return res.status(404).json({
                    success: false,
                    message: 'No OTP found for this mobile number'
                });
            }
            // Check if OTP is expired
            if(new Date() > otpRecord.expires_at){
                return res.status(400).json({
                    success: false,
                    message: 'OTP has expired. Please request a new one'
                });
            }
            // Check attempts (max 3)
            if(otpRecord.attempts >= 3){
                return res.status(400).json({
                    success: false,
                    message: 'Maximum verification attempts exceeded. Please request a new OTP'
                });
            }
            // Verify OTP
            if(otpRecord.otp !== otp){
                // Increment attempts
                await otpRecord.update({
                    attempts: otpRecord.attempts + 1
                });
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP',
                    attemptsLeft: 3 - (otpRecord.attempts + 1)
                });
            }
            // Mark OTP as verified
            await otpRecord.update({ verified: true });
            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully'
            });
        }catch(error){
            console.error('Verify OTP Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify OTP',
                error: error.message
            });
        }
    },

    // Resend OTP
    resendOTP: async (req, res) => {
        try{
            const { mobile } = req.body;
            if(!mobile || !/^[0-9]{10}$/.test(mobile)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid 10-digit mobile number is required'
                });
            }
            // Invalidate previous OTPs
            await Otp.update(
                { verified: true },
                { where: { mobile, verified: false } }
            );
            // Send new OTP
            return apiController.sendOTP(req, res);
        }catch(error){
            console.error('Resend OTP Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to resend OTP',
                error: error.message
            });
        }
    },

    // Logout
    logout: async (req, res) => {
        try{
            const { refreshToken } = req.body;
            if(!refreshToken){
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token is required',
                });
            }
            // Remove refresh token from database
            const deletedCount = await RefreshToken.destroy({
                where: { token: refreshToken }
            });
            if(deletedCount === 0){
                return res.status(404).json({
                    success: false,
                    message: 'Refresh token not found',
                });
            }
            res.status(200).json({
                success: true,
                message: 'Logged out successfully',
            });
        }catch(err){
            console.error('Logout error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // verify User
    verifyAccount : async (req, res) => {
        try{
            const { mobile,email,role } = req.body;
            // Validate required fields
            if(!role || typeof role !== 'string'){
                return res.status(400).json({
                    success: false,
                    message: 'Role is required and must be a string.',
                });
            }
            // Validate that either mobile or email is provided
            if(!mobile && !email){
                return res.status(400).json({
                    success: false,
                    message: 'Either mobile number or email is required.',
                });
            }
            // Validate mobile if provided
            if(mobile){
                if(typeof mobile !== 'string'){
                    return res.status(400).json({
                        success: false,
                        message: 'Mobile number must be a string.',
                    });
                }
                if(!/^\d{10}$/.test(mobile.trim())){
                    return res.status(400).json({
                        success: false,
                        message: 'Mobile number must be a valid 10-digit number.',
                    });
                }
            }
            // Validate email if provided
            if(email){
                if(typeof email !== 'string'){
                    return res.status(400).json({
                        success: false,
                        message: 'Email must be a string.',
                    });
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if(!emailRegex.test(email.trim())){
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide a valid email address.',
                    });
                }
            }
            // Map role names to role IDs
            const roleMapping = {
                'admin' : 1,
                'user'  : 2,
                'driver': 3
            };
            const roleId = roleMapping[role.toLowerCase()];
            if(!roleId){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role provided. Valid roles are: admin, user, driver.',
                });
            }
            // Build dynamic where clause based on provided fields
            const whereClause             = {};
            if(mobile) whereClause.mobile = mobile.trim();
            if(email) whereClause.email   = email.trim().toLowerCase();
            // Check if user exists with the specified role
            const existingUser = await User.findOne({
                where: whereClause,
                include: [
                    {
                        model: UserRole,
                        where: {
                            role_id: roleId
                        },
                        include: [
                            {
                                model: Role,
                                attributes: ['id', 'name'],
                            },
                        ],
                    },
                ],
            });
            if(existingUser){
                // User exists - return verification success
                const userRole     = existingUser.UserRoles[0]?.Role?.name || role;
                // Customize response message based on role
                let successMessage = 'Account verified successfully.';
                let additionalData = {};
                switch (role.toLowerCase()){
                    case 'user':
                        successMessage = 'User verified successfully.';
                        additionalData.isRegistered = true;
                        break;
                    case 'driver':
                        successMessage = 'Driver verified successfully.';
                        break;
                    case 'admin':
                        successMessage = 'Admin verified successfully.';
                        break;
                }
                return res.status(200).json({
                    success: true,
                    message: successMessage,
                    data: {
                        ...additionalData,
                        user: {
                            id: existingUser.id,
                            name: existingUser.name,
                            email: existingUser.email,
                            mobile: existingUser.mobile,
                            role: userRole
                        },
                    },
                });
            }else{
                // User not found - customize response based on role
                let notFoundMessage = 'Account not found!';
                let responseData    = {};
                switch(role.toLowerCase()){
                    case 'user':
                        notFoundMessage = 'User Not Found!';
                        responseData.isRegistered = false;
                        return res.status(200).json({
                            success: true,
                            message: notFoundMessage,
                            data: responseData,
                        });
                    case 'driver':
                        notFoundMessage = 'Driver Not Found!';
                        return res.status(200).json({
                            success: false,
                            message: notFoundMessage
                        });
                    case 'admin':
                        notFoundMessage = 'Admin account not found!';
                        return res.status(404).json({
                            success: false,
                            message: notFoundMessage
                        });
                    default:
                        return res.status(404).json({
                            success: false,
                            message: 'Account not found!'
                        });
                }
            }
        }catch(err){
            console.error('Verify Account error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Refresh Access Token using Refresh Token
    refreshToken: async (req, res) => {
        let transaction;
        try{
            const { refreshToken } = req.body;
            if(!refreshToken){
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token is required',
                });
            }
            transaction = await sequelize.transaction();
            // Find refresh token in database
            const tokenRecord = await RefreshToken.findOne({
                where: {
                    token: refreshToken,
                    expires_at: {
                        [Sequelize.Op.gt]: new Date()
                    }
                },
                include: [
                    {
                        model: User,
                        include: [
                            {
                                model: UserRole,
                                include: [
                                    {
                                        model: Role,
                                        attributes: ['id', 'name'],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                transaction
            });
            if(!tokenRecord){
                await transaction.rollback();
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired refresh token',
                });
            }
            const user = tokenRecord.User;
            const role = user.UserRoles[0]?.Role?.name || 'user';
            // Generate new access token
            const payload = {
                userId: user.id,
                email: user.email,
                mobile: user.mobile,
                role,
            };
            const newAccessToken  = apiController.generateAccessToken(payload);
            const newRefreshToken = apiController.generateRefreshToken();
            // Remove old refresh token and store new one
            await RefreshToken.destroy({
                where: { token: refreshToken },
                transaction
            });
            await apiController.storeRefreshToken(user.id, newRefreshToken, transaction);
            await transaction.commit();
            res.status(200).json({
                success         : true,
                message         : 'Token refreshed successfully',
                accessToken     : newAccessToken,
                refreshToken    : newRefreshToken,
                user            : {
                    id          : user.id,
                    name        : user.name,
                    email       : user.email,
                    mobile      : user.mobile,
                    role
                },
            });
        }catch(err){
            if(transaction) await transaction.rollback();
            console.error('Refresh token error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Generate Access Token (JWT)
    generateAccessToken: (payload) => {
        return jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
        });
    },

    // Generate Refresh Token (Random string)
    generateRefreshToken: () => {
        return crypto.randomBytes(64).toString('hex');
    },

    // Store refresh token in database
    storeRefreshToken: async (userId, refreshToken, transaction = null) => {
        const expiresAt  = new Date();
        const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10);
        expiresAt.setDate(expiresAt.getDate() + expiryDays);
        await RefreshToken.create({
            token: refreshToken,
            user_id: userId,
            expires_at: expiresAt,
        }, { transaction });
    },

    // Clean up expired refresh tokens for a user
    cleanupExpiredTokens: async (userId, transaction = null) => {
        await RefreshToken.destroy({
            where: {
                user_id: userId,
                expires_at: {
                    [Sequelize.Op.lt]: new Date()
                }
            },
            transaction
        });
    }
    
};

module.exports = apiController;