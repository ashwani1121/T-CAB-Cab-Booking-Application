const { User, UserRole, RideRequests, Sos } = require('../models'); 
const { Op }            = require('sequelize');
const admin             = require('firebase-admin');
const FirebaseService   = require('../services/firebase'); 
const rateLimitMap      = new Map();
const RATE_LIMIT_WINDOW = 30000; 
const sosController     = {
   
    // SOS Emergency Notification with duplicate prevention
    sosEmergency: async (req, res) => {
        try{
            const { ride_request_id, latitude, longitude, address } = req.body;
            // Check if user is authenticated
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            // Validate userId
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // RATE LIMITING CHECK
            const now         = Date.now();
            const userKey     = `sos_${userId}`;
            const lastRequest = rateLimitMap.get(userKey);
            if(lastRequest && (now - lastRequest < RATE_LIMIT_WINDOW)){
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000)} seconds before creating another SOS alert`,
                    remainingTime: Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000)
                });
            }
            // Check for existing active SOS for this user
            const existingActiveSos = await Sos.findOne({
                where: {
                    user_id: userId,
                    status: {
                        [Op.in]: ['logged']
                    }
                },
                order: [['created_at', 'DESC']]
            });
            if(existingActiveSos){
                return res.status(409).json({
                    success : false,
                    message : 'You already have an active SOS alert. Please wait for it to be resolved.',
                });
            }
            // If there's a ride_request_id, check for existing SOS for that ride
            if(ride_request_id){
                const existingRideSos = await Sos.findOne({
                    where: {
                        ride_request_id: ride_request_id,
                        status: {
                            [Op.in]: ['logged']
                        }
                    }
                });
                if(existingRideSos){
                    return res.status(409).json({
                        success : false,
                        message : 'An SOS alert already exists for this ride request.'
                    });
                }
            }
            // Validate Ride Request Id
            if(!ride_request_id){
                return res.status(400).json({
                    success: false,
                    message: 'Ride request ID is required'
                });
            }
            // Validate User location
            if(!address || !latitude || !longitude){
                return res.status(400).json({
                    success : false,
                    message : 'SOS Alert must include address, latitude, and longitude.',
                });
            }
            // Parse coordinates
            const parsedLatitude  = parseFloat(latitude);
            const parsedLongitude = parseFloat(longitude);
            if(!isValidCoordinate(parsedLatitude, parsedLongitude)){
                return res.status(400).json({
                    success: false,
                    message: 'SOS Alert location contains invalid coordinates.',
                });
            }
            // Verify that the ride request exists and belongs to the user
            const rideRequest = await RideRequests.findOne({
                where: {
                    id: ride_request_id,
                    user_id: userId
                }
            });
            if(!rideRequest){
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found or does not belong to user'
                });
            }
            // Get user details
            const user = await User.findByPk(userId, {
                attributes: ['id', 'name', 'mobile', 'email']
            });
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Get Driver Details
            let driver = null;
            if(rideRequest.driver_id){
                driver = await User.findByPk(rideRequest.driver_id, {
                    attributes: ['id', 'name', 'mobile', 'email']
                });
            }
            // Generate unique alert_id with timestamp and random component
            const alertId = `sos_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Create SOS record with proper coordinate parsing
            const sosRecord = await Sos.create({
                alert_id        : alertId,
                user_id         : userId, 
                ride_request_id : ride_request_id || null, 
                timestamp       : new Date(),
                latitude        : parsedLatitude,
                longitude       : parsedLongitude,
                address         : address,
                status          : 'logged'
            });
            // Update rate limit map
            rateLimitMap.set(userKey, now);
            // Fetch admin users with FCM token
            const adminUsers = await User.findAll({
                include         : [{ 
                    model       : UserRole, 
                    where       : { 
                        role_id : 1 
                    } 
                }],
                where:{
                    status      : 1,
                    fcm_token   : {
                        [Op.ne] : null
                    }
                }
            });
            if(adminUsers.length === 0){
                return res.status(503).json({ 
                    success: false, 
                    message: 'No admin users available for notification' 
                });
            }
            const tokens = adminUsers.map(u => u.fcm_token).filter(t => !!t);
            if(tokens.length === 0){
                return res.status(503).json({ 
                    success: false, 
                    message: 'No valid FCM tokens found for admin users' 
                });
            }
            // Send notifications with enhanced data
            const message = {
                notification          : {
                    title             : '🚨 EMERGENCY SOS ALERT',
                    body              : `Emergency from ${user.name || 'User'} - Immediate attention required!`
                },
                data                  : {
                    type              : 'SOS_EMERGENCY',
                    sosId             : sosRecord.id.toString(),
                    alertId           : sosRecord.alert_id,
                    timestamp         : new Date().toISOString(),
                    priority          : 'CRITICAL',
                    action            : 'VIEW_SOS',
                    // Passenger info
                    passengerId       : userId.toString(),
                    passengerName     : user.name || 'Unknown User',
                    passengerMobile   : user.mobile || '',
                    passengerLatitude : parsedLatitude.toString(),
                    passengerLongitude: parsedLongitude.toString(),
                    passengerAddress  : address || '',
                    // Driver info 
                    driverId          : driver ? driver.id.toString() : '',
                    driverName        : driver ? (driver.name || 'Unknown Driver') : '',
                    driverMobile      : driver ? (driver.mobile || '') : '',
                    // Ride info 
                    rideId            : ride_request_id ? ride_request_id.toString() : '',
                    pickupAddress     : rideRequest.pickup_address ? rideRequest.pickup_address.toString() : '',
                    rideStarted       : rideRequest.ride_started_at ? rideRequest.ride_started_at.toString() : '',
                },
                tokens                : tokens,
                android               : {
                    notification      : {
                        channelId     : 'emergency_alerts',
                        priority      : 'high',
                        defaultSound  : true,
                        defaultVibrateTimings: true,
                        tag           : 'sos_emergency'
                    }
                },
                apns                  : {
                    payload           : {
                        aps           : {
                            alert     : {
                                title : '🚨 EMERGENCY SOS ALERT',
                                body  : `Emergency from ${user.name || 'User'} - Immediate attention required!`
                            },
                            sound     : 'emergency.wav',
                            badge     : 1,
                            'content-available': 1
                        }
                    }
                }
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            // Cleanup invalid tokens and log results
            const cleanupPromises = response.responses.map(async (resp, idx) => {
                if(!resp.success){
                    const errorCode = resp.error?.code;
                    console.error(`Failed to send SOS notification to token ${idx}:`, resp.error?.message);
                    if(errorCode === "messaging/invalid-argument" || 
                        errorCode === "messaging/registration-token-not-registered"){
                        await User.update(
                            { fcm_token: null },
                            { where: { id: adminUsers[idx].id } }
                        );
                        console.log(`🗑 Removed invalid token for user ${adminUsers[idx].id}`);
                    }
                }
            });
            await Promise.all(cleanupPromises);
            // Count successful sends
            const successCount = response.responses.filter(resp => resp.success).length;
            if(successCount > 0){
                await sosRecord.update({ status: 'logged' });
                res.status(200).json({
                    success: true, 
                    message: "SOS notification sent successfully",
                    data: {
                        sosId: sosRecord.id,
                        alertId: sosRecord.alert_id,
                        status: 'logged'
                    }
                });
            }else{
                await sosRecord.update({ status: 'failed' });
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send SOS notification to any admin!'
                });
            }
        }catch(error){
            console.error('Failed to notify sos:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get all sos with pagination, search, and filters
    getSos: async (req, res) => {
        try{
            const { page = 1, limit = 10, search = '', status = '', sort = 'created_at', order = 'desc' } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success : false,
                    message : "Invalid pagination parameters"
                });
            }
            
            // Validate sort and order
            const validSortFields = ["created_at", "updated_at", "status"];
            const validOrder      = ["asc", "desc"];
            const sortField       = validSortFields.includes(sort) ? sort : "created_at";
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : "DESC";
            const where           = {};
            if(search){
                where[Op.or] = [
                    { '$user.name$': { [Op.like]: `%${search}%` } }, 
                    { '$rideRequest.driver.name$': { [Op.like]: `%${search}%` } }
                ];
            }
            if(status && status !== 'all'){
                where.status = status;
            }
            
            // Fetch SOS records with user and driver information
            const { rows, count } = await Sos.findAndCountAll({
                where,
                include: [
                    {
                        model      : User,
                        as         : 'passenger', 
                        attributes : ['id', 'name', 'email', 'mobile'],
                        required   : false 
                    },
                    {
                        model      : RideRequests,
                        as         : 'rideRequest',
                        attributes : ['id', 'driver_id'],
                        required   : false,
                        include    : [
                            {
                                model      : User,
                                as         : 'driver',
                                attributes : ['id', 'name', 'email', 'mobile'],
                                required   : false
                            }
                        ]
                    }
                ],
                order    : [[sortField, sortOrder]],
                limit    : limitNum,
                offset   : (pageNum - 1) * limitNum,
                distinct : true 
            });
            const formattedData = rows.map(sos => ({
                id            : sos.id,
                user_name     : sos.passenger ? sos.passenger.name : 'Unknown User',
                driver_name   : sos.rideRequest && sos.rideRequest.driver ? sos.rideRequest.driver.name : 'No Driver Assigned',
                status        : sos.status,
                sos_timestamp : sos.created_at
            }));
            res.status(200).json({
                success    : true,
                data       : formattedData,
                total      : count,
                page       : pageNum,
                limit      : limitNum,
                totalPages : Math.ceil(count / limitNum)
            });
        }catch(err){
            console.error("getSos error:", err);
            res.status(500).json({
                success: false,
                message: "Something went wrong. Please try again later!"
            });
        }
    },

    // Get particular detailed ride sos
    getSosById: async (req, res) => {
        try{
            const { id }    = req.params;
            const sosRecord = await Sos.findByPk(id, {
                include: [
                    {
                        model      : User,
                        as         : 'passenger',
                        attributes : ['id', 'name', 'email', 'mobile', 'profile', 'gender'],
                    },
                    {
                        model      : RideRequests,
                        as         : 'rideRequest',
                        attributes : ['id', 'driver_id', 'status', 'pickup_address', 'dropoff_address'],
                        required   : false,
                        include    : [
                            {
                                model      : User,
                                as         : 'driver',
                                attributes : ['id', 'name', 'email', 'mobile', 'gender', 'profile'],
                            }
                        ]
                    }
                ]
            });
            if(!sosRecord){
                return res.status(404).json({
                    success: false,
                    message: "SOS record not found"
                });
            }
            const driver_location = await FirebaseService.getDriverLocation(sosRecord.rideRequest.driver.id);
            res.status(200).json({
                success : true,
                data    : {
                    id                 : sosRecord.id,
                    status             : sosRecord.status,
                    resolved_at        : sosRecord.resolved_at,
                    created_at         : sosRecord.created_at,
                    user               : {
                        name           : sosRecord.passenger?.name || 'Unknown Passenger',
                        mobile         : sosRecord.passenger?.mobile,
                        gender         : sosRecord.passenger?.gender,
                        latitude       : sosRecord.latitude,
                        longitude      : sosRecord.longitude,
                        address        : sosRecord.address
                    },
                    driver             : sosRecord.rideRequest && sosRecord.rideRequest.driver ? {
                        name           : sosRecord.rideRequest.driver.name,
                        mobile         : sosRecord.rideRequest.driver.mobile,
                        gender         : sosRecord.passenger?.gender,
                        latitude       : driver_location.current_latitude,
                        longitude      : driver_location.current_longitude
                    } : null,
                    ride_request       : sosRecord.rideRequest ? {
                        id             : sosRecord.rideRequest.id,
                        status         : sosRecord.rideRequest.status,
                        pickup_address : sosRecord.rideRequest.pickup_address,
                        dropoff_address: sosRecord.rideRequest.dropoff_address
                    } : null,
                }
            });
        }catch(err){
            console.error("getSosById error:", err);
            res.status(500).json({
                success : false,
                message : "Something went wrong. Please try again later!"
            });
        }
    },

    // Update SOS status
    updateSosStatus: async (req, res) => {
        const transaction = await Sos.sequelize.transaction();
        try{
            const { id }             = req.params;
            const { status, reason } = req.body;
            const errors             = {};
            // Validate ID
            if(!id || isNaN(parseInt(id))){
                errors.id = 'Valid SOS ID is required';
            }
            // Validate status
            const validStatuses = ['logged', 'resolved', 'false_alarm'];
            if(!status || !validStatuses.includes(status)){
                errors.status = "Invalid status. Must be 'logged', 'resolved', or 'false alarm'";
            }
            // Validate reason for non-logged status
            if(status !== 'logged' && (!reason || !reason.trim())){
                errors.reason = 'Reason is required when updating SOS status to resolved or false alarm';
            }
            // Check if SOS record exists
            const sosRecord = await Sos.findByPk(id, { transaction });
            if(!sosRecord){
                errors.id = 'SOS record not found';
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            const updateData = { status };
            if(status === 'resolved' || status === 'false_alarm'){
                updateData.resolved_at = new Date();
                updateData.notes = reason.trim();
            }else 
            if(status === 'logged'){
                updateData.resolved_at = null;
                updateData.notes = null;
            }
            await sosRecord.update(updateData, { transaction });
            await transaction.commit();
            return res.status(200).json({
                success : true,
                message : `SOS status updated to ${status}`,
                data    : {
                    id          : sosRecord.id,
                    status      : sosRecord.status,
                    resolved_at : sosRecord.resolved_at,
                    notes       : sosRecord.notes
                },
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateSosStatus error:', err);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },
};

// Helper function to validate Coordinate
function isValidCoordinate(latitude, longitude){
    const isValidLat = typeof latitude === 'number' && !isNaN(latitude) && latitude >= -90 && latitude <= 90;
    const isValidLon = typeof longitude === 'number' && !isNaN(longitude) && longitude >= -180 && longitude <= 180;
    return isValidLat && isValidLon;
}

// Cleanup rate limit map periodically (run every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for(const [key, timestamp] of rateLimitMap.entries()){
        if(now - timestamp > RATE_LIMIT_WINDOW * 2){ // Keep for 2x the window
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

module.exports = sosController;