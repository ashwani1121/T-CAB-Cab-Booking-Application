const { Role, User, UserRole, Notification, sequelize } = require('../models'); 
const { Op, ValidationError }  = require('sequelize');
const admin                    = require('firebase-admin');

// Constants
const MAX_FCM_TOKENS_PER_BATCH = 500;
const SEARCH_RESULT_LIMIT      = 50;
const EXCLUDED_ROLE_IDS        = [6];

// Utility functions
const createErrorResponse      = (res, status, message, errors = null) => {
    return res.status(status).json({
        success: false,
        message,
        ...(errors && { errors })
    });
};
const createSuccessResponse    = (res, data = null, message = null) => {
    return res.status(200).json({
        success: true,
        ...(message && { message }),
        ...(data && { data })
    });
};

// Validation schemas
const validateNotificationInput = (data) => {
    const { role, title, message, sendTo, specificUsers } = data;
    const errors = {};
    if(!role || !Number.isInteger(Number(role))){
        errors.role = 'Valid role ID is required';
    }    
    if(!title || typeof title !== 'string' || !title.trim()){
        errors.title = 'Title is required';
    }else 
    if(title.trim().length > 100){
        errors.title = 'Title must not exceed 100 characters';
    }else 
    if(title.trim().length < 3){
        errors.title = 'Title must be at least 3 characters long';
    }
    if(!message || typeof message !== 'string' || !message.trim()){
        errors.message = 'Message is required';
    }else 
    if(message.trim().length > 500){
        errors.message = 'Message must not exceed 500 characters';
    }
    if(!sendTo || !['all', 'specific'].includes(sendTo)){
        errors.sendTo  = 'sendTo must be either "all" or "specific"';
    }
    if(sendTo === 'specific'){
        if(!Array.isArray(specificUsers) || specificUsers.length === 0){
            errors.specificUsers = 'At least one user must be selected for specific notifications';
        }else 
        if(specificUsers.length > 100){
            errors.specificUsers = 'Cannot send to more than 100 specific users at once';
        }
    }
    return{
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// Optimized query builders
const getRoleQuery = () => ({
    attributes: ['id', 'name'],
    where: {
        id: { [Op.notIn]: EXCLUDED_ROLE_IDS },
    },
    order: [
        [sequelize.literal('CASE WHEN id = 2 THEN 1 WHEN id = 3 THEN 2 ELSE 3 END'), 'ASC'],
        ['name', 'ASC']
    ]
});

const getUsersByRoleQuery = (roleId, whereConditions = {}) => ({
    attributes: ['id', 'name', 'email'],
    include: [{
        model: UserRole,
        where: { role_id: roleId },
        attributes: [],
        required: true
    }],
    where: {
        status: 1,
        ...whereConditions
    },
    order: [['name', 'ASC']]
});

const getActiveUsersWithFCMQuery = (roleId, userIds = null) => {
    const whereClause = {
        status: 1,
        fcm_token: {
            [Op.ne]: null,
            [Op.ne]: ''
        }
    };
    if(userIds){
        whereClause.id = { [Op.in]: userIds };
    }
    return {
        attributes: ['id', 'name', 'email', 'fcm_token'],
        include: userIds ? [] : [{
            model: UserRole,
            where: { role_id: roleId },
            attributes: [],
            required: true
        }],
        where: whereClause,
        order: [['name', 'ASC']]
    };
};

const notificationController = {

    // Get available roles with caching
    getRoles: async (req, res) => {
        try{
            const roles = await Role.findAll(getRoleQuery());
            return createSuccessResponse(res, roles);
        }catch(err){ 
            console.error('getRoles error:', err);
            return createErrorResponse(res, 500, 'Failed to fetch roles');
        }
    },

    // Get users by role with pagination support
    getUsersByRole: async (req, res) => {
        try{
            const { roleId } = req.params;
            const { page = 1, limit = 100 } = req.query;
            if(!roleId || !Number.isInteger(Number(roleId))){
                return createErrorResponse(res, 400, 'Valid role ID is required');
            }
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const query  = {
                ...getUsersByRoleQuery(roleId),
                limit: Math.min(parseInt(limit), 500), // Cap at 500
                offset
            };
            const { count, rows: users } = await User.findAndCountAll(query);
            return createSuccessResponse(res, {
                users,
                pagination: {
                    total : count,
                    page  : parseInt(page),
                    limit : parseInt(limit),
                    pages : Math.ceil(count / parseInt(limit))
                }
            });
        }catch(err){
            console.error('getUsersByRole error:', err);
            return createErrorResponse(res, 500, 'Failed to fetch users for role');
        }
    },

    // Optimized search with better performance
    searchUsersByRole: async (req, res) => {
        try{
            const { roleId } = req.params;
            const { q = '' } = req.query;
            if(!roleId || !Number.isInteger(Number(roleId))){
                return createErrorResponse(res, 400, 'Valid role ID is required');
            }
            // Return empty results for very short queries
            if(q.length > 0 && q.trim().length < 2){
                return createSuccessResponse(res, []);
            }
            let whereConditions = {};
            const searchTerm = q.trim();
            if(searchTerm){
                whereConditions[Op.or] = [
                    { name: { [Op.like]: `${searchTerm}%` } }, 
                    { email: { [Op.like]: `${searchTerm}%` } }
                ];
            }
            const query = {
                ...getUsersByRoleQuery(roleId, whereConditions),
                limit: SEARCH_RESULT_LIMIT
            };
            const users = await User.findAll(query);
            return createSuccessResponse(res, users);
        }catch(err){
            console.error('searchUsersByRole error:', err);
            return createErrorResponse(res, 500, 'Failed to search users for role');
        }
    },

    // Cached user count with better performance
    getUserCountByRole: async (req, res) => {
        try{
            const { roleId } = req.params;
            if(!roleId || !Number.isInteger(Number(roleId))){
                return createErrorResponse(res, 400, 'Valid role ID is required');
            }
            const count = await sequelize.query(`
                SELECT COUNT(DISTINCT u.id) as count 
                FROM users u 
                INNER JOIN user_roles ur ON u.id = ur.user_id 
                WHERE ur.role_id = :roleId AND u.status = 1
            `, {
                replacements: { roleId },
                type: sequelize.QueryTypes.SELECT
            });
            return createSuccessResponse(res, { count: parseInt(count[0].count) });
        }catch(err){
            console.error('getUserCountByRole error:', err);
            return createErrorResponse(res, 500, 'Failed to get user count');
        }
    },

    // Optimized notification sending with batching
    sendNotification: async (req, res) => {
        const transaction = await sequelize.transaction();
        try{
            const { role, title, message, sendTo, specificUsers } = req.body;
            // Validate input
            const validation = validateNotificationInput(req.body);
            if(!validation.isValid){
                await transaction.rollback();
                return createErrorResponse(res, 400, 'Validation failed', validation.errors);
            }
            // Get target users based on sendTo type
            let targetUsers = [];
            if(sendTo === 'all'){
                targetUsers = await User.findAll({
                    ...getActiveUsersWithFCMQuery(role),
                    transaction
                });
            }else 
            if(sendTo === 'specific'){
                const userIds = specificUsers.map(user => {
                    return user.value || user.id || user;
                }).filter(id => id && Number.isInteger(Number(id)));
                if(userIds.length === 0){
                    await transaction.rollback();
                    return createErrorResponse(res, 400, 'No valid user IDs provided');
                }
                targetUsers = await User.findAll({
                    ...getActiveUsersWithFCMQuery(role, userIds),
                    transaction
                });
            }
            if(targetUsers.length === 0){
                await transaction.rollback();
                return createErrorResponse(res, 404, 'No eligible users found for notification');
            }
            // Extract and validate FCM tokens
            const validTokens = targetUsers
                .map(user => ({
                    token: user.fcm_token,
                    userId: user.id
                }))
                .filter(({ token }) => token && token.trim() !== '' && token.length > 10);
            if(validTokens.length === 0){
                await transaction.rollback();
                return createErrorResponse(res, 400, 'No valid FCM tokens found for target users');
            }
            // Get role information
            const roleInfo = await Role.findByPk(role, {
                attributes: ['name'],
                transaction
            });
            const roleName    = roleInfo?.name || 'Users';
            const baseMessage = {
                notification: {
                    title: title.trim(),
                    body: message.trim()
                },
                data: {
                    type: 'ROLE_NOTIFICATION',
                    roleId: role.toString(),
                    roleName,
                    message: message.trim(),
                    sendTo,
                    timestamp: new Date().toISOString(),
                    priority: 'NORMAL',
                    action: 'VIEW_NOTIFICATION'
                },
                android: {
                    notification: {
                        channelId: 'general_notifications',
                        priority: 'default',
                        defaultSound: true,
                        defaultVibrateTimings: false,
                        tag: 'role_notification',
                        color: '#007bff'
                    },
                    data: {
                        click_action: 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: `📢 Notification for ${roleName}`,
                                body: message.trim()
                            },
                            sound: 'default',
                            badge: 1,
                            'content-available': 1,
                            category: 'ROLE_NOTIFICATION'
                        }
                    }
                }
            };
            // Send notifications in batches to handle large user lists
            const tokenBatches = [];
            for(let i = 0; i < validTokens.length; i += MAX_FCM_TOKENS_PER_BATCH){
                tokenBatches.push(validTokens.slice(i, i + MAX_FCM_TOKENS_PER_BATCH));
            }
            let totalSuccessCount = 0;
            const invalidTokens = [];
            // Process batches concurrently with rate limiting
            const batchPromises = tokenBatches.map(async (batch, batchIndex) => {
                try{
                    // Add small delay between batches to avoid rate limiting
                    if(batchIndex > 0){
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    const firebaseMessage = {
                        ...baseMessage,
                        tokens: batch.map(({ token }) => token)
                    };
                    const response = await admin.messaging().sendEachForMulticast(firebaseMessage);
                    // Track successful sends
                    const batchSuccessCount = response.responses.filter(resp => resp.success).length;
                    totalSuccessCount += batchSuccessCount;
                    // Identify invalid tokens for cleanup
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            const errorCode = resp.error?.code;
                            if (errorCode === "messaging/invalid-argument" || 
                                errorCode === "messaging/registration-token-not-registered") {
                                invalidTokens.push(batch[idx].userId);
                            }
                            console.error(`Failed to send notification to token ${idx}:`, resp.error?.message);
                        }
                    });
                    return { success: batchSuccessCount, total: batch.length };
                }catch(error){
                    console.error(`Batch ${batchIndex} failed:`, error);
                    return { success: 0, total: batch.length };
                }
            });
            await Promise.all(batchPromises);
            // Clean up invalid tokens in background
            if(invalidTokens.length > 0){
                User.update(
                    { fcm_token: null },
                    { 
                        where: { id: { [Op.in]: invalidTokens } },
                        transaction
                    }
                ).then(() => {
                    console.log(`🗑 Removed ${invalidTokens.length} invalid FCM tokens`);
                }).catch(err => {
                    console.error('Failed to cleanup invalid tokens:', err);
                });
            }
            await transaction.commit();
            if(totalSuccessCount > 0){
                return createSuccessResponse(res, {
                    sent: totalSuccessCount,
                    total: validTokens.length,
                    invalidTokensRemoved: invalidTokens.length
                }, `Notification sent successfully to ${totalSuccessCount} out of ${validTokens.length} users`);
            }else{
                return createErrorResponse(res, 500, 'Failed to send notification to any users');
            }
        }catch(err){
            await transaction.rollback();
            console.error('sendNotification error:', err);
            if(err instanceof ValidationError){
                return createErrorResponse(res, 400, 'Database validation error', 
                    err.errors.reduce((acc, error) => ({ ...acc, [error.path]: error.message }), {}));
            }
            return createErrorResponse(res, 500, 'Failed to send notification', { error: err.message });
        }
    },

    // Get notifications for a user
    getUserNotifications: async (req, res) => {
        try{
            const { user_id } = req.params;
            const { page = 1, limit = 50, unread_only = false } = req.query;
            const offset = (page - 1) * limit;
            const whereClause = {
                user_id: user_id
            };
            if(unread_only === 'true'){
                whereClause.read_status = false;
            }
            const notifications = await Notification.findAndCountAll({
                where   : whereClause,
                order   : [['created_at', 'DESC']],
                limit   : parseInt(limit),
                offset  : parseInt(offset),
                include : [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });
            const unreadCount = await Notification.count({
                where: {
                    user_id: user_id,
                    read_status: false
                }
            });
            res.json({
                success           : true,
                data              : {
                    notifications : notifications.rows,
                    total         : notifications.count,
                    unreadCount   : unreadCount,
                    currentPage   : parseInt(page),
                    totalPages    : Math.ceil(notifications.count / limit)
                }
            });
        }catch(err){
            console.error('Get notifications error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications'
            });
        }
    },

    // Create a new notification
    createNotification: async (req, res) => {
        try{
            const { user_id, title, body, type = 'general', data = {} } = req.body;
            const notification = await Notification.create({
                user_id,
                title,
                body,
                type,
                data
            });
            res.json({
                success: true,
                message: 'Notification created successfully',
                data: notification
            });
        }catch(err){
            console.error('Create notification error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to create notification',
                error: err.message
            });
        }
    },
    
    // Mark notification as read
    markAsRead: async (req, res) => {
        try{
            const { notification_id } = req.params;
            const { user_id } = req.body;
            const notification = await Notification.findOne({
                where: {
                    id: notification_id,
                    user_id: user_id
                }
            });
            if(!notification){
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }
            await notification.update({
                read_status: true,
                updated_at: new Date()
            });
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        }catch(err){
            console.error('Mark as read error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read'
            });
        }
    },

    // Mark all notifications as read for a user
    markAllAsRead: async (req, res) => {
        try{
            const { user_id } = req.body;
            await Notification.update(
                {
                    read_status: true,
                    updated_at: new Date()
                },
                {
                    where: {
                        user_id: user_id,
                        read_status: false
                    }
                }
            );
            res.json({
                success: true,
                message: 'All notifications marked as read'
            });
        }catch(err){
            console.error('Mark all as read error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read'
            });
        }
    },

    // Delete a notification
    deleteNotification: async (req, res) => {
        try{
            const { notification_id } = req.params;
            const { user_id } = req.body;
            const deleted = await Notification.destroy({
                where: {
                    id: notification_id,
                    user_id: user_id
                }
            });
            if(!deleted){
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }
            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        }catch(err){
            console.error('Delete notification error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete notification'
            });
        }
    },

    // Clear all notifications for a user
    clearAllNotifications: async (req, res) => {
        try{
            const { user_id } = req.body;
            await Notification.destroy({
                where: {
                    user_id: user_id
                }
            });
            res.json({
                success: true,
                message: 'All notifications cleared successfully'
            });
        }catch(err){
            console.error('Clear all notifications error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to clear all notifications'
            });
        }
    },

    // Get unread count for a user
    getUnreadCount: async (req, res) => {
        try{
            const { user_id } = req.params;
            const count = await Notification.count({
                where: {
                    user_id: user_id,
                    read_status: false
                }
            });
            res.json({
                success: true,
                data: { unreadCount: count }
            });
        }catch(err){
            console.error('Get unread count error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to get unread count'
            });
        }
    }
};

module.exports = notificationController;