const jwt = require('jsonwebtoken');
const { User, UserRole, Role } = require('../models');
const { Op } = require("sequelize");
const adminAuthMiddleware = async (req, res, next) => {
    try{
        // Get token from Authorization header
        const authHeader = req.header('Authorization');
        const token      = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        if(!token){
            return res.status(401).json({
                success: false,
                message: 'No token provided. Authorization denied.',
                code: 'NO_TOKEN'
            });
        }
        // Verify access token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        // Check if user exists, is active, and is an admin
        const user = await User.findOne({
            where: { 
                id: decoded.userId,
                status: 1
            },
            include: [
                {
                    model: UserRole,
                    include: [
                        {
                            model: Role,
                            attributes: ['id', 'name'],
                            where: {
                                id: {
                                    [Op.notIn]: [2, 3]  
                                }
                            }
                        },
                    ],
                },
            ],
        });
        if(!user){
            return res.status(401).json({
                success: false,
                message: 'User not found, inactive, or not an admin. Authorization denied.',
                code: 'INVALID_USER'
            });
        }
        // Attach user data to request object
        req.user = {
            userId : decoded.userId,
            email  : decoded.email,
            mobile : decoded.mobile,
            role   : decoded.role,
        };
        next();
    }catch(err){
        console.error('Admin auth middleware error:', err);
        if(err.name === 'TokenExpiredError'){
            return res.status(401).json({
                success: false,
                message: 'Access token has expired. Please refresh your token.',
                code: 'TOKEN_EXPIRED'
            });
        }
        if(err.name === 'JsonWebTokenError'){
            return res.status(401).json({
                success: false,
                message: 'Invalid access token. Authorization denied.',
                code: 'INVALID_TOKEN'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Token verification failed. Authorization denied.',
            code: 'AUTH_FAILED'
        });
    }
};
module.exports = adminAuthMiddleware;