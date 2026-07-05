const { sequelize, Sequelize, }    = require('../../models');
const { Trips }                    = require('../../models');
const { Vehicletypes }             = require('../../models');
const { Vehicleprices}             = require('../../models');
const { Settings }                 = require('../../models');
const { RideRequests }             = require('../../models'); 
const { Coupon }                   = require('../../models');
const { UserCoupons }              = require('../../models');
const { PromoUsages }              = require('../../models');
const { DriverDetails }            = require('../../models');
const { DriverLocation }           = require('../../models');
const { DriverDeposit }            = require('../../models');
const { User }                     = require('../../models');
const { Role }                     = require('../../models');
const { UserRole }                 = require('../../models');
const { Wallets }                  = require('../../models');
const { WalletTransactions }       = require('../../models');
const { Services }                 = require('../../models');
const { State }                    = require('../../models');
const { Package }                  = require('../../models');
const { ReservationAdvancePayment }= require('../../models');
const { CancellationPolicy }       = require('../../models');
const { Subscription }             = require('../../models');
const { DriverSubscriptions }      = require('../../models');
const { SubscriptionUsageHistory } = require('../../models');
const axios                        = require('axios');
const { Op }                       = require("sequelize");
const FirebaseService              = require('../../services/firebase'); 
const GOOGLE_MAPS_API_KEY          = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL                     = process.env.BASE_URL || 'http://localhost:5000';
const { scheduleRideNotification } = require('../../utils/scheduledRides'); 
const validationUtils              = {

    // USER AUTHENTICATION
    validateUserAuth: async (req, requiredRoleId, roleName) => {
        if(!req.user || !req.user.userId){
            return{
                success: false,
                status: 401,
                message: 'Unauthorized: User not authenticated'
            };
        }
        const user_id = req.user.userId;
        const user    = await User.findByPk(user_id);
        if(!user){
            return{
                success: false,
                status: 404,
                message: 'User not found'
            };
        }
        // Check user role if required
        if(requiredRoleId){
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: user_id,
                    role_id: requiredRoleId 
                },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }]
            });
            if(!userRole){
                return {
                    success: false,
                    status: 403,
                    message: `User is not authorized as a ${roleName}`
                };
            }
        }
        return { success: true, user_id, user };
    },

    // VALIDATE TRIP ID
    validateTrip: async (trip_id) => {
        if(!trip_id || !Number.isInteger(trip_id)){
            return{
                success : false,
                status  : 400,
                message : 'Valid trip ID is required.'
            };
        }
        const trip = await Trips.findOne({
            where: { id: trip_id }
        });
        if(!trip){
            return{
                success : false,
                status  : 404,
                message : 'Invalid trip selected.'
            };
        }
        return { success: true, trip };
    },

    // VALIDATE LOCATION COORDINATES
    isValidCoordinate: (latitude, longitude) => {
        const isValidLat = typeof latitude === 'number' && latitude >= -90 && latitude <= 90;
        const isValidLon = typeof longitude === 'number' && longitude >= -180 && longitude <= 180;
        return isValidLat && isValidLon;
    },

    // VALIDATE PICKUP AND DROP LOCATION FIELDS
    validateLocation: (location, locationName) => {
        if(!location || typeof location !== 'object'){
            return{
                success : false,
                status  : 400,
                message : `${locationName} location is required and must be an object with address, latitude, and longitude.`
            };
        }
        const requiredFields = ['address', 'latitude', 'longitude', 'district', 'state'];
        for(const field of requiredFields){
            if(!location[field]){
                return{
                    success : false,
                    status  : 400,
                    message : `${locationName} location must include ${requiredFields.join(', ')}.`
                };
            }
        }
        if(!validationUtils.isValidCoordinate(location.latitude, location.longitude)){
            return{
                success : false,
                status  : 400,
                message : `${locationName} location contains invalid coordinates.`
            };
        }
        return { success: true };
    },

    // VALIDATE STOP LOCATION FIELDS
    validateStopLocation: (stop, stopName) => {
        if(!stop) return { success: true };
        if(typeof stop !== 'object'){
            return{
                success : false,
                status  : 400,
                message : `${stopName} location must be an object.`
            };
        }
        if(!stop.address || !stop.latitude || !stop.longitude){
            return {
                success : false,
                status  : 400,
                message : `${stopName} location must include address, latitude, and longitude with valid coordinates.`
            };
        }
        if(!validationUtils.isValidCoordinate(stop.latitude, stop.longitude)){
            return {
                success : false,
                status  : 400,
                message : `${stopName} location contains invalid coordinates.`
            };
        }
        return { success: true };
    },

    // VALIDATE BOOKING FOR OTHER PERSON
    validateBookingForOther: (is_booking_for_other, rider_name, rider_mobile, rider_relationship_to_booker) => {
        const isBookingForOther = is_booking_for_other === true || is_booking_for_other === 'true';
        if(!isBookingForOther){
            return { success: true, isBookingForOther: false };
        }
        if(!rider_name || typeof rider_name !== 'string' || rider_name.trim().length < 2){
            return{
                success : false,
                status  : 400,
                message : 'Passenger name is required and must be at least 2 characters long when booking for someone else.'
            };
        }
        if(!rider_mobile || typeof rider_mobile !== 'string'){
            return {
                success : false,
                status  : 400,
                message : 'Passenger mobile number is required when booking for someone else.'
            };
        }
        // Validate mobile number format (Indian format)
        const mobileRegex = /^[6-9]\d{9}$/;
        if(!mobileRegex.test(rider_mobile.replace(/\D/g, ''))){
            return{
                success : false,
                status  : 400,
                message : 'Please enter a valid 10-digit mobile number.'
            };
        }
        // Validate relationship
        const validRelationships = ['self', 'family', 'friend', 'colleague', 'client', 'other'];
        if(rider_relationship_to_booker && !validRelationships.includes(rider_relationship_to_booker)){
            return{
                success : false,
                status  : 400,
                message : 'Invalid relationship type. Must be one of: self, family, friend, colleague, client, other.'
            };
        }
        return { success: true, isBookingForOther: true };
    },

    // VALIDATE DATE AND TIME FORMATS
    validateDateTime: (date, time, fieldName) => {
        if(!date || !time){
            return{
                success : false,
                status  : 400,
                message : `${fieldName} date and time are required.`
            };
        }
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if(!dateRegex.test(date)){
            return {
                success : false,
                status  : 400,
                message : `Invalid ${fieldName.toLowerCase()} date format. Expected format: YYYY-MM-DD.`
            };
        }
        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if(!timeRegex.test(time)){
            return {
                success : false,
                status  : 400,
                message : `Invalid ${fieldName.toLowerCase()} time format. Expected format: HH:MM (24-hour format).`
            };
        }
        return { success: true };
    },

    // VALIDATE SCHEDULING CONSTRAINTS 
    validateScheduling: (pickup_date, pickup_time, trip_id) => {
        const pickupDateTime     = new Date(`${pickup_date}T${pickup_time}:00`);
        const now                = new Date();
        const timeUntilPickup    = pickupDateTime.getTime() - now.getTime();
        const minimumAdvanceTime = 15 * 60 * 1000; // 15 minutes
        // Check if pickup is in the past
        if(timeUntilPickup <= 0){
            return {
                success : false,
                status  : 400,
                message : 'Pickup date and time cannot be in the past.'
            };
        }
        // Check minimum advance booking
        if(timeUntilPickup < minimumAdvanceTime){
            const minutesUntilPickup = Math.round(timeUntilPickup / 1000 / 60);
            return{
                success : false,
                status  : 400,
                message : `Rides must be booked at least 15 minutes in advance. Your selected time is only ${minutesUntilPickup} minutes away.`,
                minimum_advance_minutes : 15,
                current_advance_minutes : minutesUntilPickup
            };
        }
        // Check maximum future date
        const maxFutureDate = new Date();
        const maxDays       = trip_id === 1 ? 15 : 30;
        maxFutureDate.setDate(maxFutureDate.getDate() + maxDays);
        if(pickupDateTime > maxFutureDate){
            return {
                success: false,
                status: 400,
                message: `Pickup date cannot be more than ${maxDays} days in the future.`
            };
        }
        return { success: true };
    },
    
    // VALIDATE STATE AND GET STATE ID
    validateStateAndGetId: async (stateName) => {
        if(!stateName || typeof stateName !== 'string'){
            return{
                success: false,
                message: 'State name is required.'
            };
        }
        try{
            // Try exact match first
            let state = await State.findOne({
                where: { 
                    state_name: stateName.trim(),
                    status: true 
                }
            });
            // If no exact match, try case-insensitive search
            if(!state){
                state = await State.findOne({
                    where: { 
                        state_name: { [Op.like]: stateName.trim() },
                        status: true 
                    }
                });
            }
            if(!state){
                return{
                    success : false,
                    status  : 404,
                    message : `State '${stateName}' not found or inactive.`
                };
            }
            return{ 
                success    : true, 
                status     : 200,
                state_id   : state.id,
                state_name : state.state_name,
                state_code : state.state_code
            };
        }catch(error){
            console.error('State validation error:', error);
            return {
                success: false,
                status: 500,
                message: 'Error validating state information.'
            };
        }
    },

    // VALIDATE VEHICLE TYPE FOR SPECIFIC STATE
    validateVehicleTypeForState: async (vehicle_type_id, state_id, trip_id) => {
        if(!vehicle_type_id || !state_id){
            return {
                success: false,
                message: 'Vehicle type ID and state ID are required.'
            };
        }
        try{
            const vehicleType = await Vehicletypes.findOne({
                where: { 
                    id: vehicle_type_id,
                    status: 1
                },
                include: [{
                    model: Vehicleprices,
                    as: 'prices',
                    where: {
                        status: 1,
                        state_id: state_id,
                        trip_id: trip_id 
                    },
                    required: true
                }],
            });
            if(!vehicleType){
                return {
                    success : false,
                    status  : 404,
                    message : 'Vehicle type not available in the selected state.'
                };
            }
            return { 
                success : true, 
                status  : 200,
                vehicleType
            };
        }catch(error){
            console.error('Vehicle type validation error:', error);
            return {
                success: false,
                status: 500,
                message: 'Error validating vehicle type for state.'
            };
        }
    },

    // ENHANCED LOCATION VALIDATION WITH STATE VERIFICATION
    validateLocationWithState: async (location, locationName) => {
        const basicValidation = validationUtils.validateLocation(location, locationName);
        if(!basicValidation.success){
            return basicValidation;
        }
        const stateValidation = await validationUtils.validateStateAndGetId(location.state);
        if(!stateValidation.success){
            return{
                success: false,
                status : stateValidation.status,
                message: `${locationName} ${stateValidation.message}`
            };
        }
        return{ 
            success    : true,
            status     : stateValidation.status,
            state_id   : stateValidation.state_id,
            state_name : stateValidation.state_name,
            state_code : stateValidation.state_code
        };
    }
};

// Commission Calculation Helper Function
const calculateCommission = (fareAmount, commission, commissionType) => {
    if(!fareAmount || fareAmount <= 0) return 0;
    if(!commission || commission <= 0) return 0;
    if(commissionType === 'percentage'){
        return (fareAmount * commission) / 100;
    }else
    if(commissionType === 'fixed'){
        return commission;
    }
    return 0;
};

// Generates a unique ride number in format: RID-YYYY-NNNNNN Example: RID-2024-000001, RID-2024-000002
const generateRideNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `RID-${year}-`;
    // Get the last ride number for current year
    const lastRide = await RideRequests.findOne({
        where: {
            ride_number: {
                [Op.like]: `${prefix}%`
            }
        },
        order: [['id', 'DESC']],
        attributes: ['ride_number']
    });
    let nextNumber = 1;
    if(lastRide && lastRide.ride_number){
        // Extract the number part and increment
        const lastNumber = parseInt(lastRide.ride_number.split('-')[2]);
        nextNumber = lastNumber + 1;
    }
    // Pad with zeros (6 digits)
    const paddedNumber = String(nextNumber).padStart(6, '0');
    return `${prefix}${paddedNumber}`;
};

// Check if estimated distance is within the vehicle's max_km limit
function filterVehiclesByMaxKm(vehicleTypes, estimatedDistance){
    return vehicleTypes.filter(vehicle => {
        const priceRecord = vehicle.prices && vehicle.prices[0];
        if(!priceRecord){
            console.warn(`No price record found for vehicle ${vehicle.id}`);
            return false;
        }
        // Check max_km from the price record
        if(!priceRecord.max_km || priceRecord.max_km === 0){
            return true; // No limit set
        }
        return estimatedDistance <= priceRecord.max_km;
    });
}

const rideController = {

    // RESERVATION RIDE STARTS
    reservationRideStarts: async(req, res) => {
        let transaction;
        try{
            const { ride_request_id } = req.params;
            // Validate user authentication and role
            const userValidation = await validationUtils.validateUserAuth(req, 3, 'Driver');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id: driver_id } = userValidation;
            // Input validation
            if(!ride_request_id || !Number.isInteger(parseInt(ride_request_id))){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            transaction = await sequelize.transaction();
            // Find and lock the ride request with related data
            const rideRequest = await RideRequests.findOne({
                where: { 
                    id: ride_request_id,
                    driver_id: driver_id,
                    status: 'accepted'  
                },
                lock: true,
                transaction
            });
            // Validate ride exists and belongs to driver
            if(!rideRequest){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found or not assigned to this driver, or not in accepted status'
                });
            }
            // Validate this is a RESERVATION trip (trip_type = 3)
            if(rideRequest.trip_id !== 3){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'This operation is only allowed for reservation trips'
                });
            }
            // Check if reservation already started
            if(rideRequest.is_reservation_started){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Reservation ride has already been started',
                    started_at: rideRequest.reservation_started_at
                });
            }
            const currentTime = new Date();
            // Update ride request with reservation started flag
            await RideRequests.update({
                is_reservation_started: 1,
                reservation_started_at: currentTime,
            }, {
                where: { id: ride_request_id },
                transaction
            });
            await transaction.commit();
            transaction = null;
            res.status(200).json({
                success: true,
                message: 'Reservation ride started successfully'
            });
            // Handle Firebase operations and notifications asynchronously (non-blocking)
            setImmediate(async () => {
                try{
                    await FirebaseService.handleReservationRideStart({
                        ride_request_id,
                        driver_id,
                        user_id: rideRequest.user_id,
                        status: 'reservation_starts',
                        started_at: currentTime.toISOString()
                    });
                }catch(firebaseError){
                    console.error('Firebase operations failed (non-critical):', firebaseError);
                }
            });
        }catch(err){
            if(transaction && !transaction.finished){
                try{
                    await transaction.rollback();
                }catch(rollbackError){
                    console.error('Rollback error:', rollbackError);
                }
            }
            console.error('❌ Reservation Ride Starts Error:', err);
            // Handle specific error types
            if(err.name === 'SequelizeTimeoutError'){
                return res.status(408).json({
                    success: false,
                    message: 'Request timeout. Please try again.',
                    error_code: 'TIMEOUT'
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to start reservation ride. Please try again later!'
            });
        }
    },

    // TRANSFER RESERVATION RIDE BACK TO ADMIN
    transferRide: async(req, res) => {
        let transaction;
        try{
            const { ride_request_id } = req.body;
            // Check admin settings for transfer time window
            const adminSettings = await Settings.findOne({
                where: { role: 'admin' }
            });
            if(!adminSettings){
                return res.status(500).json({
                    success: false,
                    message: 'Admin settings not found'
                });
            }
            // ============================================================
            // 1. VALIDATE TRANSFER TIME WINDOW
            // ============================================================
            const transferFrom = adminSettings.transfer_time_from;
            const transferTo   = adminSettings.transfer_time_to;
            if(!transferFrom || !transferTo){
                return res.status(400).json({
                    success: false,
                    message: 'Transfer time window not configured in admin settings'
                });
            }
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5); // Format: HH:MM
            // Assuming transferFrom <= transferTo (same day window). If overnight needed, adjust logic.
            const isWithinTime = currentTime >= transferFrom && currentTime <= transferTo;
            if(!isWithinTime){
                return res.status(400).json({
                    success: false,
                    message: `Transfer requests are only permitted during the designated time window: ${transferFrom} to ${transferTo}. The current time (${currentTime}) falls outside this period. Please try again later.`
                });
            }
            // ============================================================
            // 2. VALIDATE DRIVER AUTHENTICATION
            // ============================================================
            const userValidation = await validationUtils.validateUserAuth(req, 3, 'Driver');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id: driver_id, user: driver } = userValidation;
            // ============================================================
            // 3. VALIDATE RIDE REQUEST ID
            // ============================================================
            if(!ride_request_id || !Number.isInteger(parseInt(ride_request_id))){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            // ============================================================
            // 4. FETCH AND VALIDATE RIDE REQUEST
            // ============================================================
            const rideRequest = await RideRequests.findOne({
                where: { 
                    id: ride_request_id,
                    driver_id: driver_id
                },
                include: [
                    {
                        model: User,
                        as: 'passenger',
                        attributes: ['id', 'name', 'mobile', 'fcm_token']
                    },
                    {
                        model: Vehicletypes,
                        as: 'vehicleType',
                        attributes: ['id', 'name']
                    }
                ]
            });
            if(!rideRequest){
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found or not assigned to you'
                });
            }
            // ============================================================
            // 5. VALIDATE TRIP TYPE - ONLY RESERVATION TRIPS (trip_id = 3)
            // ============================================================
            if(rideRequest.trip_id !== 3){
                return res.status(400).json({
                    success: false,
                    message: 'Only reservation rides can be transferred to admin'
                });
            }
            // ============================================================
            // 6. VALIDATE RIDE STATUS - ONLY 'accepted' OR 'arrived'
            // ============================================================
            if(!['accepted', 'arrived'].includes(rideRequest.status)){
                return res.status(400).json({
                    success: false,
                    message: `Cannot transfer ride with status "${rideRequest.status}". Only accepted or arrived rides can be transferred.`,
                    current_status: rideRequest.status
                });
            }
            // ============================================================
            // 7. CHECK IF RIDE IS ALREADY STARTED
            // ============================================================
            if(rideRequest.ride_started_at){
                return res.status(400).json({
                    success: false,
                    message: 'Cannot transfer a ride that has already started'
                });
            }
            // ============================================================
            // 8. UPDATE RIDE REQUEST WITH TRANSACTION
            // ============================================================
            transaction = await sequelize.transaction({
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
            });
            const [updatedRows] = await RideRequests.update({
                status                    : 'pending',
                driver_id                 : null,
                is_transferred_to_admin   : true,
                transferred_at            : new Date(),
                transferred_by_driver_id  : driver_id,
                ride_otp                  : null,
                otp_generated_at          : null,
                accepted_at               : null,
                arrived_at                : null,
                driver_distance_at_accept : null
            }, {
                where                     : { 
                    id                    : ride_request_id,
                    driver_id             : driver_id,
                    status                : ['accepted', 'arrived']
                },
                transaction
            });
            if(updatedRows === 0){
                await transaction.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Failed to transfer ride. Ride status may have changed.',
                    error_code: 'TRANSFER_FAILED'
                });
            }
            await transaction.commit();
            transaction = null;
            // ============================================================
            // 9. SEND SUCCESS RESPONSE
            // ============================================================
            res.status(200).json({
                succes          : true,
                message         : 'Reservation ride transferred to admin successfully. Admin will assign a new driver.',
                ride_request_id : ride_request_id,
            });
            // ============================================================
            // 10. SEND NOTIFICATIONS (NON-BLOCKING)
            // ============================================================
            setImmediate(async () => {
                try{
                    const transferNotificationData = {
                        ride_request_id  : ride_request_id,
                        driver_id        : driver_id,
                        driver_name      : driver.name,
                        passenger_name   : rideRequest.passenger.name,
                        passenger_mobile : rideRequest.passenger.mobile,
                        pickup_location  : rideRequest.pickup_address,
                        drop_location    : rideRequest.dropoff_address,
                        vehicle_type     : rideRequest.vehicleType.name,
                        pickup_date      : rideRequest.pickup_date,
                        pickup_time      : rideRequest.pickup_time,
                        estimated_fare   : rideRequest.final_fare,
                        is_custom_trip   : rideRequest.is_custom_trip
                    };
                    // Notify admin about ride transfer
                    const adminNotificationResult = await FirebaseService.sendRideTransferNotificationToAdmin(
                        transferNotificationData
                    );
                    if(adminNotificationResult.success){
                        console.log(`✅ Admin notification sent: ${adminNotificationResult.admins_notified} admins notified`);
                    }else{
                        console.error('❌ Failed to notify admins:', adminNotificationResult.message);
                    }
                    // Notify passenger about ride transfer
                    if(rideRequest.passenger.fcm_token){
                        const passengerNotificationResult = await FirebaseService.sendRideTransferNotificationToPassenger(
                            rideRequest.passenger.fcm_token,
                            transferNotificationData
                        );
                        if(passengerNotificationResult.success){
                            console.log(`✅ Passenger notification sent successfully`);
                        }else{
                            console.error('❌ Failed to notify passenger:', passengerNotificationResult.error);
                        }
                    }else{
                        console.warn('⚠️ Passenger has no FCM token for notification');
                    }
                }catch(notificationError){
                    console.error('❌ Failed to send transfer notifications:', notificationError);
                    // Don't fail the request if notification fails
                }
            });
        }catch(err){
            if(transaction && !transaction.finished){
                try{
                    await transaction.rollback();
                }catch(rollbackError){
                    console.error('❌ Rollback error:', rollbackError);
                }
            }
            console.error('❌ Transfer Reservation Ride error:', err);
            if(err.name === 'SequelizeTimeoutError'){
                return res.status(408).json({
                    success: false,
                    message: 'Request timeout. Please try again.',
                    error_code: 'TIMEOUT'
                });
            }
            if(err.name === 'SequelizeDatabaseError' && err.original?.code === 'ER_LOCK_DEADLOCK'){
                return res.status(409).json({
                    success: false,
                    message: 'Database conflict. Please try again.',
                    error_code: 'DEADLOCK'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                error_code: 'SERVER_ERROR'
            });
        }
    },

    // PACKAGES
    reservePackages: async (req, res) => {
        try{
			const Packages = await Package.findAll({
				attributes: ["id", "name", "km", "status"],
                where: {status : 1},
                order: [['km', 'ASC']] 
			});
            if(!Packages){
				return res.status(404).json({
					success: false,
					message: "No Packages found"
				});
			}
			res.status(200).json({
				success        : true,
                message        : "Reservation Packages",
				data           : Packages
			});
        }catch(err){
            console.error('❌ Reserve Package error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // PRICE LIST
    priceList: async (req, res) => {
        try{
            const { 
                trip_id, 
                package_id, 
                pickup, 
                drop, 
                stop1, 
                stop2, 
                pickup_date, 
                pickup_time,
                custom_km 
            } = req.body;
            // Validate trip
            const tripValidation = await validationUtils.validateTrip(trip_id);
            if(!tripValidation.success){
                return res.status(tripValidation.status).json({
                    success: false,
                    message: tripValidation.message
                });
            }
            // Validate locations
            const pickupValidation = validationUtils.validateLocation(pickup, 'Pickup');
            if(!pickupValidation.success){
                return res.status(pickupValidation.status).json({
                    success: false,
                    message: pickupValidation.message
                });
            }
            const dropValidation = validationUtils.validateLocation(drop, 'Drop-off');
            if(!dropValidation.success){
                return res.status(dropValidation.status).json({
                    success: false,
                    message: dropValidation.message
                });
            }
            // For Round trips
            if(trip_id === 2){
                if(!stop1 && !stop2){
                    return res.status(400).json({
                        success: false,
                        message: 'At least one stop location is required for round-trip.'
                    });
                }
                const stop1Validation = validationUtils.validateStopLocation(stop1, 'Stop1');
                if(!stop1Validation.success){
                    return res.status(stop1Validation.status).json({
                        success: false,
                        message: stop1Validation.message
                    });
                }
                const stop2Validation = validationUtils.validateStopLocation(stop2, 'Stop2');
                if(!stop2Validation.success){
                    return res.status(stop2Validation.status).json({
                        success: false,
                        message: stop2Validation.message
                    });
                }
            }
            // For Reserve trips 
            if(trip_id === 3){
                let calculationKm;
                let packageInfo  = null;
                let isCustomTrip = false;
                // Check if it's a custom trip
                if(custom_km){
                    // Validate custom_km
                    const parsedCustomKm = parseFloat(custom_km);
                    if(isNaN(parsedCustomKm) || parsedCustomKm <= 0){
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid custom km value. Must be a positive number.'
                        });
                    }
                    // Check max km limit for custom trips (1000 km)
                    const MAX_CUSTOM_KM = 1000;
                    if(parsedCustomKm > MAX_CUSTOM_KM){
                        return res.status(400).json({
                            success: false,
                            message: `Custom trip cannot exceed ${MAX_CUSTOM_KM} km. Please contact support for longer trips.`
                        });
                    }
                    calculationKm = parsedCustomKm;
                    isCustomTrip  = true;
                }else 
                if(package_id){
                    // Standard package-based trip
                    // Validate package exists and is active
                    const packageData = await Package.findOne({
                        where: { 
                            id: package_id,
                            status: 1
                        }
                    });
                    if(!packageData){
                        return res.status(404).json({
                            success: false,
                            message: 'Invalid or inactive package selected.'
                        });
                    }
                    calculationKm = packageData.km;
                    packageInfo   = {
                        id        : packageData.id,
                        name      : packageData.name,
                        km_limit  : packageData.km,
                        advance   : packageData.advance,
                    };
                }else{
                    return res.status(400).json({
                        success: false,
                        message: 'Either package_id or custom_km is required for reservation trips.'
                    });
                }
                // Validate locations (already done above, but keeping for clarity)
                const pickupValidation = validationUtils.validateLocation(pickup, 'Pickup');
                if(!pickupValidation.success){
                    return res.status(pickupValidation.status).json({
                        success: false,
                        message: pickupValidation.message
                    });
                }
                const dropValidation = validationUtils.validateLocation(drop, 'Drop-off');
                if(!dropValidation.success){
                    return res.status(dropValidation.status).json({
                        success: false,
                        message: dropValidation.message
                    });
                }
                // Check pickup location service area
                const pickupServiceCheck = await checkLocationInServiceArea(pickup.latitude, pickup.longitude);
                if(!pickupServiceCheck.inServiceArea){
                    return res.status(400).json({
                        success: false,
                        message: 'Pickup location is outside our service area.'
                    });
                }
                let availableVehicleTypeIds = pickupServiceCheck.availableVehicleTypes || [];
                if(availableVehicleTypeIds.length === 0){
                    return res.status(400).json({
                        success: false,
                        message: 'No vehicles are available for service in the selected pickup location.'
                    });
                }
                // Get all available vehicle types for Reserve trip
                const vehicleTypes = await Vehicletypes.findAll({
                    where: { 
                        status: 1,
                        id: { [Op.in]: availableVehicleTypeIds }
                    },
                    include: [{
                        model: Vehicleprices,
                        as: 'prices',
                        where: {
                            trip_id: trip_id,
                            status: 1
                        },
                        required: true
                    }],
                    order: [['capacity', 'ASC']]
                });
                if(!vehicleTypes || vehicleTypes.length === 0){
                    return res.status(404).json({
                        success: false,
                        message: isCustomTrip 
                            ? 'No vehicles available for custom reservation.' 
                            : 'No vehicles available for reservation.'
                    });
                }
                // Calculate pricing for each vehicle type
                const pricing = [];
                for(const vehicle of vehicleTypes){
                    try{
                        const priceRecord = vehicle.prices[0];
                        // Get package km limit for this vehicle type
                        let vehicleKmLimit = null;
                        if(priceRecord.package_id){
                            const vehiclePackage = await Package.findOne({
                                where: { 
                                    id: priceRecord.package_id,
                                    status: 1
                                },
                                attributes: ['km']
                            });
                            if(vehiclePackage){
                                vehicleKmLimit = parseFloat(vehiclePackage.km);
                            }
                        }
                        // For custom trips, skip vehicles where custom km exceeds vehicle's package km limit
                        if(isCustomTrip && vehicleKmLimit && calculationKm > vehicleKmLimit){
                            console.log(`Skipping vehicle ${vehicle.name} - custom km (${calculationKm}) exceeds vehicle limit (${vehicleKmLimit})`);
                            continue;
                        }
                        // Use calculationKm (either from package or custom input)
                        const fareBreakdown = calculateReservationFare(
                            calculationKm,  // Use the determined km value
                            0,              
                            trip_id,
                            vehicle,
                            pickup_date,
                            pickup_time,
                            pickupValidation.state,
                            dropValidation.state
                        );
                        const finalPrice   = fareBreakdown.totalWithBataAndGst || fareBreakdown.totalRideFare || 0;
                        const roundedPrice = Math.round(finalPrice);
                        const vehicleData  = {
                            vehicleId      : vehicle.id,
                            name           : vehicle.name,
                            description    : vehicle.description,
                            image          : vehicle.image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.image}` : null,
                            mapImage       : vehicle.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.map_image}` : null,
                            animation      : vehicle.animation ? `${BASE_URL}/uploads/vehicle-types/${vehicle.animation}` : null,
                            capacity       : vehicle.capacity,
                            price          : roundedPrice
                        };
                        pricing.push(vehicleData);
                    }catch(error){
                        console.error(`Error calculating fare for vehicle ${vehicle.name}:`, error);
                        continue;
                    }
                }
                if(pricing.length === 0){
                    return res.status(404).json({
                        success: false,
                        message: 'No vehicles available for the selected package.'
                    });
                }
                return res.status(200).json({
                    success  : true,
                    message  : isCustomTrip ? 'Vehicle list and pricing calculated successfully for custom reservation.' : 'Vehicle list and pricing calculated successfully for reservation.',
                    vehicles : pricing
                });
            }
            // Check pickup location service area
            const pickupServiceCheck = await checkLocationInServiceArea(pickup.latitude, pickup.longitude);
            if(!pickupServiceCheck.inServiceArea){
                return res.status(400).json({
                    success: false,
                    message: 'Pickup location is outside our service area.'
                });
            }
            let availableVehicleTypeIds = pickupServiceCheck.availableVehicleTypes || [];
            if(availableVehicleTypeIds.length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'No vehicles are available for service in the selected pickup location.'
                });
            }
            // Check admin settings for "Book Any Vehicle" option
            const adminSettings = await Settings.findOne({
                where: { role: 'admin' }
            });
            const bookAnyVehicleEnabled = adminSettings?.book_any_vehicle === 'show';
            // Get available vehicle types with outstation_km
            const vehicleTypes = await Vehicletypes.findAll({
                where: { 
                    status: 1,
                    id: { [Op.in]: availableVehicleTypeIds }
                },
                include: [{
                    model: Vehicleprices,
                    as: 'prices',
                    where: {
                        trip_id: trip_id,
                        status: 1
                    },
                    required: true
                }],
                order: [['capacity', 'ASC']] 
            });
            if(!vehicleTypes || vehicleTypes.length === 0){
                return res.status(404).json({
                    success: false,
                    message: 'No vehicles available.'
                });
            }
            // Calculate initial distance to determine trip types for each vehicle
            const quickEstimate = await calculateInitialEstimates(
                pickup, drop, stop1, stop2, trip_id, null, vehicleTypes[0], 
                pickup_date, pickup_time, null, null, null, null 
            );
            if(!quickEstimate || !quickEstimate.success || !quickEstimate.breakdown){
                return res.status(503).json({
                    success: false,
                    message: 'Unable to calculate route estimates. Please try again later.',
                    error: quickEstimate?.error || 'Estimates calculation failed'
                });
            }
            const estimatedDistance = quickEstimate.breakdown.distance;
            // Calculate pricing for each vehicle type
            const pricing       = [];
            let validPrices     = [];
            let anyVehicleError = null;
            for(const vehicle of vehicleTypes){
                try{
                    const priceRecord = vehicle.prices[0];
                    // Skip vehicle if distance exceeds max_km limit (max_km = 0 means no restriction)
                    if(priceRecord.max_km && priceRecord.max_km > 0 && estimatedDistance > priceRecord.max_km){
                        continue;
                    }
                    // Determine trip type for this specific vehicle
                    const vehicleTripType = await determineTripType(estimatedDistance, vehicle);
                    // Check drop location service area for intercity trips
                    if(vehicleTripType === 1){
                        const dropServiceCheck = await checkLocationInServiceArea(drop.latitude, drop.longitude);
                        if(!dropServiceCheck.inServiceArea){
                            pricing.push({
                                vehicleId   : vehicle.id,
                                name        : vehicle.name,
                                description : vehicle.description,
                                image       : vehicle.image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.image}` : null,
                                mapImage    : vehicle.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.map_image}` : null,
                                animation   : vehicle.animation ? `${BASE_URL}/uploads/vehicle-types/${vehicle.animation}` : null,
                                capacity    : vehicle.capacity,
                                price       : null
                            });
                            continue;
                        }
                        const dropVehicleTypes = dropServiceCheck.availableVehicleTypes || [];
                        if(!dropVehicleTypes.includes(vehicle.id)){
                            pricing.push({
                                vehicleId   : vehicle.id,
                                name        : vehicle.name,
                                description : vehicle.description,
                                image       : vehicle.image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.image}` : null,
                                mapImage    : vehicle.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.map_image}` : null,
                                animation   : vehicle.animation ? `${BASE_URL}/uploads/vehicle-types/${vehicle.animation}` : null,
                                capacity    : vehicle.capacity,
                                price       : null
                            });
                            continue;
                        }
                    }
                    const estimatesResult = await calculateInitialEstimates(
                        pickup, drop, stop1, stop2, trip_id, vehicleTripType, vehicle, 
                        pickup_date, pickup_time, null, null, null, null
                    );
                    if(!estimatesResult || !estimatesResult.success || !estimatesResult.breakdown){
                        pricing.push({
                            vehicleId   : vehicle.id,
                            name        : vehicle.name,
                            description : vehicle.description,
                            image       : vehicle.image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.image}` : null,
                            mapImage    : vehicle.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.map_image}` : null,
                            animation   : vehicle.animation ? `${BASE_URL}/uploads/vehicle-types/${vehicle.animation}` : null,
                            capacity    : vehicle.capacity,
                            price       : null
                        });
                        continue;
                    }
                    const fareBreakdown = estimatesResult.breakdown;
                    const finalPrice    = fareBreakdown.totalWithBataAndGst || fareBreakdown.totalRideFare || 0;
                    const roundedPrice  = Math.round(finalPrice);
                    pricing.push({
                        vehicleId           : vehicle.id,
                        name                : vehicle.name,
                        description         : vehicle.description,
                        image               : vehicle.image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.image}` : null,
                        mapImage            : vehicle.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.map_image}` : null,
                        animation           : vehicle.animation ? `${BASE_URL}/uploads/vehicle-types/${vehicle.animation}` : null,
                        capacity            : vehicle.capacity,
                        price               : roundedPrice, 
                    });
                    validPrices.push(roundedPrice);
                }catch(error){
                    console.error(`Error calculating fare for vehicle ${vehicle.name}:`, error);
                    pricing.push({
                        vehicleId   : vehicle.id,
                        name        : vehicle.name,
                        description : vehicle.description,
                        image       : vehicle.image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.image}` : null,
                        mapImage    : vehicle.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicle.map_image}` : null,
                        animation   : vehicle.animation ? `${BASE_URL}/uploads/vehicle-types/${vehicle.animation}` : null,
                        capacity    : vehicle.capacity,
                        price       : null
                    });
                    anyVehicleError = 'Some vehicles failed to calculate pricing';
                }
            }
            // Check if no valid vehicles found after processing
            if(validPrices.length === 0){
                return res.status(404).json({
                    success: false,
                    message: 'No vehicles available for the selected route. This may be due to distance restrictions or service area limitations.'
                });
            }
            // Add "Book Any Vehicle" option if enabled
            if(bookAnyVehicleEnabled && vehicleTypes.length > 0 && validPrices.length > 0){
                const minPrice = Math.min(...validPrices);
                const maxPrice = Math.max(...validPrices);
                const anyVehicleOption = {
                    vehicleId    : 'any',
                    name         : 'Book Any',
                    description  : 'System will assign best available vehicle',
                    image        : null,
                    mapImage     : null,
                    animation    : null,
                    capacity     : Math.max(...vehicleTypes.map(v => v.capacity)),
                    minPrice     : minPrice,
                    maxPrice     : maxPrice,
                    price        : minPrice,
                    priceRange   : `₹${minPrice} - ₹${maxPrice}`,
                    isAnyVehicle : true
                };
                if(anyVehicleError){
                    anyVehicleOption.error = anyVehicleError;
                }
                pricing.unshift(anyVehicleOption);
            }
            // Calculate route information
            const routeInfo = await calculateRouteInfo(pickup, drop, stop1, stop2);
            return res.status(200).json({
                success                : true,
                message                : 'Vehicle list and pricing calculated successfully.',
                data                   : {
                    trip_id            : trip_id,
                    trip_name          : getTripTypeName(trip_id),
                    estimated_distance : estimatedDistance,
                    locations          : {
                        pickup         : { latitude: pickup.latitude, longitude: pickup.longitude },
                        drop           : { latitude: drop.latitude, longitude: drop.longitude },
                        ...(stop1 && { stop1: { latitude: stop1.latitude, longitude: stop1.longitude } }),
                        ...(stop2 && { stop2: { latitude: stop2.latitude, longitude: stop2.longitude } })
                    },
                    route              : routeInfo,
                    vehicles           : pricing
                }
            });
        }catch(err){
            console.error('priceList error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // RIDE REQUEST
    requestRide: async (req, res) => {
        try{
            const { 
                trip_id, 
                vehicle_type_id, 
                package_id,             
                advance_payment_id,
                custom_km,              
                custom_days,            
                coupon_code, 
                pickup, 
                drop, 
                stop1, 
                stop2, 
                special_instructions,
                payment_method, 
                pickup_date, 
                pickup_time, 
                is_booking_for_other,
                rider_name,
                rider_mobile,
                rider_relationship_to_booker,
                is_scheduled 
            } = req.body;

            console.log("Testing date");
            console.log(pickup_date,pickup_time);

            // Normalize is_scheduled to boolean
            const isScheduledRequest = is_scheduled === true || is_scheduled === 'true';

            // ============================================================
            // 1. VALIDATE USER AUTHENTICATION AND ROLE
            // ============================================================
            const userValidation = await validationUtils.validateUserAuth(req, 2, 'User');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id, user } = userValidation;

            // ============================================================
            // 2. VALIDATE TRIP TYPE
            // ============================================================
            const tripValidation = await validationUtils.validateTrip(trip_id);
            if(!tripValidation.success){
                return res.status(tripValidation.status).json({
                    success: false,
                    message: tripValidation.message
                });
            }

            // ============================================================
            // 3. DETECT CUSTOM TRIP AND SET FLAGS
            // ============================================================
            const isCustomTrip = trip_id === 3 && (custom_km || custom_days);
            const isStandardReservation = trip_id === 3 && !isCustomTrip;

            // ============================================================
            // 4. CUSTOM TRIP SPECIFIC VALIDATIONS
            // ============================================================
            if(isCustomTrip){
                // Custom trips cannot use "Book Any Vehicle"
                if(vehicle_type_id === 'any'){
                    return res.status(400).json({
                        success: false,
                        message: 'Book Any Vehicle option is not available for custom reservation trips. Please select a specific vehicle type.'
                    });
                }
                // Validate custom_km
                if(!custom_km){
                    return res.status(400).json({
                        success: false,
                        message: 'Custom kilometers (custom_km) is required for custom reservation trips.'
                    });
                }
                const parsedCustomKm = parseFloat(custom_km);
                if(isNaN(parsedCustomKm) || parsedCustomKm <= 0){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid custom km value. Must be a positive number.'
                    });
                }
                const MAX_CUSTOM_KM = 1000;
                if(parsedCustomKm > MAX_CUSTOM_KM){
                    return res.status(400).json({
                        success: false,
                        message: `Custom trip cannot exceed ${MAX_CUSTOM_KM} km. Please contact support for longer trips.`
                    });
                }
                // Validate custom_days
                if(!custom_days){
                    return res.status(400).json({
                        success: false,
                        message: 'Number of days (custom_days) is required for custom reservation trips.'
                    });
                }
                const parsedCustomDays = parseInt(custom_days);
                if(isNaN(parsedCustomDays) || parsedCustomDays <= 0){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid custom days value. Must be a positive integer.'
                    });
                }
                const MAX_CUSTOM_DAYS = 30;
                if(parsedCustomDays > MAX_CUSTOM_DAYS){
                    return res.status(400).json({
                        success: false,
                        message: `Custom trip cannot exceed ${MAX_CUSTOM_DAYS} days. Please contact support for longer trips.`
                    });
                }
                // Pickup date/time mandatory for custom trips
                if(!pickup_date || !pickup_time){
                    return res.status(400).json({
                        success: false,
                        message: 'Pickup date and time are required for custom reservation trips.'
                    });
                }
            }

            // ============================================================
            // 5. STANDARD RESERVATION - ADVANCE PAYMENT VALIDATION 
            // ============================================================
            let advancePaymentRecord = null;
            let packageData          = null;
            if(isStandardReservation){
                // Standard Reservation Trips Cannot Be "Book Any Vehicle"
                if(vehicle_type_id === 'any'){
                    return res.status(400).json({
                        success: false,
                        message: 'Book Any Vehicle option is not available for reservation trips. Please select a specific vehicle type.'
                    });
                }
                // Standard Reservation Trips Cannot Be Scheduled
                if(isScheduledRequest){
                    return res.status(400).json({
                        success: false,
                        message: 'Scheduling is not available for standard reservation trips. Reservations are always immediate.'
                    });
                }
                // VALIDATE PACKAGE_ID
                if(!package_id){
                    return res.status(400).json({
                        success: false,
                        message: 'Package ID is required for standard reservation trips.'
                    });
                }
                // For standard reservation trips, advance payment is MANDATORY
                if(!advance_payment_id){
                    return res.status(400).json({
                        success: false,
                        message: "Advance payment is required for standard reservation trips. Please complete payment first.",
                        requires_advance_payment: true
                    });
                }
                // Fetch and validate advance payment record
                advancePaymentRecord = await ReservationAdvancePayment.findOne({
                    where: { 
                        id: advance_payment_id,
                        user_id: user_id
                    }
                });
                if(!advancePaymentRecord){
                    return res.status(404).json({
                        success: false,
                        message: "Advance payment record not found or does not belong to you."
                    });
                }
                // Check if payment is successful
                if(advancePaymentRecord.payment_status !== 'success'){
                    return res.status(400).json({
                        success          : false,
                        message          : `Advance payment is ${advancePaymentRecord.payment_status}. Please complete payment first.`,
                        payment_status   : advancePaymentRecord.payment_status,
                        requires_payment : true
                    });
                }
                // Check if advance payment is already used
                if(advancePaymentRecord.status === 'used'){
                    return res.status(400).json({
                        success        : false,
                        message        : "This advance payment has already been used for another ride.",
                        already_used   : true,
                        linked_ride_id : advancePaymentRecord.ride_request_id
                    });
                }
                // Check if advance payment is expired (24 hours validity)
                if(advancePaymentRecord.expires_at && new Date() > new Date(advancePaymentRecord.expires_at)){
                    return res.status(400).json({
                        success    : false,
                        message    : "This advance payment has expired. Please make a new payment.",
                        expired    : true,
                        expired_at : advancePaymentRecord.expires_at
                    });
                }
                // Verify package_id matches the payment record
                if(advancePaymentRecord.package_id !== package_id){
                    return res.status(400).json({
                        success             : false,
                        message             : "Package ID does not match the advance payment record.",
                        expected_package_id : advancePaymentRecord.package_id,
                        provided_package_id : package_id
                    });
                }
                // Verify vehicle_type_id matches the payment record
                if(advancePaymentRecord.vehicle_type_id !== vehicle_type_id){
                    return res.status(400).json({
                        success                  : false,
                        message                  : "Vehicle type does not match the advance payment record.",
                        expected_vehicle_type_id : advancePaymentRecord.vehicle_type_id,
                        provided_vehicle_type_id : vehicle_type_id
                    });
                }
                // Get and validate package data
                packageData = await Package.findOne({
                    where: { 
                        id: package_id,
                        status: 1 
                    }
                });
                if(!packageData){
                    return res.status(404).json({
                        success: false,
                        message: "Invalid or inactive package selected."
                    });
                }
            }

            // ============================================================
            // 6. VALIDATE LOCATIONS WITH STATE VERIFICATION
            // ============================================================
            const pickupValidation = await validationUtils.validateLocationWithState(pickup, 'Pickup');
            if(!pickupValidation.success){
                return res.status(pickupValidation.status).json({
                    success: false,
                    message: pickupValidation.message
                });
            }
            const dropValidation = await validationUtils.validateLocationWithState(drop, 'Drop-off');
            if(!dropValidation.success){
                return res.status(dropValidation.status).json({
                    success: false,
                    message: dropValidation.message
                });
            }
            // Store state information
            const pickup_state_id  = pickupValidation.state_id;
            const dropoff_state_id = dropValidation.state_id;
            const is_interstate    = pickup_state_id !== dropoff_state_id;

            // ============================================================
            // 7. VALIDATE BOOKING FOR OTHER PERSON
            // ============================================================
            const bookingValidation = validationUtils.validateBookingForOther(
                is_booking_for_other, rider_name, rider_mobile, rider_relationship_to_booker
            );
            if(!bookingValidation.success){
                return res.status(bookingValidation.status).json({
                    success: false,
                    message: bookingValidation.message
                });
            }
            const { isBookingForOther } = bookingValidation;

            // ============================================================
            // 8. VALIDATE VEHICLE TYPE
            // ============================================================
            const isBookAnyVehicle    = vehicle_type_id === 'any';
            let selectedVehicleTypeId = vehicle_type_id;
            if(!isBookAnyVehicle){
                const vehicleStateValidation = await validationUtils.validateVehicleTypeForState(
                    vehicle_type_id, pickup_state_id, trip_id
                );
                if(!vehicleStateValidation.success){
                    return res.status(vehicleStateValidation.status).json({
                        success: false,
                        message: vehicleStateValidation.message
                    });
                }
            }
            // Check admin settings for "Book Any Vehicle" option
            const adminSettings = await Settings.findOne({
                where: { role: 'admin' }
            });
            const bookAnyVehicleEnabled = adminSettings?.book_any_vehicle === 'show';
            if(isBookAnyVehicle && !bookAnyVehicleEnabled){
                return res.status(400).json({
                    success: false,
                    message: 'Book Any Vehicle option is currently disabled.'
                });
            }

            // ============================================================
            // 9. VALIDATE OPTIONAL STOPS
            // ============================================================
            let stop1_state_id = null;
            let stop2_state_id = null;
            if(stop1){
                const stop1Validation = await validationUtils.validateLocationWithState(stop1, 'Stop1');
                if(!stop1Validation.success){
                    return res.status(stop1Validation.status).json({
                        success: false,
                        message: stop1Validation.message
                    });
                }
                stop1_state_id = stop1Validation.state_id;
            }
            if(stop2){
                const stop2Validation = await validationUtils.validateLocationWithState(stop2, 'Stop2');
                if(!stop2Validation.success){
                    return res.status(stop2Validation.status).json({
                        success: false,
                        message: stop2Validation.message
                    });
                }
                stop2_state_id = stop2Validation.state_id;
            }

            // ============================================================
            // 10. ROUND-TRIP VALIDATION
            // ============================================================
            if(trip_id === 2){
                if(!stop1 && !stop2){
                    return res.status(400).json({
                        success: false,
                        message: 'At least one stop location must be provided for round-trip.'
                    });
                }
            }

            // ============================================================
            // 11. SCHEDULING VALIDATIONS
            // ============================================================
            const needsScheduling = ((trip_id === 1 && isScheduledRequest) || isCustomTrip || isStandardReservation);
            if(needsScheduling){
                const dateTimeValidation = validationUtils.validateDateTime(pickup_date, pickup_time, 'Pickup');
                if(!dateTimeValidation.success){
                    return res.status(dateTimeValidation.status).json({
                        success: false,
                        message: dateTimeValidation.message
                    });
                }
                if(!isCustomTrip){
                    const schedulingValidation = validationUtils.validateScheduling(
                        pickup_date, pickup_time, trip_id
                    );
                    if(!schedulingValidation.success){
                        return res.status(schedulingValidation.status).json(schedulingValidation);
                    }
                }
            }

            // ============================================================
            // 12. GET AVAILABLE VEHICLE TYPES
            // ============================================================
            let allAvailableVehicleTypes = [];
            if(trip_id === 3){
                if(isCustomTrip){
                    // For custom trips, get vehicles without package constraint
                    allAvailableVehicleTypes = await Vehicletypes.findAll({
                        where: { 
                            id: vehicle_type_id,
                            status: 1
                        },
                        include: [{
                            model: Vehicleprices,
                            as: 'prices',
                            where: {
                                trip_id: trip_id,
                                status: 1,
                                state_id: pickup_state_id
                            },
                            required: true
                        }]
                    });
                }else{
                    // For standard reservation trips, get vehicles with package pricing
                    allAvailableVehicleTypes = await Vehicletypes.findAll({
                        where: { 
                            id: vehicle_type_id,
                            status: 1
                        },
                        include: [{
                            model: Vehicleprices,
                            as: 'prices',
                            where: {
                                trip_id: trip_id,
                                package_id: package_id,
                                status: 1,
                                state_id: pickup_state_id
                            },
                            required: true
                        }]
                    });
                }
            }else{
                // For other trips
                if(isBookAnyVehicle){
                    allAvailableVehicleTypes = await Vehicletypes.findAll({
                        where: { status: 1 },
                        include: [{
                            model: Vehicleprices,
                            as: 'prices',
                            where: {
                                trip_id: trip_id,
                                status: 1,
                                state_id: pickup_state_id
                            },
                            required: true
                        }],
                        order: [['capacity', 'ASC']]
                    });
                }else{
                    allAvailableVehicleTypes = await Vehicletypes.findAll({
                        where: { 
                            id: vehicle_type_id,
                            status: 1
                        },
                        include: [{
                            model: Vehicleprices,
                            as: 'prices',
                            where: {
                                trip_id: trip_id,
                                status: 1,
                                state_id: pickup_state_id
                            },
                            required: true
                        }]
                    });
                }
            }
            if(!allAvailableVehicleTypes || allAvailableVehicleTypes.length === 0){
                return res.status(404).json({
                    success: false,
                    message: isCustomTrip 
                        ? 'The selected vehicle type is not available for custom reservation trips in your state.'
                        : 'The selected vehicle type is not available for the chosen state.',
                });
            }
            if(allAvailableVehicleTypes[0].prices.length === 0){
                return res.status(404).json({
                    success: false,
                    message: 'No pricing configured for the selected vehicle type in this state.',
                });
            }

            // ============================================================
            // 13. CHECK PICKUP LOCATION SERVICE AREA (Skip for custom trips)
            // ============================================================
            if(!isCustomTrip){
                const pickupServiceCheck = await checkLocationInServiceArea(pickup.latitude, pickup.longitude);
                if(!pickupServiceCheck.inServiceArea){
                    return res.status(400).json({
                        success: false,
                        message: 'Pickup location is outside our service area.'
                    });
                }
            }

            // ============================================================
            // 14. CALCULATE ESTIMATES AND SELECT VEHICLE
            // ============================================================
            let vehicleType     = null;
            let trip_type       = null;
            let fareBreakdown   = null;
            let calculationKm   = null;
            let calculationDays = null;
            if(trip_id === 3){
                vehicleType           = allAvailableVehicleTypes[0];
                selectedVehicleTypeId = vehicleType.id;
                trip_type             = 2; // Outstation for reservation trips
                if(isCustomTrip){
                    // Use custom km and days
                    calculationKm     = parseFloat(custom_km);
                    calculationDays   = parseInt(custom_days);
                    fareBreakdown     = calculateReservationFare(
                        calculationKm,
                        calculationDays,
                        trip_id,
                        vehicleType,
                        pickup_date,
                        pickup_time,
                        pickupValidation.state,
                        dropValidation.state
                    );
                }else{
                    // Use package km
                    calculationKm   = packageData.km;
                    calculationDays = 0;
                    fareBreakdown   = calculateReservationFare(
                        calculationKm,
                        calculationDays,
                        trip_id,
                        vehicleType,
                        pickup_date,
                        pickup_time,
                        pickupValidation.state,
                        dropValidation.state
                    );
                }
            }else{
                // For other trips, calculate based on actual distance
                const quickEstimate = await calculateInitialEstimates(
                    pickup, drop, stop1, stop2, trip_id, null, allAvailableVehicleTypes[0],
                    pickup_date, pickup_time, null, null
                );
                if(!quickEstimate || !quickEstimate.success || !quickEstimate.breakdown){
                    return res.status(503).json({
                        success: false,
                        message: 'Unable to calculate route estimates. Please try again later.',
                        error: quickEstimate?.error || 'Estimates calculation failed'
                    });
                }
                const estimatedDistance = quickEstimate.breakdown.distance;
                // Handle Book Any Vehicle logic or specific vehicle selection
                if(isBookAnyVehicle){
                    const availableVehicleTypes = filterVehiclesByMaxKm(allAvailableVehicleTypes, estimatedDistance);
                    if(availableVehicleTypes.length === 0){
                        return res.status(400).json({
                            success: false,
                            message: `No vehicles available for the estimated distance of ${estimatedDistance.toFixed(2)} km.`,
                            estimated_distance: parseFloat(estimatedDistance.toFixed(2))
                        });
                    }
                    vehicleType           = availableVehicleTypes[0];
                    selectedVehicleTypeId = vehicleType.id;
                }else{
                    vehicleType           = allAvailableVehicleTypes[0];
                    const priceRecord     = vehicleType.prices[0];
                    // Validate distance doesn't exceed max_km
                    if(priceRecord.max_km && priceRecord.max_km > 0 && estimatedDistance > priceRecord.max_km){
                        return res.status(400).json({
                            success: false,
                            message: `The selected vehicle type "${vehicleType.name}" cannot handle trips longer than ${priceRecord.max_km} km. Your estimated trip distance is ${estimatedDistance.toFixed(2)} km.`,
                            estimated_distance: parseFloat(estimatedDistance.toFixed(2)),
                            vehicle_max_km: priceRecord.max_km
                        });
                    }
                }
                // Determine trip type
                trip_type = await determineTripType(estimatedDistance, vehicleType);
                // Check drop location for intercity trips
                if(trip_type === 1){
                    const dropServiceCheck = await checkLocationInServiceArea(drop.latitude, drop.longitude);
                    if(!dropServiceCheck.inServiceArea){
                        return res.status(400).json({
                            success: false,
                            message: 'Drop-off location is outside our service area for intercity trips.'
                        });
                    }
                }
                // Calculate final estimates
                const estimatesResult = await calculateInitialEstimates(
                    pickup, drop, stop1, stop2, trip_id, trip_type, vehicleType,
                    pickup_date, pickup_time, null, null
                );
                if(!estimatesResult || !estimatesResult.success || !estimatesResult.breakdown){
                    return res.status(503).json({
                        success: false,
                        message: 'Unable to calculate route estimates. Please try again later.'
                    });
                }
                fareBreakdown = estimatesResult.breakdown;
            }

            // ============================================================
            // 15. HANDLE COUPON IF PROVIDED (Not for custom trips)
            // ============================================================
            let coupon_id       = null;
            let discount_amount = 0;
            let final_fare      = fareBreakdown.totalWithBataAndGst;
            if(coupon_code && !isCustomTrip){
                const couponResult = await validateAndApplyCoupon(
                    coupon_code, 
                    user_id, 
                    fareBreakdown.totalWithBataAndGst, 
                    trip_type, 
                    selectedVehicleTypeId, 
                    fareBreakdown.distance
                );
                if(!couponResult.success){
                    return res.status(400).json({
                        success: false,
                        message: couponResult.message
                    });
                }
                coupon_id       = couponResult.coupon_id;
                discount_amount = couponResult.discount_amount;
                final_fare      = fareBreakdown.totalWithBataAndGst - discount_amount;
            }

            // ============================================================
            // 16. PROCESS PENDING CANCELLATION CHARGES
            // ============================================================
            const pendingChargeResult = await processPendingCancellationCharges(user_id, final_fare, null);
            if(!pendingChargeResult.success){
                if(pendingChargeResult.blocked && pendingChargeResult.error === 'PENDING_CHARGES_EXCEED_LIMIT'){
                    return res.status(403).json({
                        success: false,
                        blocked: true,
                        message: pendingChargeResult.message,
                        details: {
                            pending_cancellation_charge: pendingChargeResult.pendingAmount,
                            threshold: 2000,
                            payment_required: true
                        }
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: 'Failed to process pending charges. Please try again.'
                });
            }
            if(pendingChargeResult.hasPendingCharges){
                final_fare = pendingChargeResult.adjustedFare;
            }

            // ============================================================
            // 17. CALCULATE ADVANCE PAYMENT ADJUSTMENTS 
            // ============================================================
            let advance_paid_amount   = 0;
            let remaining_fare_to_pay = final_fare;
            if(advancePaymentRecord){
                advance_paid_amount   = parseFloat(advancePaymentRecord.advance_amount);
                remaining_fare_to_pay = final_fare - advance_paid_amount;
                // Ensure remaining fare is not negative
                if(remaining_fare_to_pay < 0){
                    remaining_fare_to_pay = 0;
                }
            }
            // Enhanced fare breakdown with advance payment info
            const enhancedFareBreakdown = {
                ...fareBreakdown,
                pending_cancellation_charge: pendingChargeResult.appliedCharge || 0,
                subtotal_before_cancellation: fareBreakdown.totalWithBataAndGst,
                final_total: final_fare,
                advance_paid: advance_paid_amount,
                remaining_to_pay: remaining_fare_to_pay,
                fareBreakdown: {
                    ...fareBreakdown.fareBreakdown,
                    pendingCancellationCharge: '₹' + (pendingChargeResult.appliedCharge || 0).toFixed(2),
                    subtotalBeforeCancellation: '₹' + fareBreakdown.totalWithBataAndGst.toFixed(2),
                    advancePaid: '₹' + advance_paid_amount.toFixed(2),
                    remainingToPay: '₹' + remaining_fare_to_pay.toFixed(2),
                    finalTotal: '₹' + final_fare.toFixed(2)
                },
                pickup_state_id,
                dropoff_state_id,
                is_interstate,
                stop1_state_id,
                stop2_state_id,
                ...(isCustomTrip && {
                    custom_km: calculationKm,
                    custom_days: calculationDays
                })
            };

            // ============================================================
            // 18. WALLET VALIDATION IF PAYMENT METHOD IS WALLET
            // ============================================================
            if(payment_method === 'wallet'){
                const wallet = await Wallets.findOne({
                    where: { 
                        user_id: user_id, 
                        status: 1 
                    }
                });
                if(!wallet){
                    return res.status(404).json({
                        success: false,
                        message: 'Wallet not found for this user.'
                    });
                }
                // For standard reservation trips, check remaining amount; for others, check full amount
                if(trip_id === 3){
                    if(isStandardReservation || isCustomTrip){
                        console.log(`Reservation trip: Advance paid (₹${advance_paid_amount}), wallet check skipped for now`);
                        console.log(`Trip Type: ${isCustomTrip ? 'Custom' : 'Standard'}`);
                        console.log(`Remaining amount (₹${remaining_fare_to_pay}) will be handled at ride completion`);
                    }
                }else{
                    // NON-RESERVATION TRIPS (One-way, Round-trip)
                    const amountToCheck = final_fare;
                    if(parseFloat(wallet.balance) < amountToCheck){
                        const shortfall = amountToCheck - parseFloat(wallet.balance);
                        let message = `Insufficient wallet balance. Required: ₹${amountToCheck.toFixed(2)}, Available: ₹${wallet.balance}`;
                        if(pendingChargeResult.hasPendingCharges){
                            message += ` (includes ₹${pendingChargeResult.appliedCharge.toFixed(2)} pending cancellation charge)`;
                        }
                        return res.status(400).json({
                            success: false,
                            message: message,
                            details: {
                                required_amount: amountToCheck,
                                wallet_balance: parseFloat(wallet.balance),
                                shortfall: shortfall,
                                pending_cancellation_charge: pendingChargeResult.appliedCharge
                            }
                        });
                    }
                }
            }

            // ============================================================
            // 19. DETERMINE RIDE REQUEST STATUS
            // ============================================================
            const isScheduledRide = needsScheduling && pickup_date && pickup_time;

            // ============================================================
            // 20. CREATE RIDE REQUEST WITH TRANSACTION
            // ============================================================
            // Generate unique ride number
            const rideNumber = await generateRideNumber();
            let rideRequest  = null;
            let transaction  = null;
            try{
                transaction  = await sequelize.transaction();
                // Create ride request
                rideRequest  = await RideRequests.create({
                    ride_number                 : rideNumber,
                    user_id                     : user_id,
                    trip_id                     : trip_id,
                    trip_type                   : trip_type,
                    vehicle_type_id             : selectedVehicleTypeId,
                    is_book_any_vehicle         : isBookAnyVehicle,
                    eligible_vehicle_type_ids   : isBookAnyVehicle ? JSON.stringify(allAvailableVehicleTypes.map(v => v.id)) : null,
                    
                    // Package/Custom Trip fields
                    package_id                  : isStandardReservation ? package_id : null,
                    is_custom_trip              : isCustomTrip ? 1 : 0,
                    custom_km                   : isCustomTrip ? calculationKm : null,
                    custom_days                 : isCustomTrip ? calculationDays : null,
                    
                    coupon_id                   : coupon_id,
                    coupon_code                 : coupon_code,
                    is_interstate               : is_interstate,
                    
                    // Advance payment fields (only for standard reservations)
                    advance_payment_id          : advancePaymentRecord?.id || null,
                    advance_paid_amount         : advance_paid_amount,
                    remaining_fare_to_pay       : remaining_fare_to_pay,
                    is_advance_paid             : advancePaymentRecord ? true : false,
                    
                    // Scheduling
                    pickup_date                 : isScheduledRide ? pickup_date : null,
                    pickup_time                 : isScheduledRide ? pickup_time : null,
                    is_scheduled                : isScheduledRequest,
                    
                    // Booking for other
                    is_booking_for_other        : isBookingForOther,
                    rider_name                  : isBookingForOther ? rider_name?.trim() : user.name,
                    rider_mobile                : isBookingForOther ? rider_mobile?.replace(/\D/g, '') : user.mobile,
                    rider_relationship_to_booker: isBookingForOther ? (rider_relationship_to_booker || 'other') : 'self',
                    
                    // Fare details
                    estimated_distance          : parseFloat((calculationKm || fareBreakdown.distance).toFixed(2)),
                    estimated_duration          : parseInt(fareBreakdown.duration),
                    estimated_fare              : parseFloat(fareBreakdown.totalWithBataAndGst.toFixed(2)),
                    estimated_base_fare         : parseFloat(fareBreakdown.baseFare.toFixed(2)),
                    estimated_distance_charge   : parseFloat(fareBreakdown.distanceCharge.toFixed(2)),
                    estimated_waiting_charge    : parseFloat(fareBreakdown.waitingTimeCharge.toFixed(2)),
                    estimated_bata_charge       : parseFloat(fareBreakdown.distancePlusDurationXBata.toFixed(2)),
                    estimated_subtotal          : parseFloat(fareBreakdown.subtotal.toFixed(2)),
                    estimated_total_gst_amount  : parseFloat(fareBreakdown.gstAmount.toFixed(2)),
                    estimated_igst_amount       : is_interstate ? parseFloat(fareBreakdown.gstAmount.toFixed(2)) : 0.00,
                    estimated_cgst_amount       : !is_interstate ? parseFloat((fareBreakdown.gstAmount / 2).toFixed(2)) : 0.00,
                    estimated_sgst_amount       : !is_interstate ? parseFloat((fareBreakdown.gstAmount / 2).toFixed(2)) : 0.00,
                    final_fare                  : parseFloat(final_fare.toFixed(2)),
                    discount_amount             : discount_amount,
                    fare_breakdown              : JSON.stringify(enhancedFareBreakdown),
                    pending_cancellation_applied: pendingChargeResult.hasPendingCharges,
                    pending_cancellation_amount : pendingChargeResult.appliedCharge || 0,
                    
                    // Location details
                    pickup_address              : pickup.address,
                    pickup_latitude             : pickup.latitude,
                    pickup_longitude            : pickup.longitude,
                    pickup_district             : pickup.district,
                    pickup_state                : pickup.state,
                    pickup_state_id             : pickup_state_id,
                    dropoff_state_id            : dropoff_state_id,
                    dropoff_address             : drop.address,
                    dropoff_latitude            : drop.latitude,
                    dropoff_longitude           : drop.longitude,
                    dropoff_district            : drop.district,
                    dropoff_state               : drop.state,
                    stop1_address               : stop1?.address || null,
                    stop1_latitude              : stop1?.latitude || null,
                    stop1_longitude             : stop1?.longitude || null,
                    stop2_address               : stop2?.address || null,
                    stop2_latitude              : stop2?.latitude || null,
                    stop2_longitude             : stop2?.longitude || null,
                    special_instructions        : special_instructions || null,
                    payment_method              : payment_method,
                    status                      : 'pending',
                    payment_status              : 'pending'
                }, { transaction });

                // Mark advance payment as "used" if applicable (only for standard reservations)
                if(advancePaymentRecord){
                    await advancePaymentRecord.update({
                        status: 'used',
                        ride_request_id: rideRequest.id,
                        used_at: new Date()
                    }, { transaction });

                    console.log(`✅ Advance payment ${advance_payment_id} marked as USED for ride ${rideRequest.id}`);
                }
                await transaction.commit();
                transaction = null;
                // Small delay for DB write
                await new Promise(resolve => setTimeout(resolve, 100));
            }catch(createError){
                if(transaction){
                    await transaction.rollback();
                    console.error('❌ Transaction rolled back due to error');
                }
                console.error('❌ Failed to create ride request:', createError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create ride request. Please try again.',
                    error: createError.message
                });
            }

            // ============================================================
            // 21. VERIFY RIDE REQUEST CREATION
            // ============================================================
            try{
                await rideRequest.reload();
                const verifyQuery = await RideRequests.findByPk(rideRequest.id, {
                    attributes: ['id', 'user_id', 'status', 'is_custom_trip', 'created_at'],
                    raw: true
                });
                if(!verifyQuery){
                    throw new Error(`Ride ${rideRequest.id} not found in database`);
                }
                const countCheck = await RideRequests.count({
                    where: { id: rideRequest.id }
                });
                if(countCheck === 0){
                    throw new Error(`Count check returned 0 for ride ${rideRequest.id}`);
                }
            }catch(verifyError){
                console.error('❌ VERIFICATION FAILED:', verifyError);
                return res.status(500).json({
                    success: false,
                    message: 'Ride request created but verification failed. Please try again.',
                    error: verifyError.message,
                    ride_request_id: rideRequest.id
                });
            }

            // ============================================================
            // 22. CUSTOM TRIP - RETURN WITHOUT DRIVER NOTIFICATION
            // ============================================================
            if(isCustomTrip){
                // Send notification to admin about new custom trip request
                try{
                    await FirebaseService.sendCustomTripNotificationToAdmin({
                        ride_request_id : rideRequest.id,
                        user_name       : user.name,
                        user_mobile     : user.mobile,
                        pickup_location : pickup.address,
                        drop_location   : drop.address,
                        custom_km       : calculationKm,
                        custom_days     : calculationDays,
                        pickup_date     : pickup_date,
                        pickup_time     : pickup_time,
                        vehicle_type    : vehicleType.name,
                        estimated_fare  : final_fare
                    });
                    console.log(`✅ Custom trip notification sent to admin for ride ${rideRequest.id}`);
                }catch(notifyError){
                    console.error('❌ Failed to send admin notification for custom trip:', notifyError);
                    // Don't fail the request if notification fails
                }
                return res.status(200).json({
                    success                     : true,
                    message                     : 'Custom reservation ride request submitted successfully. Admin will assign a driver and contact you shortly.',
                    ride_request_id             : rideRequest.id,
                    next_steps                  : [
                        'Your custom reservation request has been received',
                        'Admin will review your request',
                        'A driver will be assigned manually',
                        'You will be contacted with driver details',
                        `Please be ready on ${pickup_date} at ${pickup_time}`
                    ]
                });
            }

            // ============================================================
            // 23. HANDLE SCHEDULING (IF APPLICABLE) - For One-way trips
            // ============================================================
            if(isScheduledRide && trip_id === 1){
                try{
                    console.log(`📅 Scheduling ride ${rideRequest.id} for ${pickup_date} at ${pickup_time}`);
                    const schedulingResult = await scheduleRideNotification(rideRequest);
                    if(schedulingResult.success){
                        return res.status(200).json({
                            success: true,
                            message: `Ride scheduled successfully for ${pickup_date} at ${pickup_time}. You will be notified when driver search begins.`,
                            ride_request_id: rideRequest.id,
                            job_id: schedulingResult.jobId,
                            scheduled_for: {
                                date: pickup_date,
                                time: pickup_time
                            }
                        });
                    }else{
                        await RideRequests.update(
                            { status: 'scheduling_failed' },
                            { where: { id: rideRequest.id } }
                        );
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to schedule ride notification. Please try again.',
                            ride_request_id: rideRequest.id,
                            error: schedulingResult.error
                        });
                    }
                }catch(error){
                    console.error('❌ Error in ride scheduling:', error);
                    await RideRequests.update(
                        { status: 'scheduling_failed' },
                        { where: { id: rideRequest.id } }
                    );
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to schedule ride. Please try again.',
                        ride_request_id: rideRequest.id,
                        error: error.message
                    });
                }
            }

            // ============================================================
            // 24. SEARCH FOR NEARBY DRIVERS (IMMEDIATE RIDES ONLY)
            // ============================================================
            let nearbyDrivers = [];
            try{
                console.log(`🔍 Searching for nearby drivers for ride ${rideRequest.id}...`);
                console.log(`   Vehicle Type ID: ${vehicle_type_id} (isBookAny: ${isBookAnyVehicle})`);
                const vehicleTypeForSearch = isBookAnyVehicle ? 'any' : selectedVehicleTypeId;
                nearbyDrivers = await FirebaseService.findNearbyDrivers(
                    pickup,
                    vehicleTypeForSearch,
                    rideRequest.id
                );
                if(nearbyDrivers.length > 0 && nearbyDrivers[0]?.search_metadata){
                    console.log(`📊 Search Metadata:`, JSON.stringify(nearbyDrivers[0].search_metadata, null, 2));
                }
            }catch(driverSearchError){
                console.error('❌ Error finding nearby drivers:', driverSearchError);
                await RideRequests.update(
                    { status: 'driver_search_failed' },
                    { where: { id: rideRequest.id } }
                );
                return res.status(500).json({
                    success: false,
                    message: 'Failed to search for nearby drivers. Please try again.',
                    ride_request_id: rideRequest.id,
                    error: driverSearchError.message
                });
            }

            // ============================================================
            // 25. HANDLE NO DRIVERS AVAILABLE
            // ============================================================
            if(nearbyDrivers.length === 0){
                await RideRequests.update(
                    { status: 'no_drivers_available' },
                    { where: { id: rideRequest.id } }
                );
                return res.status(200).json({
                    success: false,
                    message: isBookAnyVehicle
                        ? 'No drivers available in your area for any vehicle type at the moment. Please try again later.'
                        : 'No drivers available in your area at the moment. Please try again later.',
                    ride_request_id: rideRequest.id,
                    trip_type: isStandardReservation ? 'RESERVATION' : (trip_type === 1 ? 'INTERCITY' : 'OUTSTATION'),
                    is_interstate: is_interstate,
                    retry_suggested: true
                });
            }

            // ============================================================
            // 26. UPDATE STATUS AND SEND NOTIFICATIONS
            // ============================================================
            try{
                console.log(`🔒 Updating ride ${rideRequest.id} to 'searching_driver' status BEFORE notifications...`);
                // Final check - verify ride still exists and is pending
                const finalCheck = await RideRequests.findByPk(rideRequest.id, {
                    attributes: ['id', 'status', 'user_id'],
                    raw: true
                });
                if(!finalCheck){
                    throw new Error(`Ride request ${rideRequest.id} disappeared before notification`);
                }
                if(finalCheck.status !== 'pending'){
                    throw new Error(`Ride request ${rideRequest.id} status already changed to ${finalCheck.status}`);
                }
                // Store driver details with vehicle type info for "book any"
                const notifiedDriversData = nearbyDrivers.map(d => {
                    const baseData = {
                        driver_id: d.driver_id,
                        distance_km: d.distance_km,
                        selection_score: d.selection_score
                    };
                    // Add vehicle type info for "book any" searches
                    if(isBookAnyVehicle && d.vehicle_type_id){
                        baseData.vehicle_type_id = d.vehicle_type_id;
                        baseData.vehicle_type_name = d.vehicle_type_name;
                        baseData.vehicle_capacity = d.vehicle_capacity;

                        if(d.alternative_vehicle_types?.length > 0){
                            baseData.alternative_vehicle_types = d.alternative_vehicle_types;
                        }
                    }
                    return baseData;
                });
                // Update status to 'searching_driver' BEFORE sending notifications
                const [updateCount] = await RideRequests.update(
                    {
                        status: 'searching_driver',
                        search_started_at: new Date(),
                        notified_drivers: JSON.stringify(notifiedDriversData),
                        is_book_any_vehicle: isBookAnyVehicle
                    },
                    {
                        where: {
                            id: rideRequest.id,
                            status: 'pending'
                        }
                    }
                );
                if(updateCount === 0){
                    throw new Error(`Failed to update ride ${rideRequest.id} to searching_driver - status may have changed`);
                }
                // Small delay to ensure database write is complete
                await new Promise(resolve => setTimeout(resolve, 50));
                // Verify the update succeeded
                const statusCheck = await RideRequests.findByPk(rideRequest.id, {
                    attributes: ['status'],
                    raw: true
                });
                if(!statusCheck || statusCheck.status !== 'searching_driver'){
                    throw new Error(`Status update verification failed for ride ${rideRequest.id}`);
                }
                console.log(`✅ Status update verified - NOW sending notifications for ride ${rideRequest.id}`);
                // NOW send notifications
                const notificationResult = await FirebaseService.sendRideRequestNotifications(
                    nearbyDrivers,
                    rideRequest,
                    { pickup, drop, stop1, stop2, user_id }
                );

                // ============================================================
                // 27. HANDLE NOTIFICATION RESULTS
                // ============================================================
                if(notificationResult.success && notificationResult.drivers_notified > 0){
                    // Update drivers_notified count
                    await RideRequests.update(
                        { drivers_notified: notificationResult.drivers_notified },
                        { where: { id: rideRequest.id } }
                    );
                    // Success message
                    const successMessage = isStandardReservation
                        ? `Reservation ride created! Advance payment of ₹${advance_paid_amount.toFixed(2)} confirmed. Searching for drivers...`
                        : isBookAnyVehicle
                            ? `Ride request created! Searching across multiple vehicle types...`
                            : 'Ride request created successfully. Searching for drivers...';
                    // Extract search metadata
                    const searchMetadata = nearbyDrivers[0]?.search_metadata;
                    return res.status(200).json({
                        success         : true,
                        message         : successMessage,
                        ride_request_id : rideRequest.id,
                    });
                }else{
                    // Notification failed
                    await RideRequests.update(
                        { status: 'notification_failed' },
                        { where: { id: rideRequest.id } }
                    );
                    return res.status(200).json({
                        success: false,
                        message: 'Failed to notify nearby drivers. Please try again.',
                        ride_request_id: rideRequest.id,
                        trip_type: isStandardReservation ? 'RESERVATION' : (trip_type === 1 ? 'INTERCITY' : 'OUTSTATION'),
                        is_interstate: is_interstate,
                        retry_suggested: true,
                        error_details: notificationResult.notification_errors
                    });
                }
            }catch(notificationError){
                console.error('❌ Error during notification process:', notificationError);
                await RideRequests.update(
                    { status: 'notification_failed' },
                    { where: { id: rideRequest.id } }
                );
                return res.status(500).json({
                    success: false,
                    message: 'Ride request created but failed to notify drivers. Please try again.',
                    ride_request_id: rideRequest.id,
                    error: notificationError.message
                });
            }
        }catch(err){
            console.error('❌ requestRide error:', err);
            console.error('❌ Error stack:', err.stack);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while creating ride request. Please try again later.',
                error: err.message
            });
        }
    },

    // FARE BREAKDOWN 
    fareBreakdown: async (req, res) => {
        try{
            const { ride_request_id } = req.params;
            // Validate ride request ID
            if(!ride_request_id || !Number.isInteger(parseInt(ride_request_id))){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            // Validate user authentication (works for both user and driver)
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const user_id = req.user.userId;
            // Find the ride request
            const rideRequest = await RideRequests.findOne({
                where: { id: ride_request_id },
                include: [
                    {
                        model: Vehicletypes,
                        as: 'vehicleType',
                        attributes: ['id', 'name', 'capacity', 'image']
                    },
                    {
                        model: User,
                        as: 'passenger',  
                        attributes: ['id', 'name', 'email', 'mobile']
                    },
                    {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'mobile'],
                        required: false
                    },
                    {
                        model: Coupon,
                        as: 'coupon',
                        attributes: ['id', 'code', 'discount_type', 'discount_value'],
                        required: false
                    },
                    {
                        model: Trips,
                        as: 'trip',
                        attributes: ['id', 'trip']
                    },
                    {
                        model: State,
                        as: 'pickupState',
                        attributes: ['id', 'state_name', 'state_code'],
                        required: false
                    },
                    {
                        model: State,
                        as: 'dropState',
                        attributes: ['id', 'state_name', 'state_code'],
                        required: false
                    }
                ]
            });
            if(!rideRequest){
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found'
                });
            }
            // Verify user has access to this ride 
            if(rideRequest.user_id !== user_id && rideRequest.driver_id !== user_id){
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to view this fare breakdown'
                });
            }
            const isDriver = rideRequest.driver_id === user_id;
            const estimatedBreakdown = rideRequest.fare_breakdown ? JSON.parse(rideRequest.fare_breakdown) : null;
            const actualBreakdown = rideRequest.actual_fare_breakdown ? JSON.parse(rideRequest.actual_fare_breakdown) : null;
            const rideCompleted = ['ride_completed', 'payment_completed'].includes(rideRequest.status);
            const rideInfo = {
                ride_request_id: rideRequest.id,
                trip_type: rideRequest.trip_type === 1 ? 'INTERCITY' : 'OUTSTATION',
                vehicle_type: rideRequest.vehicleType?.name,
                vehicle_capacity: rideRequest.vehicleType?.capacity,
                status: rideRequest.status,
                payment_method: rideRequest.payment_method,
                payment_status: rideRequest.payment_status,
                is_interstate: rideRequest.is_interstate,
                pickup_state: rideRequest.pickupState?.state_name,
                drop_state: rideRequest.dropState?.state_name,
                is_scheduled: rideRequest.is_scheduled,
                scheduled_date: rideRequest.pickup_date,
                scheduled_time: rideRequest.pickup_time,
                booking_for_other: rideRequest.is_booking_for_other,
                rider_name: rideRequest.rider_name
            };
            const estimatedFare = {
                distance: parseFloat(rideRequest.estimated_distance || 0),
                duration: parseInt(rideRequest.estimated_duration || 0),
                base_fare: parseFloat(rideRequest.estimated_base_fare || 0),
                distance_charge: parseFloat(rideRequest.estimated_distance_charge || 0),
                waiting_charge: parseFloat(rideRequest.estimated_waiting_charge || 0),
                bata_charge: parseFloat(rideRequest.estimated_bata_charge || 0),
                subtotal: parseFloat(rideRequest.estimated_subtotal || 0),
                gst_amount: parseFloat(rideRequest.estimated_total_gst_amount || 0),
                igst_amount: parseFloat(rideRequest.estimated_igst_amount || 0),
                cgst_amount: parseFloat(rideRequest.estimated_cgst_amount || 0),
                sgst_amount: parseFloat(rideRequest.estimated_sgst_amount || 0),
                total: parseFloat(rideRequest.estimated_fare || 0),
                breakdown: estimatedBreakdown
            };
            const discountInfo = rideRequest.discount_amount > 0 ? {
                coupon_code: rideRequest.coupon_code,
                coupon_type: rideRequest.coupon?.discount_type,
                discount_amount: parseFloat(rideRequest.discount_amount || 0)
            } : null;
            const pendingCharges = rideRequest.pending_cancellation_applied ? {
                amount: parseFloat(rideRequest.pending_cancellation_amount || 0),
                applied: true
            } : null;
            const finalFare = parseFloat(rideRequest.final_fare || 0);
            let response = {
                success: true,
                ride_info: rideInfo,
                viewing_as: isDriver ? 'driver' : 'user',
                estimated: {
                    ...estimatedFare,
                    formatted: {
                        distance: `${estimatedFare.distance.toFixed(2)} km`,
                        duration: `${Math.floor(estimatedFare.duration / 60)}h ${estimatedFare.duration % 60}m`,
                        base_fare: `₹${estimatedFare.base_fare.toFixed(2)}`,
                        distance_charge: `₹${estimatedFare.distance_charge.toFixed(2)}`,
                        waiting_charge: `₹${estimatedFare.waiting_charge.toFixed(2)}`,
                        bata_charge: `₹${estimatedFare.bata_charge.toFixed(2)}`,
                        subtotal: `₹${estimatedFare.subtotal.toFixed(2)}`,
                        gst: `₹${estimatedFare.gst_amount.toFixed(2)}`,
                        igst: estimatedFare.igst_amount > 0 ? `₹${estimatedFare.igst_amount.toFixed(2)}` : null,
                        cgst: estimatedFare.cgst_amount > 0 ? `₹${estimatedFare.cgst_amount.toFixed(2)}` : null,
                        sgst: estimatedFare.sgst_amount > 0 ? `₹${estimatedFare.sgst_amount.toFixed(2)}` : null,
                        total: `₹${estimatedFare.total.toFixed(2)}`
                    }
                }
            };
            // Add actual fare if ride is completed
            if(rideCompleted && rideRequest.actual_fare){
                const actualFare = {
                    distance: parseFloat(rideRequest.actual_distance || 0),
                    duration: parseInt(rideRequest.actual_duration || 0),
                    base_fare: parseFloat(rideRequest.actual_base_fare || 0),
                    distance_charge: parseFloat(rideRequest.actual_distance_charge || 0),
                    waiting_charge: parseFloat(rideRequest.actual_waiting_charge || 0),
                    bata_charge: parseFloat(rideRequest.actual_bata_charge || 0),
                    subtotal: parseFloat(rideRequest.actual_subtotal || 0),
                    gst_amount: parseFloat(rideRequest.actual_gst_amount || 0),
                    igst_amount: parseFloat(rideRequest.actual_igst_amount || 0),
                    cgst_amount: parseFloat(rideRequest.actual_cgst_amount || 0),
                    sgst_amount: parseFloat(rideRequest.actual_sgst_amount || 0),
                    total: parseFloat(rideRequest.actual_fare || 0),
                    breakdown: actualBreakdown
                };
                response.actual = {
                    ...actualFare,
                    formatted: {
                        distance: `${actualFare.distance.toFixed(2)} km`,
                        duration: `${Math.floor(actualFare.duration / 60)}h ${actualFare.duration % 60}m`,
                        base_fare: `₹${actualFare.base_fare.toFixed(2)}`,
                        distance_charge: `₹${actualFare.distance_charge.toFixed(2)}`,
                        waiting_charge: `₹${actualFare.waiting_charge.toFixed(2)}`,
                        bata_charge: `₹${actualFare.bata_charge.toFixed(2)}`,
                        subtotal: `₹${actualFare.subtotal.toFixed(2)}`,
                        gst: `₹${actualFare.gst_amount.toFixed(2)}`,
                        igst: actualFare.igst_amount > 0 ? `₹${actualFare.igst_amount.toFixed(2)}` : null,
                        cgst: actualFare.cgst_amount > 0 ? `₹${actualFare.cgst_amount.toFixed(2)}` : null,
                        sgst: actualFare.sgst_amount > 0 ? `₹${actualFare.sgst_amount.toFixed(2)}` : null,
                        total: `₹${actualFare.total.toFixed(2)}`
                    }
                };
                // Add comparison
                response.comparison = {
                    distance_difference: parseFloat((actualFare.distance - estimatedFare.distance).toFixed(2)),
                    duration_difference: actualFare.duration - estimatedFare.duration,
                    fare_difference: parseFloat((actualFare.total - estimatedFare.total).toFixed(2)),
                    formatted: {
                        distance_difference: `${Math.abs(actualFare.distance - estimatedFare.distance).toFixed(2)} km ${actualFare.distance > estimatedFare.distance ? 'more' : 'less'}`,
                        duration_difference: `${Math.abs(actualFare.duration - estimatedFare.duration)} min ${actualFare.duration > estimatedFare.duration ? 'more' : 'less'}`,
                        fare_difference: `₹${Math.abs(actualFare.total - estimatedFare.total).toFixed(2)} ${actualFare.total > estimatedFare.total ? 'more' : 'less'}`
                    }
                };
            }
            // Add discount information
            if(discountInfo){
                response.discount = {
                    ...discountInfo,
                    formatted: {
                        amount: `₹${discountInfo.discount_amount.toFixed(2)}`
                    }
                };
            }
            // Add pending charges
            if(pendingCharges){
                response.pending_charges = {
                    ...pendingCharges,
                    formatted: {
                        amount: `₹${pendingCharges.amount.toFixed(2)}`
                    }
                };
            }
            // Add final fare summary
            response.final = {
                amount: finalFare,
                formatted: `₹${finalFare.toFixed(2)}`,
                calculation: {
                    base_amount: rideCompleted && rideRequest.actual_fare ? 
                        parseFloat(rideRequest.actual_fare) : 
                        parseFloat(rideRequest.estimated_fare),
                    minus_discount: discountInfo ? discountInfo.discount_amount : 0,
                    plus_pending_charges: pendingCharges ? pendingCharges.amount : 0,
                    final_total: finalFare
                }
            };
            // Add driver-specific information
            if(isDriver && rideCompleted){
                const commissionValue    = parseFloat(rideRequest.commission_value || 0);
                const commissionType     = rideRequest.commission_type || 'percentage';
                const commissionAmount   = parseFloat(rideRequest.commission_amount || 0);
                let commissionFormatted  = '';
                if(commissionType === 'percentage'){
                    commissionFormatted  = `₹${commissionAmount.toFixed(2)} (${commissionValue}%)`;
                }else{
                    commissionFormatted  = `₹${commissionAmount.toFixed(2)} (Fixed)`;
                }
                response.driver_earnings = {
                    total_fare: finalFare,
                    commission_value: commissionValue,
                    commission_type: commissionType,
                    commission_amount: commissionAmount,
                    driver_payout: parseFloat(rideRequest.driver_payout || 0),
                    formatted: {
                        commission: commissionFormatted,
                        payout: `₹${parseFloat(rideRequest.driver_payout || 0).toFixed(2)}`
                    }
                };
            }
            // Add timestamps
            response.timestamps = {
                requested_at: rideRequest.created_at,
                accepted_at: rideRequest.accepted_at,
                started_at: rideRequest.ride_started_at,
                completed_at: rideRequest.ride_completed_at
            };
            return res.status(200).json(response);
        }catch(error){
            console.error('❌ Fare breakdown error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve fare breakdown. Please try again.'
            });
        }
    },

    // CANCEL RIDE REQUEST
    cancelRideRequest: async (req, res) => {
        try{
            const { ride_request_id, cancellation_reason } = req.body;
            // Validate user authentication
            const userValidation = await validationUtils.validateUserAuth(req, 2, 'User');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id } = userValidation;
            // Validate ride request ID
            if(!ride_request_id || !Number.isInteger(ride_request_id)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required.'
                });
            }
            // Find the ride request
            const rideRequest = await RideRequests.findOne({
                where: { 
                    id: ride_request_id,
                    user_id: user_id
                }
            });
            if(!rideRequest){
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found or you are not authorized to cancel this ride.'
                });
            }
            // Check if ride can be cancelled
            const cancellableStatuses = ['pending', 'searching_driver', 'no_drivers_available', 'notification_failed'];
            if(!cancellableStatuses.includes(rideRequest.status)){
                return res.status(400).json({
                    success: false,
                    message: `Cannot cancel ride with status: ${rideRequest.status}. Only pending or searching rides can be cancelled.`,
                    current_status: rideRequest.status
                });
            }
            // Stop Firebase notifications
            try{
                await FirebaseService.stopRideRequestNotifications(ride_request_id);
            }catch(error){
                console.error('Error stopping Firebase notifications:', error);
                // Continue with cancellation even if Firebase update fails
            }
            // Update ride request status
            await RideRequests.update(
                {
                    status: 'cancelled_by_user',
                    cancelled_at: new Date(),
                    cancellation_reason: cancellation_reason || 'User cancelled',
                    cancelled_by: user_id
                },
                { where: { id: ride_request_id } }
            );
            // Refund coupon if applied
            if(rideRequest.coupon_id){
                try{
                    await UserCoupons.update(
                        { is_used: false },
                        { 
                            where: { 
                                user_id: user_id,
                                coupon_id: rideRequest.coupon_id
                            }
                        }
                    );
                    // Remove promo usage record
                    await PromoUsages.destroy({
                        where: {
                            user_id: user_id,
                            coupon_id: rideRequest.coupon_id,
                            ride_request_id: ride_request_id
                        }
                    });
                }catch(error){
                    console.error('Error refunding coupon:', error);
                }
            }
            return res.status(200).json({
                success: true,
                message: 'Ride request cancelled successfully.',
                ride_request_id: ride_request_id,
                cancelled_at: new Date(),
                coupon_refunded: !!rideRequest.coupon_id
            });
        }catch(err){
            console.error('❌ CancelRideRequest error:', err);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while cancelling ride request. Please try again later.'
            });
        }
    },

    // DRIVER ACCEPT RIDE REQUEST
    acceptRideRequest: async (req, res) => {
        let transaction;
        try{
            const { ride_request_id } = req.params;
            // Validate user authentication and role
            const userValidation = await validationUtils.validateUserAuth(req, 3, 'Driver');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id: driver_id, user: driver } = userValidation;
            if(!ride_request_id || !Number.isInteger(parseInt(ride_request_id))){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            // Check driver approval status (outside transaction)
            const driverDetails = await DriverDetails.findOne({
                where: { 
                    user_id: driver_id,
                    status: 'approved'
                }
            });
            if(!driverDetails){
                return res.status(404).json({
                    success: false,
                    message: 'Driver details not found or not approved'
                });
            }
            // Check if driver is online (outside transaction)
            const driverLocation = await DriverLocation.findOne({
                where: { 
                    driver_id: driver_id,
                    is_online: 1
                }
            });
            if(!driverLocation){
                return res.status(400).json({
                    success: false,
                    message: 'Driver is not online or available'
                });
            }
            // Check if driver already has an active ride (outside transaction)
            const existingRide = await RideRequests.findOne({
                where: {
                    driver_id: driver_id,
                    status: ['accepted', 'arrived', 'ride_started']
                }
            });
            if(existingRide){
                return res.status(400).json({
                    success: false,
                    message: 'Driver is already assigned to another ride'
                });
            }
            // Get driver location from Firebase (outside transaction)
            const locationRef = FirebaseService.db.ref(`driver_locations/${driver_id}`);
            const snapshot    = await locationRef.once('value');
            const location    = snapshot.val();
            if(!location?.latitude || !location?.longitude){
                return res.status(400).json({
                    success: false,
                    message: 'Driver location not available. Please ensure location services are enabled.'
                });
            }
            transaction = await sequelize.transaction({
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
            });
            // First, do a simple lock query to get the ride quickly
            const lockedRide = await RideRequests.findOne({
                where: { 
                    id: ride_request_id
                },
                attributes: ['id', 'status', 'driver_id', 'user_id', 'vehicle_type_id', 
                            'is_book_any_vehicle', 'eligible_vehicle_type_ids',
                            'pickup_latitude', 'pickup_longitude'],
                lock: Sequelize.Transaction.LOCK.UPDATE,
                transaction
            });
            // Immediate fail if ride doesn't exist
            if(!lockedRide){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found'
                });
            }
            // Immediate fail if not available
            if(lockedRide.status !== 'searching_driver'){
                await transaction.rollback();
                // Provide specific error messages based on status
                let message = 'This ride is no longer available.';
                if(lockedRide.status === 'accepted'){
                    message = 'This ride was just accepted by another driver.';
                }else 
                if(lockedRide.status === 'cancelled_by_user'){
                    message = 'This ride was cancelled by the passenger.';
                }else 
                if(lockedRide.status === 'expired'){
                    message = 'This ride request has expired.';
                }
                return res.status(400).json({
                    success: false,
                    message: message,
                    current_status: lockedRide.status,
                    error_code: 'RIDE_ALREADY_TAKEN'
                });
            }
            // Check if already assigned to another driver
            if(lockedRide.driver_id && lockedRide.driver_id !== driver_id){
                await transaction.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'This ride has already been assigned to another driver',
                    error_code: 'RIDE_ALREADY_ASSIGNED'
                });
            }
            // Calculate distance to pickup
            const distanceToPickup = await FirebaseService.calculateGoogleDistance(
                location.latitude,
                location.longitude,
                lockedRide.pickup_latitude,
                lockedRide.pickup_longitude
            );
            const MAX_ACCEPT_DISTANCE = parseFloat(process.env.MAX_ACCEPT_DISTANCE || 15);
            if(distanceToPickup > MAX_ACCEPT_DISTANCE){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `You are too far from pickup location (${distanceToPickup.toFixed(1)}km). Maximum allowed: ${MAX_ACCEPT_DISTANCE}km`
                });
            }
            // Validate vehicle type match
            if(lockedRide.is_book_any_vehicle){
                let eligibleVehicleIds = [];
                try{
                    eligibleVehicleIds = JSON.parse(lockedRide.eligible_vehicle_type_ids || '[]');
                }catch(e){
                    eligibleVehicleIds = [];
                }
                if(eligibleVehicleIds.length > 0 && !eligibleVehicleIds.includes(driverDetails.vehicle_type_id)){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Your vehicle type is not eligible for this ride request'
                    });
                }
            }else{
                if(driverDetails.vehicle_type_id !== lockedRide.vehicle_type_id){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Your vehicle type does not match the requested vehicle type'
                    });
                }
            }
            // Fetch admin settings for wallet negative limit
            const adminSettings = await Settings.findOne({
                where: { role: 'admin' },
                transaction
            });
            if(!adminSettings){
                await transaction.rollback();
                return res.status(500).json({
                    success: false,
                    message: 'Admin settings not found. Please contact support.'
                });
            }
            const walletNegativeLimit = parseFloat(adminSettings.wallet_negative_limit || 0);
            // Fetch driver's wallet
            const driverWallet = await Wallets.findOne({
                where: { 
                    user_id: driver_id, 
                    status: 'active' 
                },
                lock: true,
                transaction
            });
            if(!driverWallet){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Driver wallet not found'
                });
            }
            const currentBalance = parseFloat(driverWallet.balance);
            if(currentBalance < -walletNegativeLimit){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Your wallet balance (${currentBalance.toFixed(2)}) is below the minimum allowed (-${walletNegativeLimit.toFixed(2)}). Please top up to accept rides.`,
                    current_balance: currentBalance,
                    min_allowed: -walletNegativeLimit
                });
            }
            const ride_otp    = rideController.generateRideOTP();
            const currentTime = new Date();
            // Use optimistic locking with WHERE conditions
            const [updatedRows] = await RideRequests.update({
                status                    : 'accepted',
                driver_id                 : driver_id,
                vehicle_type_id           : driverDetails.vehicle_type_id,
                ride_otp                  : ride_otp,
                accepted_at               : currentTime,
                otp_generated_at          : currentTime,
                driver_distance_at_accept : distanceToPickup
            }, {
                where: { 
                    id                    : ride_request_id,
                    status                : 'searching_driver',  
                    driver_id             : null             
                },
                transaction
            });
            if(updatedRows === 0){
                await transaction.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Ride was just accepted by another driver. Please try another ride.',
                    error_code: 'CONCURRENT_UPDATE_FAILED'
                });
            }
            await transaction.commit();
            transaction = null;
            const rideRequest = await RideRequests.findOne({
                where: { id: ride_request_id },
                include: [
                    {
                        model: User,
                        as: 'passenger',
                        attributes: ['id', 'name', 'mobile', 'fcm_token']
                    },
                    {
                        model: Vehicletypes,
                        as: 'vehicleType',
                        attributes: ['id', 'name', 'image']
                    }
                ]
            });
            const responseData = {
                user_details: {
                    id: rideRequest.user_id,
                    name: rideRequest.passenger.name,
                    mobile: rideRequest.passenger.mobile,
                },
                driver_details: {
                    id: driver_id,
                    name: driver.name,
                    mobile: driver.mobile || '',
                    rating: driverDetails.rating
                },
                vehicle_details: {
                    name: rideRequest.vehicleType.name,
                    number: driverDetails.vehicle_number,
                    image: rideRequest.vehicleType.image ? 
                        `${BASE_URL}/uploads/vehicle-types/${rideRequest.vehicleType.image}` : null,
                },
                fare_details: {
                    estimated_fare: rideRequest.final_fare,
                    estimated_distance: rideRequest.estimated_distance,
                    estimated_duration: rideRequest.estimated_duration,
                },
                ride_details: {
                    ride_request_id: ride_request_id,
                    ride_otp: ride_otp,
                    trip_id: getTripTypeName(rideRequest.trip_id),
                    trip_type: rideRequest.trip_type === 1 ? 'intercity' : 'outstation',
                    pickup: {
                        address: rideRequest.pickup_address,
                        latitude: rideRequest.pickup_latitude,
                        longitude: rideRequest.pickup_longitude,
                    },
                    dropoff: {
                        address: rideRequest.dropoff_address,
                        latitude: rideRequest.dropoff_latitude,
                        longitude: rideRequest.dropoff_longitude,
                    },
                    stops: {
                        ...(rideRequest.stop1_address && {
                            stop1: {
                                address: rideRequest.stop1_address,
                                latitude: rideRequest.stop1_latitude,
                                longitude: rideRequest.stop1_longitude
                            }
                        }),
                        ...(rideRequest.stop2_address && {
                            stop2: {
                                address: rideRequest.stop2_address,
                                latitude: rideRequest.stop2_latitude,
                                longitude: rideRequest.stop2_longitude
                            }
                        })
                    }
                }
            };
            res.status(200).json({
                success: true,
                message: 'Ride accepted successfully',
                data: responseData
            });
            setImmediate(async () => {
                try{
                    await FirebaseService.handleRideAcceptance(responseData);
                }catch(firebaseError){
                    console.error('Firebase operations failed (non-critical):', firebaseError);
                }
            });
        }catch(error){
            if(transaction && !transaction.finished){
                try{
                    await transaction.rollback();
                }catch(rollbackError){
                    console.error('Rollback error:', rollbackError);
                }
            }
            console.error('❌ AcceptRideRequest error:', error);
            if(error.name === 'SequelizeTimeoutError'){
                return res.status(408).json({
                    success: false,
                    message: 'Request timeout. The ride may have been taken by another driver.',
                    error_code: 'TIMEOUT'
                });
            }
            if(error.name === 'SequelizeDatabaseError' && error.original?.code === 'ER_LOCK_DEADLOCK'){
                return res.status(409).json({
                    success: false,
                    message: 'This ride was just accepted by another driver. Please try another ride.',
                    error_code: 'DEADLOCK'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to accept ride request. Please try again.',
                error_code: 'SERVER_ERROR'
            });
        }
    },

    // DRIVER DECLINE RIDE REQUEST
    declineRideRequest: async (req, res) => {
        try{
            const { ride_request_id } = req.params;
            // Validate user authentication and role
            const userValidation = await validationUtils.validateUserAuth(req, 3, 'Driver');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id: driver_id } = userValidation;
            // Input validation
            if(!ride_request_id){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            // Check if ride request exists
            const rideRequest = await RideRequests.findByPk(ride_request_id);
            if(!rideRequest){
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found'
                });
            }
            // Check if ride is still in searchable state
            if(!['searching_driver', 'pending'].includes(rideRequest.status)){
                return res.status(400).json({
                    success: false,
                    message: 'Ride request is no longer available for decline'
                });
            }
            // Verify driver was actually notified about this ride
            const driverNotificationRef = FirebaseService.db.ref(`driver_notifications/${driver_id}/${ride_request_id}`);
            const notificationSnapshot  = await driverNotificationRef.once('value');
            const notificationData      = notificationSnapshot.val();
            if(!notificationData){
                return res.status(400).json({
                    success: false,
                    message: 'Driver was not notified about this ride request'
                });
            }
            if(notificationData.status === 'declined'){
                return res.status(400).json({
                    success: false,
                    message: 'Driver has already declined this ride request'
                });
            }
            if(notificationData.status === 'accepted'){
                return res.status(400).json({
                    success: false,
                    message: 'Driver has already accepted this ride request'
                });
            }
            // Update Firebase to mark this driver as declined
            await driverNotificationRef.update({
                status: 'declined',
                declined_at: Date.now(),
            });
            // Check if we need to expand search radius or find more drivers
            const rideRequestRef      = FirebaseService.db.ref(`ride_requests/${ride_request_id}`);
            const rideRequestSnapshot = await rideRequestRef.once('value');
            const rideRequestData     = rideRequestSnapshot.val();
            if(rideRequestData && rideRequestData.notified_drivers){
                const pendingDrivers = rideRequestData.notified_drivers.filter(d => 
                    !d.response || d.response === 'pending'
                );
                const declinedDrivers = rideRequestData.notified_drivers.filter(d => 
                    d.response === 'declined'
                );
                // If most drivers have declined, trigger search for more drivers
                if(pendingDrivers.length <= 1 && declinedDrivers.length >= 2){
                    await rideRequestRef.update({
                        needs_more_drivers: true,
                        last_decline_at: Date.now()
                    });
                }
            }
            res.json({
                success: true,
                message: 'Ride declined successfully',
            });
        }catch(error){
            console.error('❌ DeclineRideRequest error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to decline ride request. Please try again.' 
            });
        }
    },

    // DRIVER ARRIVED TO PICKUP
    driverArrivedToPickup: async (req, res) => {
        try{
			const {
				ride_request_id,
				start_meter_reading
			} = req.body;
            // Validate user authentication and role
            const userValidation = await validationUtils.validateUserAuth(req, 3, 'Driver');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id: driver_id, user: driver } = userValidation;
            // Input validation
            if(!ride_request_id){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            // Use database transaction for consistency
            const transaction = await sequelize.transaction();
            try{
                // Find the ride request and verify it's assigned to this driver
                const rideRequest = await RideRequests.findOne({
                    where              : { 
                        id             : ride_request_id,
                        driver_id      : driver_id,
                        status         : 'accepted'
                    },
                    include            : [
                        {
                            model      : User,
                            as         : 'passenger',
                            attributes : ['id', 'name', 'mobile', 'fcm_token']
                        },
                        {
                            model      : Vehicletypes,
                            as         : 'vehicleType',
                            attributes : ['id', 'name']
                        }
                    ],
                    lock               : true,
                    transaction
                });
                if(!rideRequest){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Ride request not found or not assigned to this driver, or ride is not in accepted status'
                    });
                }
                // MANDATORY VALIDATION FOR RESERVATION TRIPS  
                if(rideRequest.trip_id === 3){
                    // Validate meter reading number
                    if(!start_meter_reading){
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'Start meter reading is mandatory for reservation trips'
                        });
                    }
                    // Validate meter reading is a positive number
                    if(parseFloat(start_meter_reading) <= 0){
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'Start meter reading must be a positive number'
                        });
                    }
                    // Validate meter image upload
                    if(!req.file){
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'Start meter reading image is mandatory for reservation trips'
                        });
                    }
                }
                const updateData = {
                    status: 'arrived',
                    arrived_at: new Date()
                };
                // Add meter reading data for reservation trips
                if(rideRequest.trip_id === 3){
                    updateData.start_meter_reading = parseFloat(start_meter_reading);
                    updateData.start_meter_image   = req.file.filename; 
                }
                // Update ride status to "arrived" in database
                await RideRequests.update(updateData, {
                    where: { id: ride_request_id },
                    transaction
                });
                await transaction.commit();
                // Get driver's completed ride count
                const completedRideCount = await RideRequests.count({
                    where: { driver_id: driver_id, status: 'ride_completed' }
                });
                // Handle Firebase operations 
                let notificationSent = false;
                try{
                    const result = await FirebaseService.handleDriverArrival({
                        ride_request_id,
                        driver_id,
                        driver_name             : driver.name,
                        user_id                 : rideRequest.user_id,
                        ride_otp                : rideRequest.ride_otp,
                        driver_details          : {
                            name                : driver.name,
                            mobile              : driver.mobile || '',
                            completed_ride      : completedRideCount
                        },
                        user_details            : {
                            name                : rideRequest.passenger.name,
                            mobile              : rideRequest.passenger.mobile,
                            pickup_address      : rideRequest.pickup_address
                        },
                        ...(rideRequest.trip_id === 3 && {
                            start_meter_reading : parseFloat(start_meter_reading),
                            start_meter_image   : `${BASE_URL}/uploads/meter-readings/${req.file.filename}`
                        })
                    });
                    notificationSent = result === true;
                    console.log(`Driver arrival notification result: ${notificationSent}`);
                }catch(error){
                    console.error('Firebase operations failed:', error);
                    notificationSent = false;
                }
                return res.status(200).json({
                    success      : true,
                    message      : 'Driver arrival status updated successfully',
                    notification : notificationSent,
                });
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                // Delete uploaded file if transaction failed
                if(req.file){
                    const fs        = require('fs');
                    const path      = require('path');
                    const imagePath = path.join(process.cwd(), 'uploads', 'meter-readings', req.file.filename);
                    if(fs.existsSync(imagePath)){
                        try{
                            fs.unlinkSync(imagePath);
                        }catch(deleteErr){
                            console.warn('Failed to delete meter image after error:', deleteErr);
                        }
                    }
                }
                throw error;
            }
        }catch(error){
            console.error('❌ DriverArrivedToPickup error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update arrival status. Please try again.' 
            });
        }
    },

    // GENERATE OTP WHEN DRIVER ACCEPTS RIDE
    generateRideOTP: () => {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },

    // DRIVER VERIFY OTP AND START RIDE
    verifyOTPAndStartRide: async (req, res) => {
        try{
            const { ride_request_id, entered_otp } = req.body;
            // Validate user authentication and role
            const userValidation = await validationUtils.validateUserAuth(req, 3, 'Driver');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id: driver_id } = userValidation;
            // Validate inputs
            if(!entered_otp || entered_otp.length != 4){
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 4-digit OTP'
                });
            }
            // Use database transaction for consistency
            const transaction = await sequelize.transaction();
            try{
                // Find the ride request and verify it's assigned to this driver
                const rideRequest = await RideRequests.findOne({
                    where: { 
                        id        : ride_request_id,
                        driver_id : driver_id,
                        status    : 'arrived'
                    },
                    include: [
                        {
                            model: User,
                            as: 'passenger',
                            attributes: ['id', 'name', 'mobile', 'fcm_token']
                        }
                    ],
                    lock: true,
                    transaction
                });
                if(!rideRequest){
                    await transaction.rollback();
                    return res.status(404).json({
                        success: false,
                        message: 'Ride request not found or not assigned to you'
                    });
                }
                // Verify OTP
                if(rideRequest.ride_otp != entered_otp){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid OTP. Please check with the passenger.'
                    });
                }
                // Check OTP expiry (15 minutes)
                const otpGeneratedAt = new Date(rideRequest.otp_generated_at);
                const now            = new Date();
                const diffMinutes    = (now - otpGeneratedAt) / (1000 * 60);
                if(diffMinutes > 15){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'OTP has expired. Please contact support.'
                    });
                }
                // ============================================================
                // GENERATE END RIDE OTP FOR RESERVATION TRIPS (trip_id = 3)
                // ============================================================
                const isReservationTrip = rideRequest.trip_id === 3;
                let end_ride_otp = null;
                const updateData = {
                    status          : 'ride_started',
                    ride_started_at : new Date(),
                    otp_verified_at : new Date()
                };
                if(isReservationTrip){
                    end_ride_otp = rideController.generateRideOTP();
                    updateData.end_ride_otp = end_ride_otp;
                    updateData.end_otp_generated_at = new Date();
                }
                // Update status to "ride started" in database
                await RideRequests.update(updateData, {
                    where: { id: ride_request_id },
                    transaction
                });
                await transaction.commit();
                // Handle Firebase operations
                let notificationSent = false;
                try{
                    const result = await FirebaseService.notifyRideStarted({
                        ride_request_id : ride_request_id,
                        driver_id       : driver_id,
                        user_id         : rideRequest.user_id,
                        end_ride_otp    : end_ride_otp, // Pass end OTP for reservation trips
                        is_reservation  : isReservationTrip
                    });
                    notificationSent = result === true;
                    console.log(`Ride started notification result: ${notificationSent}`);
                }catch(error){
                    console.error('Firebase operations failed:', error);
                    notificationSent = false;
                }
                // Prepare response data
                const responseData = {
                    success                    : true,
                    message                    : 'OTP verified successfully. Ride started!',
                    notification               : notificationSent,
                    data                       : {
                        driver_id,
                        ride_request_id,
                        user_id                : rideRequest.user_id,
                        user_details           : {
                            name               : rideRequest.passenger.name,
                            mobile             : rideRequest.passenger.mobile,
                            pickup_address     : rideRequest.pickup_address,
                            dropoff_address    : rideRequest.dropoff_address,
                            stop1_address      : rideRequest.stop1_address,
                            stop2_address      : rideRequest.stop2_address,
                        },
                        trip_details           : {
                            trip_id            : getTripTypeName(rideRequest.trip_id),
                            trip_type          : rideRequest.trip_type === 1 ? 'intercity' : 'outstation',
                            is_reservation     : isReservationTrip,
                            estimated_fare     : rideRequest.final_fare,
                            estimated_distance : rideRequest.estimated_distance,
                            estimated_duration : rideRequest.estimated_duration,
                            pickup_latitude    : rideRequest.pickup_latitude,
                            pickup_longitude   : rideRequest.pickup_longitude,
                            dropoff_latitude   : rideRequest.dropoff_latitude,
                            dropoff_longitude  : rideRequest.dropoff_longitude,
                            stop1_latitude     : rideRequest.stop1_latitude ?? '',
                            stop1_longitude    : rideRequest.stop1_longitude ?? '',
                            stop2_latitude     : rideRequest.stop2_latitude ?? '',
                            stop2_longitude    : rideRequest.stop2_longitude ?? '',
                        }
                    }
                };
                // Add end OTP to response for reservation trips
                if(isReservationTrip && end_ride_otp){
                    responseData.data.end_ride_otp = end_ride_otp;
                    responseData.message = 'OTP verified successfully. Reservation ride started! End ride OTP has been generated.';
                }
                return res.status(200).json(responseData);
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                throw error;
            }
        }catch(error){
            console.error('❌ VerifyOTPAndStartRide error:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while verifying OTP'
            });
        }
    },

    // RIDE COMPLETED 
    rideCompleted: async (req, res) => {
        try{
            const { ride_request_id, drop, end_meter_reading, end_otp } = req.body;
            // Validate user authentication and role
            const userValidation = await validationUtils.validateUserAuth(req, 3, 'Driver');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const driver_id = userValidation.user_id;
            // Input validation
            if(!ride_request_id || !Number.isInteger(ride_request_id)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            // Validate drop-off location
            const dropValidation = validationUtils.validateLocation(drop, 'Drop-off');
            if(!dropValidation.success){
                return res.status(dropValidation.status).json({
                    success: false,
                    message: dropValidation.message
                });
            }
            const transaction = await sequelize.transaction();
            // Track subscription expiry for async processing
            let shouldScheduleActivation = false;
            let activationData = null;
            try{
                // Find the ride request and verify it's assigned to this driver
                const rideRequest = await RideRequests.findOne({
                    where: { 
                        id: ride_request_id,
                        driver_id: driver_id,
                        status: 'ride_started'
                    },
                    lock: true,
                    transaction
                });
                if(!rideRequest){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Ride request not found, not assigned to this driver, or ride is not in started status'
                    });
                }
                // ============================================================
                // RESERVATION TRIP - VALIDATE METER READING
                // ============================================================
                const isReservationTrip = rideRequest.trip_id === 3;
                if(isReservationTrip){
                    if(!end_otp || end_otp.length != 4){
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'Please enter a valid 4-digit OTP to complete the reservation'
                        });
                    }
                    if(rideRequest.end_ride_otp != end_otp){
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid OTP. Please verify with the passenger.'
                        });
                    }
                    if(!end_meter_reading || !req.file){
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'End meter reading and image are required for reservation trips'
                        });
                    }
                    if(parseFloat(end_meter_reading) <= parseFloat(rideRequest.start_meter_reading)){
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: `End meter reading (${end_meter_reading}) must be greater than start meter reading (${rideRequest.start_meter_reading})`
                        });
                    }
                }
                // Get driver details to check if NEFA driver
                const driverDetails = await DriverDetails.findOne({
                    where: { user_id: driver_id },
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }],
                    transaction
                });
                // Get admin settings for commission TYPE only
                const adminSettings = await Settings.findOne({
                    where: { role: 'admin' },
                    transaction
                });
                if(!adminSettings){
                    await transaction.rollback();
                    return res.status(500).json({
                        success: false,
                        message: 'Admin settings not found. Please contact support.'
                    });
                }
                // Get commission TYPE from settings (percentage or fixed)
                const commissionType = adminSettings.commission_type || 'percentage';
                // ============================================================
                // CHECK FOR ACTIVE DRIVER SUBSCRIPTION
                // ============================================================
                const currentDate = new Date();
                // Use row lock to prevent race conditions
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
                            status: 'active',
                            commission_waiver: 1
                        },
                        required: true
                    }],
                    lock: transaction.LOCK.UPDATE, 
                    transaction
                });
                let hasActiveSubscription = false;
                let subscriptionInfo      = null;
                if(activeSubscription){
                    // Check if it's a ride-based subscription and has remaining rides
                    if(activeSubscription.plan.duration_type === 'rides'){
                        if(activeSubscription.rides_remaining > 0){
                            hasActiveSubscription = true;
                            subscriptionInfo = {
                                subscription_id: activeSubscription.id,
                                plan_name: activeSubscription.plan.name,
                                duration_type: activeSubscription.plan.duration_type,
                                rides_remaining: activeSubscription.rides_remaining,
                                rides_used: activeSubscription.rides_used
                            };
                        }
                    }
                    // For day-based subscriptions, we already validated end_date in the query
                    else 
                    if(activeSubscription.plan.duration_type === 'days'){
                        hasActiveSubscription = true;
                        subscriptionInfo = {
                            subscription_id: activeSubscription.id,
                            plan_name: activeSubscription.plan.name,
                            duration_type: activeSubscription.plan.duration_type,
                            end_date: activeSubscription.end_date,
                            days_remaining: Math.ceil((new Date(activeSubscription.end_date) - currentDate) / (1000 * 60 * 60 * 24))
                        };
                    }
                }
                // ============================================================
                // FETCH PACKAGE DATA FOR RESERVATION TRIPS
                // ============================================================
                let packageData = null;
                if(isReservationTrip){
                    packageData = await Package.findOne({
                        where: { 
                            id: rideRequest.package_id,
                            status: 1 
                        },
                        transaction
                    });
                    if(!packageData){
                        await transaction.rollback();
                        return res.status(404).json({
                            success: false,
                            message: 'Package not found or inactive'
                        });
                    }
                }
                // Get vehicle type information for fare calculation AND commission value
                const vehicleType = await Vehicletypes.findOne({
                    where: { 
                        id: rideRequest.vehicle_type_id,
                        status: 1 
                    },
                    include: [{
                        model: Vehicleprices,
                        as: 'prices',
                        where: {
                            status: 1,
                            trip_id: rideRequest.trip_id, 
                            state_id: rideRequest.pickup_state_id,
                        },
                        required: false
                    }],
                    transaction
                });
                if(!vehicleType){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Vehicle type not found or inactive'
                    });
                }
                if(!vehicleType.prices || vehicleType.prices.length === 0){
                    await transaction.rollback();
                    return res.status(404).json({
                        success: false,
                        message: 'No vehicles are available for the chosen pickup state.',
                    });
                }
                // ============================================================
                // GET COMMISSION VALUE FROM VEHICLE TYPE
                // ============================================================
                let commissionValue = parseFloat(vehicleType.commission || 0);
                const isNefaDriver  = driverDetails && driverDetails.driver_type === 'nefa_driver';
                // Determine commission waiver reason
                let commissionWaiverReason = null;
                // Priority 1: Active subscription with commission waiver
                if(hasActiveSubscription){
                    commissionValue = 0;
                    commissionWaiverReason = 'subscription';
                }
                // Priority 2: NEFA driver
                else if(isNefaDriver){
                    commissionValue = 0;
                    commissionWaiverReason = 'nefa_driver';
                }
                // ============================================================
                // CALCULATE ACTUAL DISTANCE AND FARE
                // ============================================================
                let actualDistance      = 0;
                let actualRideDuration  = 0;
                let actualFareBreakdown = null;
                let excessKmCharge      = 0;
                let excessKm            = 0;
                if(isReservationTrip){
                    actualDistance      = parseFloat(end_meter_reading) - parseFloat(rideRequest.start_meter_reading);
                    const rideStartTime = new Date(rideRequest.ride_started_at);
                    const rideEndTime   = new Date();
                    actualRideDuration  = Math.round((rideEndTime - rideStartTime) / (1000 * 60));
                    actualFareBreakdown = calculateReservationFare(
                        actualDistance,
                        actualRideDuration,
                        rideRequest.trip_id,
                        vehicleType,
                        rideRequest.pickup_date,
                        rideRequest.pickup_time,
                        null,
                        null
                    );
                    const packageKm     = parseFloat(packageData.km);
                    if(actualDistance > packageKm){
                        excessKm        = actualDistance - packageKm;
                        const perKmRate = parseFloat(vehicleType.prices[0].reservation_per_km_charges || 0);
                        excessKmCharge  = excessKm * perKmRate;
                    }
                }else{
                    const pickup = {
                        latitude: rideRequest.pickup_latitude,
                        longitude: rideRequest.pickup_longitude
                    };
                    const actualDrop = {
                        latitude: drop.latitude,
                        longitude: drop.longitude
                    };
                    const stop1 = rideRequest.stop1_latitude && rideRequest.stop1_longitude ? {
                        latitude: rideRequest.stop1_latitude,
                        longitude: rideRequest.stop1_longitude
                    } : null;
                    const stop2 = rideRequest.stop2_latitude && rideRequest.stop2_longitude ? {
                        latitude: rideRequest.stop2_latitude,
                        longitude: rideRequest.stop2_longitude
                    } : null;
                    const rideStartTime   = new Date(rideRequest.ride_started_at);
                    const rideEndTime     = new Date();
                    actualRideDuration    = Math.round((rideEndTime - rideStartTime) / (1000 * 60));
                    const actualEstimates = await calculateInitialEstimates(
                        pickup, actualDrop, stop1, stop2, 
                        rideRequest.trip_id, rideRequest.trip_type, vehicleType, 
                        rideRequest.pickup_date, rideRequest.pickup_time, 
                        rideRequest.estimated_duration, actualRideDuration
                    );
                    if(!actualEstimates || !actualEstimates.success || !actualEstimates.breakdown){
                        await transaction.rollback();
                        return res.status(503).json({
                            success: false,
                            message: 'Unable to calculate actual route estimates. Please try again later.',
                            error: actualEstimates?.error
                        });
                    }
                    actualFareBreakdown = actualEstimates.breakdown;
                    actualDistance      = actualFareBreakdown.distance;
                }
                // ============================================================
                // CALCULATE FINAL FARE WITH EXCESS KM AND DISCOUNT
                // ============================================================
                let baseFinalFare = actualFareBreakdown.totalWithBataAndGst;
                if(isReservationTrip && excessKmCharge > 0){
                    baseFinalFare += excessKmCharge;
                }
                let finalActualFare = baseFinalFare;
                if(rideRequest.coupon_id && rideRequest.discount_amount > 0){
                    finalActualFare = baseFinalFare - rideRequest.discount_amount;
                }
                // ============================================================
                // HANDLE ADVANCE PAYMENT DEDUCTION FOR RESERVATION TRIPS
                // ============================================================
                let remainingAmountToPay = finalActualFare;
                let advancePaidAmount    = 0;
                if(isReservationTrip && rideRequest.is_advance_paid){
                    advancePaidAmount    = parseFloat(rideRequest.advance_paid_amount || 0);
                    remainingAmountToPay = Math.max(0, finalActualFare - advancePaidAmount);
                }
                // ============================================================
                // CALCULATE COMMISSION AND DRIVER PAYOUT
                // ============================================================
                const commissionAmount = calculateCommission(finalActualFare, commissionValue, commissionType);
                const driverPayout     = finalActualFare - commissionAmount;
                // Calculate commission saved if applicable
                let commissionSaved    = 0;
                if(commissionWaiverReason === 'subscription'){
                    // Calculate what the commission would have been without subscription
                    const normalCommissionValue = parseFloat(vehicleType.commission || 0);
                    commissionSaved    = calculateCommission(finalActualFare, normalCommissionValue, commissionType);
                }
                // Determine amount to deduct from wallet
                const amountToDeduct   = isReservationTrip ? remainingAmountToPay : finalActualFare;
                // ============================================================
                // HANDLE WALLET PAYMENT
                // ============================================================
                let switchedToCash         = false;
                let walletPaymentProcessed = false;
                let passengerWalletBalance = 0;
                if(rideRequest.payment_method === 'wallet'){
                    const passengerWallet  = await Wallets.findOne({
                        where: { 
                            user_id: rideRequest.user_id, 
                            status: 'active' 
                        },
                        lock: true,
                        transaction
                    });
                    if(!passengerWallet){
                        await transaction.rollback();
                        return res.status(404).json({
                            success: false,
                            message: 'Passenger wallet not found'
                        });
                    }
                    // Check if wallet has sufficient balance
                    passengerWalletBalance = parseFloat(passengerWallet.balance);
                    if(passengerWalletBalance < amountToDeduct){
                        switchedToCash = true;
                    }else{
                        // DEDUCT from passenger wallet
                        const newPassengerBalance = passengerWalletBalance - amountToDeduct;
                        await Wallets.update({
                            balance: parseFloat(newPassengerBalance.toFixed(2)),
                            updated_at: new Date()
                        }, {
                            where: { id: passengerWallet.id },
                            transaction
                        });
                        // Create passenger wallet transaction (DEBIT)
                        const transactionDescription = isReservationTrip 
                            ? `Payment for reservation ride #${ride_request_id} (Remaining: ₹${amountToDeduct.toFixed(2)} after advance: ₹${advancePaidAmount.toFixed(2)})`
                            : `Payment for ride #${ride_request_id}`;
                        await WalletTransactions.create({
                            wallet_id: passengerWallet.id,
                            user_id: rideRequest.user_id,
                            transaction_id: `RIDE_PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                            reference_type: 'ride_payment',
                            reference_id: ride_request_id,
                            type: 'debit',
                            amount: parseFloat(amountToDeduct.toFixed(2)),
                            balance_before: passengerWalletBalance,
                            balance_after: newPassengerBalance,
                            description: transactionDescription,
                            status: 'completed',
                            processed_at: new Date(),
                            metadata: JSON.stringify({ 
                                ride_request_id, 
                                final_fare: finalActualFare,
                                is_reservation: isReservationTrip,
                                advance_paid: advancePaidAmount,
                                amount_deducted: amountToDeduct,
                                payment_method: 'wallet'
                            }),
                            created_at: new Date(),
                            updated_at: new Date()
                        }, { transaction });
                        // ============================================================
                        // CREDIT DRIVER PAYOUT TO WALLET
                        // ============================================================
                        const driverWallet = await Wallets.findOne({
                            where: { 
                                user_id: driver_id, 
                                status: 'active' 
                            },
                            lock: true,
                            transaction
                        });
                        if(!driverWallet){
                            await transaction.rollback();
                            return res.status(404).json({
                                success: false,
                                message: 'Driver wallet not found'
                            });
                        }
                        const currentDriverBalance = parseFloat(driverWallet.balance);
                        const newDriverBalance     = currentDriverBalance + driverPayout;
                        await Wallets.update({
                            balance: parseFloat(newDriverBalance.toFixed(2)),
                            total_earned: parseFloat(driverWallet.total_earned || 0) + parseFloat(driverPayout.toFixed(2)),
                            updated_at: new Date()
                        }, {
                            where: { id: driverWallet.id },
                            transaction
                        });
                        // Create driver wallet transaction (CREDIT - Payout)
                        await WalletTransactions.create({
                            wallet_id: driverWallet.id,
                            user_id: driver_id,
                            transaction_id: `PAYOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                            reference_type: 'driver_payout',
                            reference_id: ride_request_id,
                            type: 'credit',
                            amount: parseFloat(driverPayout.toFixed(2)),
                            balance_before: currentDriverBalance,
                            balance_after: newDriverBalance,
                            description: `Driver payout for ride #${ride_request_id} - Paid by Admin (Wallet payment)`,
                            status: 'completed',
                            processed_at: new Date(),
                            metadata: JSON.stringify({ 
                                ride_request_id, 
                                final_fare: finalActualFare,
                                commission_amount: commissionAmount,
                                commission_value: commissionValue,
                                commission_type: commissionType,
                                commission_waiver_reason: commissionWaiverReason,
                                commission_saved: commissionSaved,
                                driver_payout: driverPayout,
                                payment_method: 'wallet',
                                subscription_info: subscriptionInfo,
                                note: 'Admin credited driver payout after passenger paid via wallet'
                            }),
                            created_at: new Date(),
                            updated_at: new Date()
                        }, { transaction });
                        
                        walletPaymentProcessed = true;
                    }
                }
                // ============================================================
                // UPDATE SUBSCRIPTION USAGE (IF APPLICABLE)
                // ============================================================
                if(hasActiveSubscription && activeSubscription){
                    console.log(`📋 Updating subscription usage for driver ${driver_id}`);
                    
                    // Parse metadata safely
                    let metadata = {};
                    try{
                        metadata = JSON.parse(activeSubscription.metadata || '{}');
                    }catch(e){
                        console.warn('Failed to parse subscription metadata:', e);
                    }
                    
                    // For ride-based subscriptions, decrement rides_remaining
                    if(activeSubscription.plan.duration_type === 'rides'){
                        const newRidesRemaining = activeSubscription.rides_remaining - 1;
                        const newRidesUsed      = activeSubscription.rides_used + 1;
                        const isExpiring        = newRidesRemaining <= 0;
                        
                        await DriverSubscriptions.update({
                            rides_remaining: newRidesRemaining,
                            rides_used: newRidesUsed,
                            status: isExpiring ? 'expired' : 'active',
                            updated_at: new Date(),
                            metadata: JSON.stringify({
                                ...metadata,
                                last_ride_at: new Date(),
                                last_ride_id: ride_request_id,
                                ...(isExpiring && { 
                                    expired_at: new Date(),
                                    expired_by: 'ride_completion'
                                })
                            })
                        }, {
                            where: { id: activeSubscription.id },
                            transaction
                        });
                        
                        console.log(`📊 Ride-based subscription updated:`, {
                            subscription_id: activeSubscription.id,
                            rides_used: newRidesUsed,
                            rides_remaining: newRidesRemaining,
                            status: isExpiring ? 'expired' : 'active'
                        });
                        
                        // FIX: Store activation data ONLY if subscription just expired
                        if(isExpiring){
                            console.log(`🔄 Ride-based subscription expired, will schedule activation after commit...`);
                            shouldScheduleActivation = true;
                            activationData = {
                                driver_id: driver_id,
                                expired_subscription_id: activeSubscription.id
                            };
                        }
                    }
                    // For day-based subscriptions, check if expired
                    else if(activeSubscription.plan.duration_type === 'days'){
                        const currentDate = new Date();
                        const endDate     = new Date(activeSubscription.end_date);
                        
                        // Check if subscription has expired
                        if(currentDate > endDate){
                            console.log(`⏰ Day-based subscription expired for driver ${driver_id}`);
                            
                            await DriverSubscriptions.update({
                                status: 'expired',
                                updated_at: new Date(),
                                metadata: JSON.stringify({
                                    ...metadata,
                                    expired_at: new Date(),
                                    expired_by: 'ride_completion',
                                    last_ride_at: new Date(),
                                    last_ride_id: ride_request_id
                                })
                            }, {
                                where: { id: activeSubscription.id },
                                transaction
                            });
                            
                            // FIX: Store activation data for async processing
                            shouldScheduleActivation = true;
                            activationData = {
                                driver_id: driver_id,
                                expired_subscription_id: activeSubscription.id
                            };
                        }else{
                            // Subscription still active, just update metadata
                            await DriverSubscriptions.update({
                                metadata: JSON.stringify({
                                    ...metadata,
                                    last_ride_at: new Date(),
                                    last_ride_id: ride_request_id
                                }),
                                updated_at: new Date()
                            }, {
                                where: { id: activeSubscription.id },
                                transaction
                            });
                            
                            const daysRemaining = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));
                            console.log(`📊 Day-based subscription still active: ${daysRemaining} days remaining`);
                        }
                    }
                    
                    // ============================================================
                    // RECORD USAGE IN SUBSCRIPTION_USAGE_HISTORY
                    // ============================================================
                    await SubscriptionUsageHistory.create({
                        subscription_id: activeSubscription.id,
                        ride_request_id: ride_request_id,
                        used_at: new Date(),
                        commission_saved: parseFloat(commissionSaved.toFixed(2)),
                        ride_fare: parseFloat(finalActualFare.toFixed(2)),
                        metadata: JSON.stringify({
                            plan_name: activeSubscription.plan.name,
                            duration_type: activeSubscription.plan.duration_type,
                            original_commission: commissionSaved,
                            commission_waived: true,
                            ride_details: {
                                pickup: rideRequest.pickup_address,
                                drop: rideRequest.dropoff_address,
                                distance: actualDistance,
                                duration: actualRideDuration
                            }
                        }),
                        created_at: new Date()
                    }, { transaction });
                    
                    console.log(`✅ Subscription usage recorded for subscription ${activeSubscription.id}`);
                }
                // ============================================================
                // UPDATE RIDE REQUEST WITH ACTUAL VALUES
                // ============================================================
                const updateData = {
                    status: 'ride_completed',
                    actual_distance: parseFloat(actualDistance.toFixed(2)),
                    actual_duration: actualRideDuration,
                    actual_fare: parseFloat(actualFareBreakdown.totalWithBataAndGst.toFixed(2)),
                    actual_base_fare: parseFloat(actualFareBreakdown.baseFare.toFixed(2)),
                    actual_distance_charge: parseFloat(actualFareBreakdown.distanceCharge.toFixed(2)),
                    actual_waiting_charge: parseFloat(actualFareBreakdown.waitingTimeXExtraTime.toFixed(2)),
                    actual_bata_charge: parseFloat(actualFareBreakdown.distancePlusDurationXBata.toFixed(2)),
                    actual_subtotal: parseFloat(actualFareBreakdown.subtotal.toFixed(2)),
                    actual_total_gst_amount: parseFloat(actualFareBreakdown.gstAmount.toFixed(2)),
                    final_fare: parseFloat(finalActualFare.toFixed(2)),
                    discount_amount: rideRequest.discount_amount,
                    actual_fare_breakdown: JSON.stringify(actualFareBreakdown),
                    commission_value: commissionValue,
                    commission_type: commissionType,
                    commission_amount: parseFloat(commissionAmount.toFixed(2)),
                    driver_payout: parseFloat(driverPayout.toFixed(2)),
                    dropoff_address: drop.address,
                    dropoff_latitude: drop.latitude,
                    dropoff_longitude: drop.longitude,
                    ride_completed_at: new Date()
                };
                // Update payment status based on wallet payment result
                if(walletPaymentProcessed){
                    updateData.payment_status = 'paid';
                    updateData.payment_method = 'wallet';
                }else if(switchedToCash){
                    updateData.payment_method = 'cash';
                    updateData.payment_status = 'pending';
                }
                // If already cash, keep it as cash with pending status
                if(isReservationTrip){
                    updateData.end_meter_reading = parseFloat(end_meter_reading);
                    updateData.end_meter_image = req.file.filename;
                    updateData.remaining_fare_to_pay = parseFloat(remainingAmountToPay.toFixed(2));
                    updateData.end_otp_verified_at = new Date();
                }
                await RideRequests.update(updateData, {
                    where: { id: ride_request_id },
                    transaction
                });
                // ============================================================
                // UPDATE COUPON USAGE
                // ============================================================
                if(rideRequest.coupon_id){
                    await PromoUsages.create({
                        user_id: rideRequest.user_id,
                        promo_id: rideRequest.coupon_id,
                        ride_id: ride_request_id,
                        discount_amount: rideRequest.discount_amount,
                        created_at: new Date()
                    }, { transaction });
                }
                // ============================================================
                // CLEAR PENDING CANCELLATION CHARGES (IF WALLET PAYMENT)
                // ============================================================
                if(walletPaymentProcessed && rideRequest.pending_cancellation_applied && rideRequest.pending_cancellation_amount > 0){
                    await clearPendingCancellationCharges(
                        rideRequest.user_id, 
                        rideRequest.pending_cancellation_amount,
                        transaction
                    );
                }
                await transaction.commit();
                console.log('✅ Ride completion transaction committed');
                // ============================================================
                // SCHEDULE SUBSCRIPTION ACTIVATION (OUTSIDE TRANSACTION)
                // ============================================================
                if(shouldScheduleActivation && activationData){
                    console.log(`🔄 Scheduling subscription activation for driver ${activationData.driver_id}...`);
                    setImmediate(async () => {
                        try{
                            const { scheduleSubscriptionActivation } = require('../utils/subscriptionActivation');
                            const result = await scheduleSubscriptionActivation(
                                activationData.driver_id, 
                                activationData.expired_subscription_id
                            );
                            if(result.success){
                                console.log(`✅ Subscription activation scheduled: ${result.jobId} (${result.status})`);
                            }else{
                                console.error(`⚠️  Failed to schedule subscription activation:`, result.error);
                            }
                        }catch(activationError){
                            console.error(`⚠️  Error in async subscription activation:`, activationError);
                        }
                    });
                }
                // ============================================================
                // SEND COMPLETION NOTIFICATION
                // ============================================================
                let notificationSent = false;
                try{
                    const result = await FirebaseService.sendRideCompletionNotification(
                        rideRequest.user_id, 
                        driver_id, 
                        ride_request_id,
                        {
                            actualDistance: actualDistance,
                            actualDuration: actualRideDuration,
                            actualFare: actualFareBreakdown.totalWithBataAndGst,
                            finalFare: finalActualFare,
                            is_rated: rideRequest.is_rated,
                            payment_status: walletPaymentProcessed ? 'paid' : 'pending',
                            payment_method: walletPaymentProcessed ? 'wallet' : 'cash'
                        }
                    );
                    notificationSent = result && result.notification_sent === true;
                }catch(error){
                    console.error('Firebase operations failed:', error);
                    notificationSent = false;
                }
                // ============================================================
                // PREPARE RESPONSE
                // ============================================================
                let responseMessage = '';
                let paymentInstructions = {};
                if(walletPaymentProcessed){
                    responseMessage = isReservationTrip 
                        ? 'Reservation ride completed successfully. Payment deducted from passenger wallet.' 
                        : 'Ride completed successfully. Payment deducted from passenger wallet.';
                    paymentInstructions = {
                        payment_status: 'paid',
                        payment_method: 'wallet',
                        message: 'Payment automatically deducted from passenger wallet and driver payout credited'
                    };
                }else 
                if(switchedToCash){
                    responseMessage = 'Ride completed. Insufficient wallet balance - payment method switched to cash.';
                    paymentInstructions = {
                        payment_status: 'pending',
                        payment_method: 'cash',
                        message: 'Passenger wallet had insufficient balance. Please collect cash payment.',
                        insufficient_balance: true,
                        passenger_balance: parseFloat(passengerWalletBalance).toFixed(2),
                        amount_required: amountToDeduct.toFixed(2),
                        next_actions: {
                            cash_payment: 'Call collectCash API after receiving cash from passenger',
                            qr_payment: 'Call createOrderWithQR API to generate payment QR code'
                        }
                    };
                }else{
                    responseMessage = isReservationTrip 
                        ? 'Reservation ride completed successfully. Please proceed to collect payment.' 
                        : 'Ride completed successfully. Please proceed to collect payment.';
                    paymentInstructions = {
                        payment_status: 'pending',
                        payment_method: 'cash',
                        next_actions: {
                            cash_payment: 'Call collectCash API after receiving cash from passenger',
                            qr_payment: 'Call createOrderWithQR API to generate payment QR code'
                        }
                    };
                }
                const responseData = {
                    success: true,
                    message: responseMessage,
                    notification: notificationSent,
                    data: {
                        ride_request_id: ride_request_id,
                        trip_type: rideRequest.trip_id === 3 ? 'RESERVATION' : (rideRequest.trip_type === 1 ? 'INTERCITY' : 'OUTSTATION'),
                        actual_distance: actualDistance,
                        actual_duration: actualRideDuration,
                        actual_fare: actualFareBreakdown.totalWithBataAndGst,
                        final_fare: finalActualFare,
                        estimated_distance: rideRequest.estimated_distance,
                        estimated_duration: rideRequest.estimated_duration,
                        estimated_fare: rideRequest.estimated_fare,
                        discount_amount: rideRequest.discount_amount,
                        payment_info: paymentInstructions,
                        completed_at: new Date(),
                        fare_breakdown: {
                            estimated: JSON.parse(rideRequest.fare_breakdown || '{}'),
                            actual: actualFareBreakdown
                        },
                        commission_amount: parseFloat(commissionAmount.toFixed(2)),
                        driver_payout: parseFloat(driverPayout.toFixed(2)),
                        commission_info: {
                            commission_value: commissionValue,
                            commission_type: commissionType,
                            commission_waived: commissionValue === 0,
                            waiver_reason: commissionWaiverReason,
                            commission_saved: parseFloat(commissionSaved.toFixed(2)),
                            subscription_applied: hasActiveSubscription
                        }
                    }
                };
                // Add subscription details if applicable
                if(hasActiveSubscription && subscriptionInfo){
                    responseData.data.subscription_details = subscriptionInfo;
                }
                // Add reservation-specific details
                if(isReservationTrip){
                    responseData.data.reservation_details = {
                        package_km: parseFloat(packageData.km),
                        actual_km: actualDistance,
                        excess_km: excessKm,
                        excess_km_charge: excessKmCharge,
                        start_meter_reading: parseFloat(rideRequest.start_meter_reading),
                        end_meter_reading: parseFloat(end_meter_reading),
                        advance_paid: advancePaidAmount,
                        remaining_to_pay: remainingAmountToPay
                    };
                }
                return res.status(200).json(responseData);
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                throw error;
            }
        }catch(error){
            console.error('❌ RideComplete error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update ride completion. Please try again.' 
            });
        }
    },

    // COLLECT CASH
    collectCash: async (req, res) => {
        try{
            const { ride_request_id } = req.params;
            // Validate user authentication and role
            const userValidation = await validationUtils.validateUserAuth(req, 3, 'Driver');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id: driver_id } = userValidation;
            // Input validation
            if(!ride_request_id){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            // Use database transaction for consistency
            const transaction = await sequelize.transaction();
            try{
                // Find the ride request and verify it's assigned to this driver
                const rideRequest = await RideRequests.findOne({
                    where: { 
                        id             : ride_request_id,
                        driver_id      : driver_id,
                        status         : 'ride_completed'
                    },
                    include: [
                        {
                            model: User,
                            as: 'passenger',
                            attributes: ['id', 'name', 'mobile', 'fcm_token']
                        }
                    ],
                    lock: true,
                    transaction
                });
                if(!rideRequest){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Ride request not found, not assigned to this driver, ride is not completed'
                    });
                }
                // Check if payment is already collected
                if(rideRequest.payment_status === 'paid'){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Payment has already been collected for this ride'
                    });
                }
                // ============================================================
                // DEDUCT COMMISSION FROM DRIVER WALLET
                // ============================================================
                const finalFare        = parseFloat(rideRequest.final_fare);
                const commissionAmount = parseFloat(rideRequest.commission_amount || 0);
                const driverPayout     = parseFloat(rideRequest.driver_payout || (finalFare - commissionAmount));
                // Get admin settings for wallet negative limit
                const adminSettings = await Settings.findOne({
                    where: { role: 'admin' }
                });
                if(!adminSettings){
                    await transaction.rollback();
                    return res.status(500).json({
                        success: false,
                        message: 'Admin settings not found. Please contact support.'
                    });
                }
                const walletNegativeLimit = parseFloat(adminSettings.wallet_negative_limit || 0);
                // Get driver wallet
                const driverWallet = await Wallets.findOne({
                    where: { 
                        user_id: driver_id, 
                        status: 'active' 
                    },
                    lock: true,
                    transaction
                });
                if(!driverWallet){
                    await transaction.rollback();
                    return res.status(404).json({
                        success: false,
                        message: 'Driver wallet not found'
                    });
                }
                let walletTransactionCreated = false;
                // Only deduct commission if it's greater than 0
                if(commissionAmount > 0){
                    const currentBalance         = parseFloat(driverWallet.balance);
                    const balanceAfterCommission = currentBalance - commissionAmount;
                    // Check if deduction would exceed negative limit
                    if(balanceAfterCommission < -walletNegativeLimit){
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: `Commission deduction would exceed wallet negative limit of ₹${walletNegativeLimit}. Current balance: ₹${currentBalance.toFixed(2)}, Commission: ₹${commissionAmount.toFixed(2)}`
                        });
                    }
                    // Deduct commission from driver wallet
                    await Wallets.update({
                        balance: parseFloat(balanceAfterCommission.toFixed(2)),
                        updated_at: new Date()
                    }, {
                        where: { id: driverWallet.id },
                        transaction
                    });
                    // Create driver commission transaction (DEBIT)
                    await WalletTransactions.create({
                        wallet_id: driverWallet.id,
                        user_id: driver_id,
                        transaction_id: `COMM_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        reference_type: 'driver_commission',
                        reference_id: ride_request_id,
                        type: 'debit',
                        amount: parseFloat(commissionAmount.toFixed(2)),
                        balance_before: currentBalance,
                        balance_after: balanceAfterCommission,
                        description: `Commission deduction for completed ride #${ride_request_id} (Cash payment collected)`,
                        status: 'completed',
                        processed_at: new Date(),
                        metadata: JSON.stringify({ 
                            ride_request_id, 
                            final_fare: finalFare, 
                            commission_value: rideRequest.commission_value,
                            commission_type: rideRequest.commission_type,
                            driver_payout: driverPayout,
                            payment_method: 'cash',
                            note: 'Commission deducted after driver collected cash from passenger'
                        }),
                        created_at: new Date(),
                        updated_at: new Date()
                    }, { transaction });
                    walletTransactionCreated = true;
                }
                // Update payment status to 'paid'
                await RideRequests.update({
                    payment_status : 'paid',
                    payment_method : 'cash',
                    updated_at     : new Date()
                }, {
                    where: { id: ride_request_id },
                    transaction
                });
                // After successful payment processing
                if(rideRequest.pending_cancellation_applied && rideRequest.pending_cancellation_amount > 0){
                    await clearPendingCancellationCharges(
                        rideRequest.user_id, 
                        rideRequest.pending_cancellation_amount,
                        transaction
                    );
                }
                await transaction.commit();
                return res.status(200).json({
                    success             : true,
                    message             : 'Cash payment collected successfully',
                    data                : {
                        ride_request_id : ride_request_id,
                        final_fare      : rideRequest.final_fare,
                        collected_at    : new Date(),
                        fare_breakdown  : rideRequest.actual_fare_breakdown
                    }
                });
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                throw error;
            }
        }catch(error){
            console.error('❌ CollectCash error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update payment status. Please try again.' 
            });
        }
    },

    // TIP AMOUNT
    tipAmount: async (req, res) => {
        try{
            const { ride_request_id, tip_amount } = req.body;
            // Validate user authentication and role
            const userValidation = await validationUtils.validateUserAuth(req, 2, 'User');
            if(!userValidation.success){
                return res.status(userValidation.status).json({
                    success: false,
                    message: userValidation.message
                });
            }
            const { user_id, user } = userValidation;
            // Input validation
            if(!ride_request_id || !Number.isInteger(ride_request_id)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            if(tip_amount === undefined || tip_amount === null){
                return res.status(400).json({
                    success: false,
                    message: 'Tip amount is required'
                });
            }
            // Validate tip amount is a valid number and non-negative
            const tipAmountFloat = parseFloat(tip_amount);
            if(isNaN(tipAmountFloat) || tipAmountFloat < 0){
                return res.status(400).json({
                    success: false,
                    message: 'Tip amount must be a valid non-negative number'
                });
            }
            // Set reasonable tip limits
            const MAX_TIP_AMOUNT = 500.00;
            if(tipAmountFloat > MAX_TIP_AMOUNT){
                return res.status(400).json({
                    success: false,
                    message: `Tip amount cannot exceed ₹${MAX_TIP_AMOUNT}`
                });
            }
            const transaction = await sequelize.transaction();
            try{
                // Find the ride request and verify it belongs to this user
                const rideRequest = await RideRequests.findOne({
                    where: { 
                        id: ride_request_id,
                        user_id: user_id
                    },
                    lock: true,
                    transaction
                });
                if(!rideRequest){
                    await transaction.rollback();
                    return res.status(404).json({
                        success: false,
                        message: 'Ride request not found or not authorized'
                    });
                }
                // Verify ride is completed
                if(rideRequest.status !== 'ride_completed'){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Tips can only be added to completed rides'
                    });
                }
                // Verify ride has a driver assigned
                if(!rideRequest.driver_id){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'No driver assigned to this ride'
                    });
                }
                // Check if tip has already been added
                if(rideRequest.tip_amount && rideRequest.tip_amount > 0){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Tip has already been added to this ride',
                        current_tip: rideRequest.tip_amount
                    });
                }
                // Calculate new driver payout including tip
                const currentDriverPayout = parseFloat(rideRequest.driver_payout || 0);
                const newDriverPayout     = currentDriverPayout + tipAmountFloat;
                // Update ride request with tip amount and new driver payout
                await RideRequests.update({
                    tip_amount    : parseFloat(tipAmountFloat.toFixed(2)),
                    driver_payout : parseFloat(newDriverPayout.toFixed(2)),
                    updated_at    : new Date()
                },{
                    where: { id: ride_request_id },
                    transaction
                });
                // If tip amount is greater than 0, handle payment processing
                if(tipAmountFloat > 0){
                    // Check payment method and process tip payment
                    if(rideRequest.payment_method === 'wallet'){
                        // Deduct tip from user's wallet
                        const wallet = await Wallets.findOne({
                            where: { 
                                user_id: user_id, 
                                status: 1 
                            },
                            lock: true,
                            transaction
                        });
                        if(!wallet){
                            await transaction.rollback();
                            return res.status(404).json({
                                success: false,
                                message: 'Wallet not found for this user'
                            });
                        }
                        // Check if wallet has sufficient balance for tip
                        if(parseFloat(wallet.balance) < tipAmountFloat){
                            await transaction.rollback();
                            return res.status(400).json({
                                success: false,
                                message: 'Insufficient wallet balance for tip amount'
                            });
                        }
                        // Deduct tip from wallet
                        const newWalletBalance = parseFloat(wallet.balance) - tipAmountFloat;
                        await Wallets.update({
                            balance: parseFloat(newWalletBalance.toFixed(2)),
                            updated_at: new Date()
                        }, {
                            where: { id: wallet.id },
                            transaction
                        });
                        // Create wallet transaction record for tip
                        await WalletTransactions.create({
                            wallet_id        : wallet.id,
                            user_id          : user_id,
                            transaction_type : 'debit',
                            amount           : tipAmountFloat,
                            balance_after    : newWalletBalance,
                            description      : `Tip payment for ride #${ride_request_id}`,
                            ride_id          : ride_request_id,
                            status           : 'completed',
                            created_at       : new Date()
                        }, { transaction });
                    }
                    // Add tip amount to driver's wallet/earnings
                    const driverWallet = await Wallets.findOne({
                        where: { 
                            user_id: rideRequest.driver_id, 
                            status: 1 
                        },
                        lock: true,
                        transaction
                    });
                    if(driverWallet){
                        const newDriverWalletBalance = parseFloat(driverWallet.balance) + tipAmountFloat;
                        await Wallets.update({
                            balance: parseFloat(newDriverWalletBalance.toFixed(2)),
                            updated_at: new Date()
                        }, {
                            where: { id: driverWallet.id },
                            transaction
                        });

                        // Create wallet transaction record for driver tip credit
                        await WalletTransactions.create({
                            wallet_id        : driverWallet.id,
                            user_id          : rideRequest.driver_id,
                            transaction_type : 'credit',
                            amount           : tipAmountFloat,
                            balance_after    : newDriverWalletBalance,
                            description      : `Tip received for ride #${ride_request_id}`,
                            ride_id          : ride_request_id,
                            status           : 'completed',
                            created_at       : new Date()
                        }, { transaction });
                    }
                }
                await transaction.commit();
                return res.status(200).json({
                    success : true,
                    message : tipAmountFloat > 0 ? 'Tip added successfully!' : 'Tip amount updated to ₹0.00',
                    data    : {
                        ride_request_id        : ride_request_id,
                        tip_amount             : parseFloat(tipAmountFloat.toFixed(2)),
                        previous_driver_payout : currentDriverPayout,
                        new_driver_payout      : newDriverPayout,
                        payment_method         : rideRequest.payment_method,
                        updated_at             : new Date()
                    }
                });
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                throw error;
            }
        }catch(error){
            console.error('❌ Tip amount error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update tip amount. Please try again.' 
            });
        }
    },

    // GET CURRENT RIDE
    getCurrentRide: async (req, res) => {
        try{
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId         = req.user.userId;
            const userRole       = req.user.role;
            let activeRide;
            let whereCondition   = {};
            let includeArray     = [];
            const activeStatuses = ['searching_driver', 'accepted', 'arrived', 'ride_started', 'ride_completed'];
            if(userRole === 'Driver'){
                whereCondition = {
                    driver_id: userId,
                    status: {
                        [Op.in]: activeStatuses
                    }
                };
                includeArray = [
                    {
                        model       : User,
                        as          : 'passenger',
                        attributes  : ['id', 'name', 'mobile', 'profile'],
                        required    : true
                    },
                    {
                        model       : Vehicletypes,
                        as          : 'vehicleType',
                        attributes  : ['id', 'name', 'image', 'description', 'capacity']
                    },
                    {
                        model       : Package,
                        as          : 'package',
                        attributes  : ['id', 'name', 'km', 'advance', 'status'],
                        required    : false
                    },
                    {
                        model       : ReservationAdvancePayment,
                        as          : 'advancePayment',
                        attributes  : ['id', 'advance_amount', 'payment_status', 'created_at'],
                        required    : false
                    }
                ];
            }else{
                whereCondition = {
                    user_id         : userId,
                    status          : {
                        [Op.in]     : activeStatuses
                    }
                };
                includeArray = [
                    {
                        model       : User,
                        as          : 'driver',
                        attributes  : ['id', 'name', 'mobile', 'profile', 'gender'],
                        required    : false,
                        include     : [{
                            model   : DriverDetails,
                            attributes: [
                                'vehicle_rc_no', 
                                'rating', 
                                'license_number', 
                                'vehicle_id', 
                                'vehicle_type_id',
                                'status',
                                'vehicle_images',
                                'aadhar_no',
                                'mobile_code'
                            ]
                        }]
                    },
                    {
                        model       : Vehicletypes,
                        as          : 'vehicleType',
                        attributes  : ['id', 'name', 'image', 'description', 'capacity']
                    },
                    {
                        model       : Package,
                        as          : 'package',
                        attributes  : ['id', 'name', 'km', 'advance', 'status'],
                        required    : false
                    },
                    {
                        model       : ReservationAdvancePayment,
                        as          : 'advancePayment',
                        attributes  : ['id', 'advance_amount', 'payment_status', 'created_at'],
                        required    : false
                    }
                ];
            }
            // Find active ride
            activeRide = await RideRequests.findOne({
                where   : whereCondition,
                include : includeArray,
                order   : [['created_at', 'DESC']]
            });
            if(!activeRide){
                return res.status(404).json({
                    success: false,
                    message: 'No active ride found'
                });
            }
            // Get driver's completed ride count
            const completedRideCount = await RideRequests.count({
                where: { driver_id: activeRide.driver_id, status: 'ride_completed' }
            });
            let response_data               = {
                ride_request_id             : activeRide.id,
                status                      : activeRide.status,
                trip_details                : {
                    trip_id                 : getTripTypeName(activeRide.trip_id),
                    trip_type               : activeRide.trip_type === 1 ? 'intercity' : 'outstation',
                    vehicle_type            : activeRide.vehicleType ? {
                        id                  : activeRide.vehicleType.id,
                        name                : activeRide.vehicleType.name,
                        image               : activeRide.vehicleType.image ? `${BASE_URL}/uploads/vehicle-types/${activeRide.vehicleType.image}` : null,
                        description         : activeRide.vehicleType.description,
                        capacity            : activeRide.vehicleType.capacity
                    } : null,
                    pickup_address          : activeRide.pickup_address,
                    pickup_latitude         : activeRide.pickup_latitude,
                    pickup_longitude        : activeRide.pickup_longitude,
                    dropoff_address         : activeRide.dropoff_address,
                    dropoff_latitude        : activeRide.dropoff_latitude,
                    dropoff_longitude       : activeRide.dropoff_longitude,
                    estimated_fare          : activeRide.estimated_fare,
                    final_fare              : activeRide.final_fare,
                    estimated_distance      : activeRide.estimated_distance,
                    estimated_duration      : activeRide.estimated_duration,
                    special_instructions    : activeRide.special_instructions,
                    payment_method          : activeRide.payment_method,
                    payment_status          : activeRide.payment_status,
                    is_reservation_started  : activeRide.is_reservation_started
                }
            };
            // Add stop details if available
            if(activeRide.stop1_address){
                response_data.trip_details.stop1 = {
                    address                 : activeRide.stop1_address,
                    latitude                : activeRide.stop1_latitude,
                    longitude               : activeRide.stop1_longitude
                };
            }
            if(activeRide.stop2_address){
                response_data.trip_details.stop2 = {
                    address                 : activeRide.stop2_address,
                    latitude                : activeRide.stop2_latitude,
                    longitude               : activeRide.stop2_longitude
                };
            }
            // Add timestamps for different stages
            response_data.timeline = {
                requested_at                : activeRide.created_at,
                accepted_at                 : activeRide.accepted_at,
                arrived_at                  : activeRide.arrived_at,
                ride_started_at             : activeRide.ride_started_at,
                ride_completed_at           : activeRide.ride_completed_at,
                cancelled_at                : activeRide.cancelled_at
            };
            if(userRole === 'Driver'){
                if(activeRide.passenger){ 
                    response_data.user_details = {
                        id                  : activeRide.passenger.id,
                        name                : activeRide.passenger.name,
                        mobile              : activeRide.passenger.mobile,
                        profile             : activeRide.passenger.profile,
                        completed_ride      : completedRideCount
                    };
                }
                if(['accepted', 'arrived'].includes(activeRide.status)){
                    response_data.verification = {
                        ride_otp            : activeRide.ride_otp,
                        otp_generated_at    : activeRide.otp_generated_at,
                        otp_verified_at     : activeRide.otp_verified_at
                    };
                }
                if(['ride_started', 'ride_completed'].includes(activeRide.status)){
                    response_data.verification = {
                        end_ride_otp        : activeRide.end_ride_otp,
                        end_otp_generated_at: activeRide.end_otp_generated_at,
                        end_otp_verified_at : activeRide.end_otp_verified_at
                    };
                }
                const driverLocation = await DriverLocation.findOne({
                    where: { driver_id: userId }
                });
                if(driverLocation){
                    response_data.driver_location = {
                        current_latitude    : driverLocation.latitude,
                        current_longitude   : driverLocation.longitude,
                        updated_at          : driverLocation.updated_at
                    };
                }
            }else{
                if(activeRide.driver){
                    const driverLocation = await DriverLocation.findOne({
                        where: { driver_id: activeRide.driver_id }
                    });
                    response_data.driver_details = {
                        id                  : activeRide.driver.id,
                        name                : activeRide.driver.name,
                        mobile              : activeRide.driver.mobile,
                        profile             : activeRide.driver.profile,
                        gender              : activeRide.driver.gender,
                        current_latitude    : driverLocation?.latitude || null,
                        current_longitude   : driverLocation?.longitude || null
                    };
                    // Add driver's vehicle and rating info
                    if(activeRide.driver.DriverDetail){
                        response_data.driver_details.vehicle_info = {
                            vehicle_no      : activeRide.driver.DriverDetail.vehicle_rc_no,
                            license_number  : activeRide.driver.DriverDetail.license_number,
                            rating          : activeRide.driver.DriverDetail.rating,
                            vehicle_id      : activeRide.driver.DriverDetail.vehicle_id,
                            vehicle_type_id : activeRide.driver.DriverDetail.vehicle_type_id,
                            driver_status   : activeRide.driver.DriverDetail.status,
                            vehicle_images  : activeRide.driver.DriverDetail.vehicle_images || [],
                            mobile_code     : activeRide.driver.DriverDetail.mobile_code
                        };
                    }
                    // Add OTP details for passenger
                    if(['accepted', 'arrived'].includes(activeRide.status)){
                        response_data.verification = {
                            ride_otp        : activeRide.ride_otp,
                            otp_generated_at: activeRide.otp_generated_at,
                            otp_verified_at : activeRide.otp_verified_at
                        };
                    }
                }else if(activeRide.status === 'searching_driver'){
                    response_data.search_status = {
                        message: "We are finding the best driver for you",
                        estimated_wait_time: "3-5 minutes"
                    };
                }
            }
            // ============================================================
            // RESERVATION TRIP DETAILS
            // ============================================================
            const isReservationTrip = activeRide.trip_id === 3;
            if(isReservationTrip){
                response_data.reservation_details = {
                    is_reservation_trip : true,
                    package_info        : null,
                    advance_payment     : null,
                    meter_readings      : null,
                    payment_breakdown   : null,
                    excess_km_details   : null
                };
                // ============================================================
                // 1. PACKAGE INFORMATION
                // ============================================================
                if(activeRide.package){
                    response_data.reservation_details.package_info = {
                        package_id      : activeRide.package.id,
                        package_name    : activeRide.package.name,
                        package_km      : parseFloat(activeRide.package.km),
                        status          : activeRide.package.status === 1 ? 'active' : 'inactive'
                    };
                }
                // ============================================================
                // 2. ADVANCE PAYMENT INFORMATION
                // ============================================================
                if(activeRide.is_advance_paid){
                    response_data.reservation_details.advance_payment = {
                        is_advance_paid: true,
                        advance_payment_id: activeRide.advance_payment_id,
                        advance_amount: parseFloat(activeRide.advance_paid_amount || 0)
                    };
                    // Include more details if advance payment record exists
                    if(activeRide.advancePayment){
                        response_data.reservation_details.advance_payment.payment_status = activeRide.advancePayment.payment_status;
                        response_data.reservation_details.advance_payment.paid_at = activeRide.advancePayment.created_at;
                    }
                }
                // ============================================================
                // 3. METER READINGS
                // ============================================================
                const showMeterReadings = ['arrived', 'ride_started', 'ride_completed'].includes(activeRide.status);
                if(showMeterReadings){
                    response_data.reservation_details.meter_readings = {
                        start_meter_reading : activeRide.start_meter_reading ? parseFloat(activeRide.start_meter_reading) : null,
                        start_meter_image   : activeRide.start_meter_image || null,
                        end_meter_reading   : activeRide.end_meter_reading ? parseFloat(activeRide.end_meter_reading) : null,
                        end_meter_image     : activeRide.end_meter_image || null
                    };
                    // Calculate actual distance from meter readings if both available
                    if(activeRide.start_meter_reading && activeRide.end_meter_reading){
                        const actualKmFromMeter = parseFloat(activeRide.end_meter_reading) - parseFloat(activeRide.start_meter_reading);
                        response_data.reservation_details.meter_readings.actual_km_from_meter = parseFloat(actualKmFromMeter.toFixed(2));
                    }
                    // Add instructions based on status and role
                    if(activeRide.status === 'ride_started' && !activeRide.end_meter_reading){
                        if(userRole === 'Driver'){
                            response_data.reservation_details.meter_readings.instruction = "Please capture end meter reading when completing the ride";
                        }
                    }
                }else 
                if(['accepted', 'arrived'].includes(activeRide.status) && userRole === 'Driver'){
                    // Remind driver to capture start meter reading before starting
                    response_data.reservation_details.meter_reading_required = {
                        required            : true,
                        message             : "Please capture the starting meter reading before starting the ride",
                        fields_needed       : ["start_meter_reading", "start_meter_image"]
                    };
                }
                // ============================================================
                // 4. PAYMENT BREAKDOWN
                // ============================================================
                const packageKm             = activeRide.package ? parseFloat(activeRide.package.km) : 0;
                const estimatedDistance     = parseFloat(activeRide.estimated_distance || 0);
                const actualDistance        = parseFloat(activeRide.actual_distance || 0);
                response_data.reservation_details.payment_breakdown = {
                    estimated_fare          : parseFloat(activeRide.estimated_fare || 0),
                    advance_paid            : parseFloat(activeRide.advance_paid_amount || 0),
                    remaining_to_pay        : parseFloat(activeRide.remaining_fare_to_pay || 0),
                    discount_amount         : parseFloat(activeRide.discount_amount || 0),
                    final_fare              : parseFloat(activeRide.final_fare || 0)
                };
                // ============================================================
                // 5. EXCESS KM CALCULATION AND DETAILS
                // ============================================================
                if(activeRide.status === 'ride_completed' && actualDistance > 0){
                    const excessKm = Math.max(0, actualDistance - packageKm);
                    response_data.reservation_details.excess_km_details = {
                        package_km          : packageKm,
                        actual_km           : actualDistance,
                        excess_km           : parseFloat(excessKm.toFixed(2)),
                        within_package_limit: excessKm === 0
                    };
                    // Add excess km charge if applicable
                    if(excessKm > 0){
                        // Try to extract excess km charge from fare breakdown
                        let fareBreakdown = null;
                        try{
                            fareBreakdown = JSON.parse(activeRide.actual_fare_breakdown || '{}');
                        }catch(e){
                            console.error('Failed to parse actual_fare_breakdown:', e);
                        }
                        if(fareBreakdown && fareBreakdown.excessKmCharge){
                            response_data.reservation_details.excess_km_details.excess_km_charge = parseFloat(fareBreakdown.excessKmCharge || 0);
                        }
                    }
                    // Add completion message
                    if(excessKm > 0){
                        response_data.reservation_details.completion_note = `Trip exceeded package limit by ${excessKm.toFixed(2)} km. Additional charges applied.`;
                    }else{
                        response_data.reservation_details.completion_note = `Trip completed within package limit of ${packageKm} km.`;
                    }
                }else 
                if(activeRide.status === 'ride_started'){
                    // Show current package limits during ride
                    response_data.reservation_details.package_limits = {
                        package_km    : packageKm,
                        package_hours : activeRide.package ? parseFloat(activeRide.package.hours) : 0,
                        warning       : userRole === 'Driver' ? `Package allows ${packageKm} km. Trip may incur additional charges if exceeded.` : null
                    };
                }
                // ============================================================
                // 6. STATUS-SPECIFIC INSTRUCTIONS
                // ============================================================
                if(userRole === 'Driver'){
                    switch(activeRide.status){
                        case 'accepted':
                        case 'arrived':
                            response_data.reservation_details.driver_instructions = "Please capture the starting meter reading before starting the ride";
                            break;
                        case 'ride_started':
                            response_data.reservation_details.driver_instructions = `Package allows ${packageKm} km. Remember to capture end meter reading when completing the ride.`;
                            break;
                        case 'ride_completed':
                            response_data.reservation_details.driver_instructions = "Ride completed. Payment processed.";
                            break;
                    }
                }
            }
            // ============================================================
            // FARE BREAKDOWN (FOR ALL TRIP TYPES)
            // ============================================================
            if(activeRide.discount_amount > 0){
                response_data.fare_breakdown    = {
                    estimated_fare              : activeRide.estimated_fare,
                    discount_amount             : activeRide.discount_amount,
                    final_fare                  : activeRide.final_fare,
                    coupon_code                 : activeRide.coupon_code
                };
            }
            // ============================================================
            // TRIP SUMMARY (COMPLETED RIDES)
            // ============================================================
            if(activeRide.status === 'ride_completed'){
                response_data.trip_summary     = {
                    actual_fare                : activeRide.actual_fare,
                    actual_distance            : activeRide.actual_distance,
                    actual_duration            : activeRide.actual_duration,
                    rating                     : activeRide.rating,
                    is_rated                   : activeRide.is_rated
                };
                // Add commission details for drivers
                if(userRole === 'Driver'){
                    response_data.trip_summary.payout_details = {
                        commission_value       : parseFloat(activeRide.commission_value || 0),
                        commission_type        : activeRide.commission_type || 'percentage',
                        commission_amount      : parseFloat(activeRide.commission_amount || 0),
                        driver_payout          : parseFloat(activeRide.driver_payout || 0),
                        tip_amount             : parseFloat(activeRide.tip_amount || 0)
                    };
                }
                // For reservation trips, add summary of excess charges
                if(isReservationTrip && response_data.reservation_details?.excess_km_details){
                    response_data.trip_summary.reservation_summary = {
                        package_km             : response_data.reservation_details.excess_km_details.package_km,
                        actual_km              : response_data.reservation_details.excess_km_details.actual_km,
                        excess_km              : response_data.reservation_details.excess_km_details.excess_km,
                        advance_paid           : parseFloat(activeRide.advance_paid_amount || 0),
                        remaining_paid         : parseFloat(activeRide.remaining_fare_to_pay || 0),
                        total_paid             : parseFloat(activeRide.advance_paid_amount || 0) + parseFloat(activeRide.remaining_fare_to_pay || 0)
                    };
                }
            }
            // ============================================================
            // CANCELLATION INFO
            // ============================================================
            if(activeRide.status === 'cancelled'){
                response_data.cancellation_info = {
                    cancelled_at               : activeRide.cancelled_at,
                    cancelled_by               : activeRide.cancelled_by,
                    cancellation_reason        : activeRide.cancellation_reason
                };
            }
            return res.status(200).json({
                success: true,
                message: 'Current ride retrieved successfully',
                user_role: userRole,
                data: response_data
            });
        }catch(error){
            console.error('❌ GetCurrentRide error:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while fetching current ride'
            });
        }
    },

    // RIDE CANCELLED WITH AUTOMATIC RESTART
    rideCancelled: async (req, res) => {
        try{
            const { ride_request_id, cancellation_reason } = req.body;
            // Authentication check
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const user_id = req.user.userId;
            // Input validation
            if(!ride_request_id || !Number.isInteger(ride_request_id) || ride_request_id <= 0){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            if(!cancellation_reason || typeof cancellation_reason !== 'string' || cancellation_reason.trim().length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'Cancellation reason is required'
                });
            }
            // Check user exists and get role
            const user = await User.findByPk(user_id);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: user_id,
                    role_id: [2, 3] 
                },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }]
            });
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized to cancel rides'
                });
            }
            // Get admin settings
            const adminSettings = await Settings.findOne({
                where: { role: 'admin' }
            });
            if(!adminSettings){
                return res.status(500).json({
                    success: false,
                    message: 'Admin settings not found. Please contact support.'
                });
            }
            const maxCancelPerDay    = parseFloat(adminSettings.max_cancellations_per_day || 0);
            const cancelCharges      = parseFloat(adminSettings.cancellation_charge_percent || 0);
            const maxRestartAttempts = parseInt(adminSettings.max_restart_attempts || 1);
            const isDriver           = userRole.role_id === 3;
            const isPassenger        = userRole.role_id === 2;
            const transaction        = await sequelize.transaction();
            try{
                // Find ride request with all necessary relationships
                let whereCondition = { id: ride_request_id };
                if(isPassenger){
                    whereCondition.user_id = user_id;
                }else 
                if(isDriver){
                    whereCondition.driver_id = user_id;
                }
                const rideRequest = await RideRequests.findOne({
                    where: whereCondition,
                    include: [
                        {
                            model: User,
                            as: 'passenger',
                            attributes: ['id', 'name', 'mobile', 'fcm_token']
                        },
                        {
                            model: User,
                            as: 'driver',  
                            attributes: ['id', 'name', 'mobile', 'fcm_token']
                        },
                        {
                            model: Vehicletypes,
                            as: 'vehicleType',  
                            attributes: ['id', 'name']
                        }
                    ],
                    lock: true,
                    transaction
                });
                if(!rideRequest){
                    await transaction.rollback();
                    return res.status(404).json({
                        success: false,
                        message: 'Ride request not found or you are not authorized to cancel this ride'
                    });
                }
                // Check if already cancelled or completed
                if(['cancelled', 'cancelled_by_user', 'cancelled_by_driver'].includes(rideRequest.status)){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Ride request is already cancelled'
                    });
                }
                if(rideRequest.status === 'ride_completed'){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot cancel a completed ride'
                    });
                }
                if(rideRequest.status === 'ride_started'){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot cancel ride after it has started. Please contact support if needed.'
                    });
                }
                // Define cancellable statuses
                const cancellableStatuses = [
                    'pending', 
                    'searching_driver', 
                    'accepted', 
                    'arrived',
                    'no_drivers_available',
                    'notification_failed',
                    'timeout'
                ];
                if(!cancellableStatuses.includes(rideRequest.status)){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Cannot cancel ride in ${rideRequest.status} status`
                    });
                }
                let existingMetadata = {};
                try{
                    if(rideRequest.metadata){
                        existingMetadata = JSON.parse(rideRequest.metadata);
                    }else{
                        console.log(`   ⚠️ No existing metadata found`);
                    }
                }catch(metadataError){
                    console.error(`❌ CRITICAL: Metadata parsing failed:`, metadataError);
                }
                const existingCancelledDrivers = existingMetadata.cancelled_drivers || [];
                const restartAttempts = parseInt(existingMetadata.restart_attempts || 0);
                if(isNaN(restartAttempts) || restartAttempts < 0){
                    await transaction.rollback();
                    return res.status(500).json({
                        success: false,
                        message: 'Invalid restart attempts data. Please contact support.'
                    });
                }
                // STOP FIREBASE NOTIFICATIONS for passenger early cancellations
                let notificationsStopped = false;
                if(isPassenger && ['pending', 'searching_driver'].includes(rideRequest.status)){
                    try{
                        const stopResult = await Promise.race([
                            FirebaseService.stopRideRequestNotifications(ride_request_id),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Firebase timeout')), 5000)
                            )
                        ]);
                        notificationsStopped = stopResult.success;
                    }catch(firebaseError){
                        console.error('Error stopping Firebase notifications:', firebaseError);
                    }
                }
                let cancellationType    = 'user_cancelled';
                let penaltyAmount       = 0;
                let cancelledBy         = 'passenger';
                let chargeMethod        = null;
                let walletDeducted      = false;
                let pendingCharge       = false;
                let shouldRestartSearch = false;
                // ============================================
                // DRIVER CANCELLATION LOGIC WITH RESTART
                // ============================================
                if(isDriver){
                    cancelledBy          = 'driver';
                    cancellationType     = 'driver_cancelled';
                    if(['accepted', 'arrived'].includes(rideRequest.status)){
                        // Calculate penalty for driver
                        const now        = new Date();
                        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const todayCancellations = await DriverDeposit.count({
                            where: {
                                driver_id: user_id,
                                transaction_type: 'cancellation_charge',
                                createdAt: { [Sequelize.Op.gte]: startOfDay },
                                status: 'completed'
                            },
                            transaction
                        });
                        // Get driver's wallet instead of deposit
                        let driverWallet = await Wallets.findOne({
                            where: { user_id: user_id },
                            lock: true,
                            transaction
                        });
                        // Create wallet if doesn't exist
                        if(!driverWallet){
                            driverWallet = await Wallets.create({
                                user_id: user_id,
                                balance: 0,
                                total_earned: 0,
                                total_spent: 0,
                                status: 1
                            }, { transaction });
                        }
                        const currentBalance      = parseFloat(driverWallet.balance || 0);
                        const shouldChargePenalty = maxCancelPerDay > 0 && todayCancellations >= maxCancelPerDay;
                        if(shouldChargePenalty){
                            const rideFare = parseFloat(rideRequest.estimated_fare || 0);
                            penaltyAmount  = Math.round((rideFare * cancelCharges) / 100 * 100) / 100;
                            if(currentBalance < penaltyAmount){
                                await transaction.rollback();
                                return res.status(400).json({
                                    success: false,
                                    message: `Insufficient wallet balance. Required: ₹${penaltyAmount.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}. Please recharge your wallet to cancel this ride.`
                                });
                            }
                            const newBalance    = Math.round((currentBalance - penaltyAmount) * 100) / 100;
                            const transactionId = `CANCEL_${Date.now()}_${user_id}`;
                            // Create wallet transaction instead of driver deposit
                            await WalletTransactions.create({
                                wallet_id: driverWallet.id,
                                user_id: user_id,
                                transaction_id: transactionId,
                                reference_type: 'cancellation_penalty',
                                reference_id: ride_request_id,
                                type: 'debit',
                                amount: penaltyAmount,
                                balance_before: currentBalance,
                                balance_after: newBalance,
                                description: `Driver cancellation charge (${cancelCharges}% of ₹${rideFare.toFixed(2)}) - Exceeded daily limit of ${maxCancelPerDay} cancellations`,
                                payment_method: 'adjustment',
                                status: 'completed',
                                processed_at: new Date(),
                                metadata: JSON.stringify({
                                    ride_request_id,
                                    ride_fare: rideFare,
                                    charge_percentage: cancelCharges,
                                    daily_cancellation_count: todayCancellations + 1,
                                    max_cancellations_per_day: maxCancelPerDay,
                                    cancellation_date: startOfDay.toISOString().split('T')[0]
                                })
                            }, { transaction });
                            // Update wallet balance
                            await Wallets.update({
                                balance: newBalance,
                                total_spent: parseFloat(driverWallet.total_spent || 0) + penaltyAmount
                            }, {
                                where: { id: driverWallet.id },
                                transaction
                            });
                            chargeMethod   = 'wallet';
                            walletDeducted = true;
                        }else{
                            // Free cancellation - just log it
                            const transactionId = `CANCEL_FREE_${Date.now()}_${user_id}`;
                            await WalletTransactions.create({
                                wallet_id: driverWallet.id,
                                user_id: user_id,
                                transaction_id: transactionId,
                                reference_type: 'cancellation_free',
                                reference_id: ride_request_id,
                                type: 'debit',
                                amount: 0,
                                balance_before: currentBalance,
                                balance_after: currentBalance,
                                description: `Free driver cancellation (${todayCancellations + 1}/${maxCancelPerDay} used)`,
                                payment_method: null,
                                status: 'completed',
                                processed_at: new Date(),
                                metadata: JSON.stringify({
                                    ride_request_id,
                                    daily_cancellation_count: todayCancellations + 1,
                                    max_cancellations_per_day: maxCancelPerDay,
                                    is_free_cancellation: true,
                                    cancellation_date: startOfDay.toISOString().split('T')[0]
                                })
                            }, { transaction });
                        }
                        // Check if we can restart the search
                        if(restartAttempts < maxRestartAttempts){
                            shouldRestartSearch = true;
                        } else {
                            console.log(`❌ Driver cancellation - Max restart attempts reached (${restartAttempts}/${maxRestartAttempts})`);
                        }
                    }
                }
                // ============================================
                // PASSENGER CANCELLATION LOGIC
                // ============================================
                if(isPassenger){
                    if(['accepted', 'arrived'].includes(rideRequest.status)){
                        const acceptedAt = new Date(rideRequest.accepted_at);
                        const now        = new Date();
                        if(isNaN(acceptedAt.getTime())){
                            await transaction.rollback();
                            return res.status(500).json({
                                success: false,
                                message: 'Invalid ride acceptance time. Please contact support.'
                            });
                        }
                        const timeDiff      = (now.getTime() - acceptedAt.getTime()) / 1000;
                        const minutesPassed = Math.floor(timeDiff / 60);
                        if(minutesPassed < 1){
                            penaltyAmount   = 0;
                        }else{
                            const baseFare          = parseFloat(rideRequest.estimated_base_fare || 0);
                            const estimatedDuration = parseInt(rideRequest.estimated_duration || 0);
                            if(estimatedDuration > 0 && baseFare > 0){
                                const perMinuteRate = baseFare / estimatedDuration;
                                penaltyAmount       = perMinuteRate * minutesPassed;
                                penaltyAmount       = Math.round(penaltyAmount * 100) / 100;
                            }
                        }
                        if(penaltyAmount > 0){
                            const userWallet = await Wallets.findOne({
                                where: { user_id: user_id },
                                lock: true,
                                transaction
                            });
                            if(userWallet){
                                const walletBalance = parseFloat(userWallet.balance || 0);
                                if(walletBalance >= penaltyAmount){
                                    const newBalance = Math.round((walletBalance - penaltyAmount) * 100) / 100;
                                    const walletTransactionId = `CANCEL_${Date.now()}_${user_id}`;
                                    await WalletTransactions.create({
                                        wallet_id      : userWallet.id,
                                        user_id        : user_id,
                                        transaction_id : walletTransactionId,
                                        reference_type : 'penalty',
                                        reference_id   : ride_request_id,
                                        type           : 'debit',
                                        amount         : penaltyAmount,
                                        balance_before : walletBalance,
                                        balance_after  : newBalance,
                                        description    : `Cancellation charge - ${minutesPassed} minutes after acceptance`,
                                        payment_method : 'adjustment',
                                        status         : 'completed',
                                        processed_at   : new Date(),
                                        metadata       : JSON.stringify({
                                            ride_request_id,
                                            minutes_passed     : minutesPassed,
                                            base_fare          : rideRequest.estimated_base_fare,
                                            estimated_duration : estimatedDuration,
                                            cancellation_time  : now
                                        })
                                    }, { transaction });
                                    await Wallets.update({
                                        balance: newBalance,
                                        total_spent: parseFloat(userWallet.total_spent || 0) + penaltyAmount
                                    }, {
                                        where: { id: userWallet.id },
                                        transaction
                                    });
                                    walletDeducted = true;
                                    chargeMethod   = 'wallet';
                                }else{
                                    pendingCharge  = true;
                                    chargeMethod   = 'next_ride';
                                    const currentUser = await User.findByPk(user_id, {
                                        lock: true,
                                        transaction
                                    });
                                    const currentPending = parseFloat(currentUser.pending_cancellation_charge || 0);
                                    const newPending     = Math.round((currentPending + penaltyAmount) * 100) / 100;
                                    await User.update({
                                        pending_cancellation_charge: newPending
                                    }, {
                                        where: { id: user_id },
                                        transaction
                                    });
                                }
                            }else{
                                pendingCharge = true;
                                chargeMethod  = 'next_ride';
                                const currentUser = await User.findByPk(user_id, {
                                    lock: true,
                                    transaction
                                });
                                const currentPending = parseFloat(currentUser.pending_cancellation_charge || 0);
                                const newPending     = Math.round((currentPending + penaltyAmount) * 100) / 100;
                                await User.update({
                                    pending_cancellation_charge: newPending
                                }, {
                                    where: { id: user_id },
                                    transaction
                                });
                            }
                        }
                    }
                }
                // ============================================
                // UPDATE RIDE REQUEST STATUS
                // ============================================
                const finalStatus = shouldRestartSearch ? 'cancelled_by_driver'
                    : isPassenger && ['pending', 'searching_driver'].includes(rideRequest.status) ? 'cancelled_by_user'
                    : isDriver ? 'cancelled_by_driver' 
                    : 'cancelled';
                // Build updated metadata
                const updatedMetadata = {
                    ...existingMetadata,
                    restart_attempts          : shouldRestartSearch ? restartAttempts : existingMetadata.restart_attempts,
                    cancelled_drivers         : shouldRestartSearch ? [...existingCancelledDrivers, {
                        driver_id             : user_id,
                        cancelled_at          : new Date().toISOString(),
                        status_when_cancelled : rideRequest.status,
                        penalty_amount        : penaltyAmount,
                        reason                : cancellation_reason.trim()
                    }] : existingCancelledDrivers,
                    cancellation              : {
                        penalty_amount        : penaltyAmount,
                        charge_method         : chargeMethod,
                        wallet_deducted       : walletDeducted,
                        pending_charge        : pendingCharge,
                        notifications_stopped : notificationsStopped,
                        minutes_after_acceptance: isPassenger && ['accepted', 'arrived'].includes(rideRequest.status) 
                            ? Math.floor(((new Date() - new Date(rideRequest.accepted_at)) / 1000) / 60)
                            : null
                    }
                };
                await RideRequests.update({
                    status              : finalStatus,
                    cancelled_at        : new Date(),
                    cancellation_reason : cancellation_reason.trim(),
                    cancelled_by        : cancelledBy,
                    driver_id           : shouldRestartSearch ? null : rideRequest.driver_id,
                    accepted_at         : shouldRestartSearch ? null : rideRequest.accepted_at,
                    metadata            : JSON.stringify(updatedMetadata)
                }, {
                    where: { id: ride_request_id },
                    transaction
                });
                // Handle coupon rollback - Only for early cancellations
                if(rideRequest.coupon_id && ['pending', 'searching_driver'].includes(rideRequest.status)) {
                    await PromoUsages.destroy({
                        where: {
                            user_id: rideRequest.user_id,
                            promo_id: rideRequest.coupon_id,
                            ride_id: ride_request_id
                        },
                        transaction
                    });
                }
                await transaction.commit();
                // ============================================
                // HANDLE RESTART LOGIC (AFTER COMMIT)
                // ============================================
                if(shouldRestartSearch){
                    try{
                        await FirebaseService.sendRideCancellationNotification({
                            ride_request_id,
                            cancelled_by        : cancelledBy,
                            cancellation_reason : cancellation_reason.trim(),
                            penalty_amount      : penaltyAmount,
                            charge_method       : chargeMethod,
                            ride_request        : rideRequest,
                            cancelling_user_id  : user_id,
                            isDriver            : isDriver,
                            isPassenger         : isPassenger,
                            restart_search      : true
                        });
                    }catch(notificationError){
                        console.error('Failed to send restart notification:', notificationError);
                    }
                    // Start asynchronous restart process
                    setImmediate(async () => {
                        try{
                            await handleDriverSearchRestart(
                                ride_request_id,
                                updatedMetadata.cancelled_drivers,
                                restartAttempts + 1
                            );
                        }catch(restartError){
                            console.error(`❌ Driver search restart failed for ride ${ride_request_id}:`, restartError);
                            // Update ride status to indicate restart failure
                            await RideRequests.update({
                                status: 'no_drivers_available',
                                metadata: JSON.stringify({
                                    ...updatedMetadata,
                                    restart_error: restartError.message,
                                    restart_failed_at: new Date().toISOString()
                                })
                            }, {
                                where: { id: ride_request_id }
                            });
                            // Notify passenger about restart failure
                            try{
                                await FirebaseService.sendNotificationToUser(rideRequest.user_id, {
                                    title: 'Unable to Find Alternative Driver',
                                    body: 'We couldn\'t find another driver for your ride. Please request a new ride.',
                                    type: 'restart_failed',
                                    ride_request_id: ride_request_id
                                });
                            }catch(notifError){
                                console.error('Failed to send restart failure notification:', notifError);
                            }
                        }
                    });
                    // Return response immediately
                    return res.status(200).json({
                        success: true,
                        message: 'Driver cancelled the ride. We\'re finding you another driver...',
                        data: {
                            ride_request_id,
                            cancelled_by        : cancelledBy,
                            cancellation_reason : cancellation_reason.trim(),
                            penalty_amount      : penaltyAmount,
                            restarting_search   : true,
                            restart_attempt     : restartAttempts + 1,
                            max_restart_attempts: maxRestartAttempts,
                            cancelled_at        : new Date(),
                            message             : 'Don\'t worry! We\'re searching for another driver for you.'
                        }
                    });
                }else{
                    console.log(`   ⛔ WILL NOT RESTART - Max attempts reached or other reason`);
                }
                // ============================================
                // SEND NORMAL CANCELLATION NOTIFICATION
                // ============================================
                try{
                    await FirebaseService.sendRideCancellationNotification({
                        ride_request_id,
                        cancelled_by        : cancelledBy,
                        cancellation_reason : cancellation_reason.trim(),
                        penalty_amount      : penaltyAmount,
                        charge_method       : chargeMethod,
                        ride_request        : rideRequest,
                        cancelling_user_id  : user_id,
                        isDriver            : isDriver,
                        isPassenger         : isPassenger,
                        restart_search      : false
                    });
                }catch(notificationError){
                    console.error('Cancellation notification failed:', notificationError);
                }
                // ============================================
                // NORMAL CANCELLATION RESPONSE
                // ============================================
                return res.status(200).json({
                    success : true,
                    message : 'Ride cancelled successfully',
                    data    : {
                        ride_request_id,
                        cancelled_by          : cancelledBy,
                        cancellation_reason   : cancellation_reason.trim(),
                        penalty_amount        : penaltyAmount,
                        charge_method         : chargeMethod,
                        wallet_deducted       : walletDeducted,
                        pending_charge        : pendingCharge,
                        notifications_stopped : notificationsStopped,
                        cancelled_at          : new Date(),
                        message               : pendingCharge ? `Cancellation charge of ₹${penaltyAmount.toFixed(2)} will be deducted from your next ride`
                            : walletDeducted ? `₹${penaltyAmount.toFixed(2)} has been deducted from your wallet`
                            : penaltyAmount === 0 ? 'No cancellation charge applied'
                            : 'Cancellation processed'
                    }
                });
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                throw error;
            }
        }catch(error){
            console.error('❌ RideCancelled error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to cancel ride request. Please try again.'
            });
        }
    },

    // RESERVATION RIDE CANCELLATION
    cancelReservationRide: async (req, res) => {
        try{
            const { ride_request_id, cancellation_reason } = req.body;
            // ============================================================
            // 1. AUTHENTICATION CHECK
            // ============================================================
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const user_id = req.user.userId;
            // ============================================================
            // 2. INPUT VALIDATION
            // ============================================================
            if(!ride_request_id || !Number.isInteger(ride_request_id) || ride_request_id <= 0){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride request ID is required'
                });
            }
            if(!cancellation_reason || typeof cancellation_reason !== 'string' || cancellation_reason.trim().length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'Cancellation reason is required'
                });
            }
            // ============================================================
            // 3. FETCH CANCELLATION POLICY FROM DATABASE
            // ============================================================
            const cancellationPolicies = await CancellationPolicy.findAll({
                where: { status: 1 },
                order: [['hours', 'DESC']],
                attributes: ['id', 'hours', 'percentage']
            });
            if(!cancellationPolicies || cancellationPolicies.length === 0){
                return res.status(500).json({
                    success: false,
                    message: 'Cancellation policy not configured. Please contact support.'
                });
            }
            // ============================================================
            // 4. GET GRACE PERIOD SETTING
            // ============================================================
            const adminSettings = await Settings.findOne({
                where: { role: 'admin' }
            });
            const freeCancellationMinutes = parseInt(adminSettings?.reservation_free_cancel_minutes || 10);
            const transaction = await sequelize.transaction();
            try{
                // ============================================================
                // 5. FETCH RIDE REQUEST WITH ALL DETAILS
                // ============================================================
                const rideRequest = await RideRequests.findOne({
                    where: {
                        id: ride_request_id,
                        user_id: user_id,
                        trip_id: 3 
                    },
                    include: [
                        {
                            model: User,
                            as: 'passenger',
                            attributes: ['id', 'name', 'mobile', 'fcm_token']
                        },
                        {
                            model: User,
                            as: 'driver',
                            attributes: ['id', 'name', 'mobile', 'fcm_token']
                        },
                        {
                            model: Vehicletypes,
                            as: 'vehicleType',
                            attributes: ['id', 'name']
                        },
                        {
                            model: ReservationAdvancePayment,
                            as: 'advancePayment',
                            attributes: ['id', 'advance_amount', 'payment_status', 'payment_method']
                        }
                    ],
                    lock: true,
                    transaction
                });
                if(!rideRequest){
                    await transaction.rollback();
                    return res.status(404).json({
                        success: false,
                        message: 'Reservation ride not found or you are not authorized to cancel this ride'
                    });
                }
                // ============================================================
                // 6. VALIDATE CANCELLATION ELIGIBILITY
                // ============================================================
                const nonCancellableStatuses = ['cancelled', 'cancelled_by_user', 'cancelled_by_driver', 'ride_completed', 'ride_started'];
                if(nonCancellableStatuses.includes(rideRequest.status)){
                    await transaction.rollback();
                    const statusMessages = {
                        'cancelled'           : 'Reservation is already cancelled',
                        'cancelled_by_user'   : 'Reservation is already cancelled',
                        'cancelled_by_driver' : 'Reservation is already cancelled',
                        'ride_completed'      : 'Cannot cancel a completed reservation',
                        'ride_started'        : 'Cannot cancel reservation after ride has started. Please contact support.'
                    };
                    return res.status(400).json({
                        success: false,
                        message: statusMessages[rideRequest.status] || 'Cannot cancel this reservation'
                    });
                }
                if(!rideRequest.pickup_date || !rideRequest.pickup_time){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Reservation pickup date/time not found. Please contact support.'
                    });
                }
                // ============================================================
                // 7. CALCULATE TIME UNTIL PICKUP
                // ============================================================
                const now = new Date();
                const pickupDateTime = new Date(`${rideRequest.pickup_date}T${rideRequest.pickup_time}`);
                if(isNaN(pickupDateTime.getTime())){
                    await transaction.rollback();
                    return res.status(500).json({
                        success: false,
                        message: 'Invalid pickup date/time format. Please contact support.'
                    });
                }
                if(now > pickupDateTime){
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot cancel a reservation with past pickup time. Please contact support.'
                    });
                }
                const timeUntilPickup  = pickupDateTime - now;
                const hoursUntilPickup = timeUntilPickup / (1000 * 60 * 60);
                // ============================================================
                // 8. CHECK FOR FREE CANCELLATION GRACE PERIOD
                // ============================================================
                const bookingTime             = new Date(rideRequest.requested_at || rideRequest.created_at);
                const minutesSinceBooking     = (now - bookingTime) / (1000 * 60);
                let cancellationChargePercent = 0;
                let policyTier                = '';
                let appliedPolicyId           = null;
                let isFreeGracePeriod         = false;
                if(minutesSinceBooking <= freeCancellationMinutes){
                    // Within grace period - free cancellation
                    isFreeGracePeriod         = true;
                    cancellationChargePercent = 0;
                    policyTier                = `Free cancellation (within ${freeCancellationMinutes} minutes of booking)`;
                }else{
                    // ============================================================
                    // 9. APPLY CANCELLATION POLICY BASED ON TIME
                    // ============================================================
                    let applicablePolicy = null;
                    for(const policy of cancellationPolicies){
                        if(hoursUntilPickup >= policy.hours){
                            applicablePolicy = policy;
                            break;
                        }
                    }
                    if(applicablePolicy){
                        cancellationChargePercent = parseFloat(applicablePolicy.percentage);
                        appliedPolicyId           = applicablePolicy.id;
                        policyTier                = `${applicablePolicy.hours}+ hours before pickup`;
                    }else{
                        // No policy matched - use strictest policy
                        const strictestPolicy     = cancellationPolicies[cancellationPolicies.length - 1];
                        cancellationChargePercent = parseFloat(strictestPolicy.percentage);
                        appliedPolicyId           = strictestPolicy.id;
                        policyTier                = `Less than ${strictestPolicy.hours} hours before pickup`;
                    }
                }
                // ============================================================
                // 10. CALCULATE CANCELLATION CHARGE AND REFUND
                // ============================================================
                const advancePaid        = parseFloat(rideRequest.advance_paid_amount || 0);
                const cancellationCharge = Math.round((advancePaid * cancellationChargePercent) / 100 * 100) / 100;
                const refundAmount       = Math.max(0, advancePaid - cancellationCharge);
                // ============================================================
                // 11. PROCESS WALLET TRANSACTIONS
                // ============================================================
                let walletRefunded       = false;
                let walletTransactionIds = [];
                if(advancePaid > 0){
                    let userWallet = await Wallets.findOne({
                        where: { user_id: user_id },
                        lock: true,
                        transaction
                    });
                    if(!userWallet){
                        userWallet = await Wallets.create({
                            user_id: user_id,
                            balance: 0,
                            total_earned: 0,
                            total_spent: 0,
                            status: 1
                        }, { transaction });
                    }
                    const currentBalance = parseFloat(userWallet.balance || 0);
                    // ========================================================
                    // 11a. DEDUCT CANCELLATION CHARGE (if any)
                    // ========================================================
                    if(cancellationCharge > 0){
                        const balanceAfterDeduction = Math.round((currentBalance - cancellationCharge) * 100) / 100;
                        const deductionTxnId        = `CANCEL_CHARGE_${Date.now()}_${user_id}`;
                        await WalletTransactions.create({
                            wallet_id: userWallet.id,
                            user_id: user_id,
                            transaction_id: deductionTxnId,
                            reference_type: 'cancellation_charge',
                            reference_id: ride_request_id,
                            type: 'debit',
                            amount: cancellationCharge,
                            balance_before: currentBalance,
                            balance_after: balanceAfterDeduction,
                            description: `Reservation cancellation charge (${cancellationChargePercent}%) - ${policyTier}`,
                            payment_method: 'adjustment',
                            status: 'completed',
                            processed_at: now,
                            metadata: JSON.stringify({
                                ride_request_id,
                                advance_paid: advancePaid,
                                cancellation_charge_percent: cancellationChargePercent,
                                hours_until_pickup: hoursUntilPickup.toFixed(2),
                                policy_tier: policyTier,
                                policy_id: appliedPolicyId,
                                is_grace_period: isFreeGracePeriod,
                                pickup_datetime: pickupDateTime.toISOString(),
                                cancelled_at: now.toISOString()
                            })
                        }, { transaction });
                        walletTransactionIds.push(deductionTxnId);
                        // Update wallet balance after deduction
                        await Wallets.update({
                            balance: balanceAfterDeduction,
                            total_spent: parseFloat(userWallet.total_spent || 0) + cancellationCharge
                        }, {
                            where: { id: userWallet.id },
                            transaction
                        });
                        // Update current balance for next operation
                        await userWallet.reload({ transaction });
                    }
                    // ========================================================
                    // 11b. CREDIT REFUND AMOUNT (if any)
                    // ========================================================
                    if(refundAmount > 0){
                        const currentBalanceAfterDeduction = parseFloat(userWallet.balance || 0);
                        const balanceAfterRefund           = Math.round((currentBalanceAfterDeduction + refundAmount) * 100) / 100;
                        const refundTxnId                  = `REFUND_${Date.now()}_${user_id}`;
                        await WalletTransactions.create({
                            wallet_id: userWallet.id,
                            user_id: user_id,
                            transaction_id: refundTxnId,
                            reference_type: 'refund',
                            reference_id: ride_request_id,
                            type: 'credit',
                            amount: refundAmount,
                            balance_before: currentBalanceAfterDeduction,
                            balance_after: balanceAfterRefund,
                            description: `Reservation cancellation refund - ${policyTier}`,
                            payment_method: 'adjustment',
                            status: 'completed',
                            processed_at: now,
                            metadata: JSON.stringify({
                                ride_request_id,
                                advance_paid: advancePaid,
                                cancellation_charge: cancellationCharge,
                                cancellation_charge_percent: cancellationChargePercent,
                                hours_until_pickup: hoursUntilPickup.toFixed(2),
                                policy_tier: policyTier,
                                policy_id: appliedPolicyId,
                                is_grace_period: isFreeGracePeriod,
                                pickup_datetime: pickupDateTime.toISOString(),
                                cancelled_at: now.toISOString()
                            })
                        }, { transaction });
                        walletTransactionIds.push(refundTxnId);
                        // Update wallet balance after refund
                        await Wallets.update({
                            balance: balanceAfterRefund,
                            total_earned: parseFloat(userWallet.total_earned || 0) + refundAmount
                        }, {
                            where: { id: userWallet.id },
                            transaction
                        });
                        walletRefunded = true;
                    }
                }
                // ============================================================
                // 12. UPDATE RIDE REQUEST STATUS
                // ============================================================
                const cancellationMetadata = {
                    cancelled_by: 'user',
                    cancellation_type: 'reservation',
                    hours_until_pickup: hoursUntilPickup.toFixed(2),
                    policy_tier: policyTier,
                    policy_id: appliedPolicyId,
                    is_grace_period: isFreeGracePeriod,
                    cancellation_charge_percent: cancellationChargePercent,
                    cancellation_charge: cancellationCharge,
                    advance_paid: advancePaid,
                    refund_amount: refundAmount,
                    refund_to_wallet: walletRefunded,
                    wallet_transaction_ids: walletTransactionIds,
                    pickup_datetime: pickupDateTime.toISOString(),
                    booking_time: bookingTime.toISOString(),
                    minutes_since_booking: Math.floor(minutesSinceBooking),
                    cancelled_at: now.toISOString(),
                    is_custom_trip: rideRequest.is_custom_trip || false
                };
                await RideRequests.update({
                    status: 'cancelled_by_user',
                    cancelled_at: now,
                    cancellation_reason: cancellation_reason.trim(),
                    cancelled_by: 'passenger',
                    metadata: JSON.stringify({
                        ...JSON.parse(rideRequest.metadata || '{}'),
                        cancellation: cancellationMetadata
                    })
                }, {
                    where: { id: ride_request_id },
                    transaction
                });
                // ============================================================
                // 13. UPDATE ADVANCE PAYMENT STATUS
                // ============================================================
                if(rideRequest.advance_payment_id){
                    await ReservationAdvancePayment.update({
                        status: refundAmount > 0 ? 'refunded' : 'forfeited',
                        refund_amount: refundAmount,
                        cancellation_charge: cancellationCharge,
                        refund_processed_at: now,
                        refund_method: walletRefunded ? 'wallet' : null,
                        notes: `Cancelled - ${policyTier} - ${cancellationChargePercent}% charge applied`
                    }, {
                        where: { id: rideRequest.advance_payment_id },
                        transaction
                    });
                }
                // ============================================================
                // 14. ROLLBACK COUPON USAGE (IF ANY)
                // ============================================================
                if(rideRequest.coupon_id){
                    await PromoUsages.destroy({
                        where: {
                            user_id: user_id,
                            promo_id: rideRequest.coupon_id,
                            ride_id: ride_request_id
                        },
                        transaction
                    });
                }
                await transaction.commit();
                // ============================================================
                // 15. SEND CANCELLATION NOTIFICATIONS
                // ============================================================
                try{
                    // Notify driver if assigned
                    if(rideRequest.driver_id){
                        await FirebaseService.sendNotificationToUser(rideRequest.driver_id, {
                            title: 'Reservation Cancelled',
                            body: `User cancelled the reservation scheduled for ${pickupDateTime.toLocaleString()}`,
                            type: 'reservation_cancelled',
                            ride_request_id: ride_request_id,
                            data: {
                                cancellation_charge: cancellationCharge,
                                refund_amount: refundAmount,
                                cancelled_by: 'user',
                                pickup_datetime: pickupDateTime.toISOString()
                            }
                        });
                    }
                    // Notify user about cancellation and refund
                    let userMessage;
                    if(cancellationCharge === 0 && refundAmount > 0){
                        userMessage = `Full refund of ₹${refundAmount.toFixed(2)} credited to your wallet.`;
                    }else 
                    if(cancellationCharge > 0 && refundAmount > 0){
                        userMessage = `₹${refundAmount.toFixed(2)} refunded after deducting ₹${cancellationCharge.toFixed(2)} cancellation charge.`;
                    }else 
                    if(cancellationCharge > 0 && refundAmount === 0){
                        userMessage = `Full cancellation charge of ₹${cancellationCharge.toFixed(2)} applied.`;
                    }else{
                        userMessage = 'Your reservation has been cancelled.';
                    }
                    await FirebaseService.sendNotificationToUser(user_id, {
                        title: 'Reservation Cancelled',
                        body: userMessage,
                        type: 'reservation_cancelled_confirmation',
                        ride_request_id: ride_request_id
                    });
                }catch(notificationError){
                    console.error('❌ Cancellation notification failed:', notificationError);
                }
                // ============================================================
                // 16. RETURN SUCCESS RESPONSE
                // ============================================================
                return res.status(200).json({
                    success: true,
                    message: 'Reservation cancelled successfully',
                    data: {
                        ride_request_id,
                        advance_paid: advancePaid,
                        cancellation_charge: cancellationCharge,
                        cancellation_charge_percent: cancellationChargePercent,
                        refund_amount: refundAmount,
                        refunded_to_wallet: walletRefunded,
                        policy_applied: policyTier,
                        hours_until_pickup: hoursUntilPickup.toFixed(2),
                        is_grace_period: isFreeGracePeriod,
                        cancelled_at: now,
                        wallet_transactions: walletTransactionIds,
                        message: cancellationCharge === 0 && refundAmount > 0
                            ? `Full refund of ₹${refundAmount.toFixed(2)} has been credited to your wallet`
                            : cancellationCharge > 0 && refundAmount > 0
                                ? `₹${refundAmount.toFixed(2)} has been refunded to your wallet after deducting ₹${cancellationCharge.toFixed(2)} cancellation charge`
                                : cancellationCharge > 0 && refundAmount === 0
                                    ? `Full amount forfeited as cancellation charge (₹${cancellationCharge.toFixed(2)})`
                                    : 'No cancellation charge applied'
                    }
                });
            }catch(error){
                if(!transaction.finished){
                    await transaction.rollback();
                }
                throw error;
            }
        }catch(error){
            console.error('❌ cancelReservationRide error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel reservation. Please try again or contact support.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

// ============================================
// DRIVER SEARCH RESTART HANDLER
// ============================================
async function handleDriverSearchRestart(rideRequestId, excludedDrivers, restartAttempt) {
    try{
        console.log("Driver Restart Starts");
        const metadataUpdate     = {
            restart_attempts     : restartAttempt,
            cancelled_drivers    : excludedDrivers,
            restart_started_at   : new Date().toISOString()
        };
        await RideRequests.update({
            status               : 'searching_driver',
            search_restarted_at  : new Date(),
            search_restart_count : restartAttempt,
            metadata             : JSON.stringify(metadataUpdate)
        }, {
            where: { id: rideRequestId }
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        const verifyRide = await RideRequests.findByPk(rideRequestId, {
            attributes: ['id', 'status', 'metadata', 'is_book_any_vehicle', 'vehicle_type_id'],
            raw: true
        });
        if(!verifyRide){
            console.error(`❌ CRITICAL: Ride ${rideRequestId} NOT FOUND after update!`);
            throw new Error(`Ride request ${rideRequestId} not found`);
        }
        // Parse and verify metadata
        let verifiedExcludedDriverIds = [];
        try{
            if(verifyRide.metadata){
                const metadata = JSON.parse(verifyRide.metadata);
                if(metadata.cancelled_drivers && metadata.cancelled_drivers.length > 0){
                    verifiedExcludedDriverIds = metadata.cancelled_drivers.map(cd => cd.driver_id);
                    console.log(`✅ Parsed ${verifiedExcludedDriverIds.length} excluded drivers from metadata`);
                }else{
                    console.log(`⚠️ No cancelled_drivers array in metadata!`);
                }
            }else{
                console.log(`   ⚠️ Metadata is NULL in database!`);
            }
        }catch(parseError){
            verifiedExcludedDriverIds = excludedDrivers.map(cd => cd.driver_id);
        }
        console.log(`🚫 VERIFIED EXCLUDED DRIVER IDs: [${verifiedExcludedDriverIds.join(', ')}]`);
        // Get complete ride request for notification
        const rideRequest = await RideRequests.findByPk(rideRequestId, {
            include: [
                {
                    model: User,
                    as: 'passenger',
                    attributes: ['id', 'name', 'mobile', 'fcm_token'],
                    required: true
                },
                {
                    model: Vehicletypes,
                    as: 'vehicleType',
                    attributes: ['id', 'name']
                }
            ]
        });
        if(!rideRequest){
            throw new Error(`Ride request ${rideRequestId} not found`);
        }
        const pickup  = {
            latitude  : rideRequest.pickup_latitude,
            longitude : rideRequest.pickup_longitude,
            address   : rideRequest.pickup_address
        };
        // Determine vehicle type for search
        const isBookAnyVehicle   = rideRequest.is_book_any_vehicle === true || rideRequest.is_book_any_vehicle === 1 || rideRequest.vehicle_type_id === 'any';
        let searchVehicleTypeId;
        if(isBookAnyVehicle){
            searchVehicleTypeId  = 'any';
        }else{ 
            searchVehicleTypeId  = rideRequest.vehicle_type_id;
        }
        let nearbyDrivers        = [];
        try{
            nearbyDrivers        = await FirebaseService.findNearbyDrivers(pickup,searchVehicleTypeId,rideRequestId,verifiedExcludedDriverIds);
            console.log(`\n📊 FINAL NEARBY DRIVERS FOUND: ${nearbyDrivers.length}`);
            nearbyDrivers.forEach((driver, idx) => {
                console.log(`   ${idx + 1}. Driver ${driver.driver_id} (${driver.name}) - ${driver.vehicle_type_name || 'N/A'} - ${driver.distance_km}km`);
            });
        }catch(searchError){
            console.error(`   ❌ DRIVER SEARCH FAILED:`, searchError);
            throw searchError;
        }
        console.log("Near By Drivers");
        console.log(nearbyDrivers);
        // Check if any drivers found
        if(nearbyDrivers.length === 0){
            await RideRequests.update({
                status: 'no_drivers_available',
                metadata: JSON.stringify({
                    ...metadataUpdate,
                    restart_failed_reason  : 'no_drivers_available',
                    restart_failed_at      : new Date().toISOString(),
                    restart_attempt        : restartAttempt,
                    is_book_any_vehicle    : isBookAnyVehicle,
                    excluded_drivers_count : verifiedExcludedDriverIds.length,
                    excluded_driver_ids    : verifiedExcludedDriverIds
                })
            }, {
                where: { id: rideRequestId }
            });
            await FirebaseService.sendNotificationToUser(rideRequest.user_id, {
                title           : 'No Drivers Available',
                body            : 'We couldn\'t find an alternative driver for your ride. Please request a new ride.',
                type            : 'no_drivers_after_restart',
                ride_request_id : rideRequestId
            });
            return;
        }
        const rideDetails = {
            pickup,
            drop          : {
                latitude  : rideRequest.dropoff_latitude,
                longitude : rideRequest.dropoff_longitude,
                address   : rideRequest.dropoff_address
            },
            stop1         : rideRequest.stop1_latitude ? {
                latitude  : rideRequest.stop1_latitude,
                longitude : rideRequest.stop1_longitude,
                address   : rideRequest.stop1_address
            } : null,
            stop2         : rideRequest.stop2_latitude ? {
                latitude  : rideRequest.stop2_latitude,
                longitude : rideRequest.stop2_longitude,
                address   : rideRequest.stop2_address
            } : null,
            user_id       : rideRequest.user_id
        };
        console.log(`\n📤 SENDING NOTIFICATIONS TO ${nearbyDrivers.length} DRIVERS...`);
        const notificationResult = await FirebaseService.sendRideRequestNotifications(nearbyDrivers,rideRequest,rideDetails);
        console.log(`\n📊 NOTIFICATION RESULT:`, notificationResult);
        if(notificationResult.success && notificationResult.drivers_notified > 0){
            console.log(`✅ Successfully notified ${notificationResult.drivers_notified} drivers`);
            const notifiedDriversData = nearbyDrivers.map(d => {
                const baseData = {
                    driver_id       : d.driver_id,
                    distance_km     : d.distance_km,
                    selection_score : d.selection_score
                };
                if(isBookAnyVehicle && d.vehicle_type_id){
                    baseData.vehicle_type_id   = d.vehicle_type_id;
                    baseData.vehicle_type_name = d.vehicle_type_name;
                    baseData.vehicle_capacity  = d.vehicle_capacity;
                    if(d.alternative_vehicle_types?.length > 0){
                        baseData.alternative_vehicle_types = d.alternative_vehicle_types;
                    }
                }
                return baseData;
            });
            await RideRequests.update({
                drivers_notified: (rideRequest.drivers_notified || 0) + notificationResult.drivers_notified,
                notified_drivers: JSON.stringify(notifiedDriversData),
                metadata: JSON.stringify({
                    ...metadataUpdate,
                    restart_success          : true,
                    restart_attempt          : restartAttempt,
                    restart_drivers_notified : notificationResult.drivers_notified,
                    restart_at               : new Date().toISOString(),
                    is_book_any_vehicle      : isBookAnyVehicle,
                    search_vehicle_type_id   : searchVehicleTypeId,
                    excluded_drivers_verified: verifiedExcludedDriverIds.length,
                    excluded_driver_ids      : verifiedExcludedDriverIds, 
                    ...(nearbyDrivers[0]?.search_metadata && {
                        restart_search_metadata: nearbyDrivers[0].search_metadata
                    })
                })
            }, {
                where: { id: rideRequestId }
            });
            // Notify passenger
            await FirebaseService.sendNotificationToUser(rideRequest.user_id, {
                title               : 'Finding New Driver',
                body                : `We're notifying ${notificationResult.drivers_notified} nearby drivers for your ride.`,
                type                : 'search_restarted',
                ride_request_id     : rideRequestId,
                drivers_count       : notificationResult.drivers_notified,
                is_book_any_vehicle : isBookAnyVehicle,
                restart_attempt     : restartAttempt
            });
        }else{
            console.log(`❌ NOTIFICATION FAILED`);
            await RideRequests.update({
                status: 'notification_failed',
                metadata: JSON.stringify({
                    ...metadataUpdate,
                    restart_failed_reason  : 'notification_failed',
                    restart_failed_at      : new Date().toISOString(),
                    restart_attempt        : restartAttempt,
                    notification_errors    : notificationResult.notification_errors,
                    is_book_any_vehicle    : isBookAnyVehicle,
                    excluded_drivers_count : verifiedExcludedDriverIds.length
                })
            }, {
                where: { id: rideRequestId }
            });
            await FirebaseService.sendNotificationToUser(rideRequest.user_id, {
                title: 'Unable to Find Driver',
                body: 'We encountered an issue while searching for drivers. Please request a new ride.',
                type: 'restart_notification_failed',
                ride_request_id: rideRequestId
            });
        }
    }catch(error){
        console.error(`\n   ❌ ERROR IN RESTART HANDLER:`, error);
        console.error(`   📊 Error Details:`, error.stack);
        try{
            await RideRequests.update({
                status: 'driver_search_failed',
                metadata: JSON.stringify({
                    restart_error: error.message,
                    restart_failed_at: new Date().toISOString(),
                    restart_attempt: restartAttempt,
                    error_stack: error.stack
                })
            }, {
                where: { id: rideRequestId }
            });
        }catch(updateError){
            console.error('   ❌ Failed to update ride status after error:', updateError);
        }
        throw error;
    }
}

// FUNCTION TO DETERMINE TRIP TYPE BASED ON DISTANCE AND OUTSTATION KM
async function determineTripType(estimatedDistance, vehicleType) {
    try{
        const priceRecord = vehicleType.prices && vehicleType.prices[0];
        if(!priceRecord){
            console.error(`No price record found for vehicle type ${vehicleType.id}`);
            return 1; 
        }
        const outstationKm = priceRecord.outstation_km || 0;
        // If no outstation_km is set or is 0, it's INTERCITY
        if(!outstationKm || outstationKm <= 0){
            return 1; 
        }
        // If estimated distance exceeds outstation_km, it's OUTSTATION
        if(estimatedDistance > outstationKm){
            return 2;
        }
        return 1; // INTERCITY
    }catch(error){
        console.error('Error determining trip type:', error);
        return 1; 
    }
}

// Helper function to check if location is within any service area and get available vehicle types
async function checkLocationInServiceArea(latitude, longitude){
    try{
        const services = await Services.findAll({
            where: { 
                status: 1,
                polygon_coordinates: {
                    [Op.ne]: null
                }
            }
        });
        if(!services || services.length === 0){
            return { 
                inServiceArea: false, 
                serviceName: null, 
                availableVehicleTypes: [] 
            };
        }
        const point = [longitude, latitude]; // Note: GeoJSON uses [longitude, latitude]
        for(const service of services) {
            if(service.polygon_coordinates){
                try{
                    // Smart parsing: handles both single and double-encoded JSON
                    let polygonData = JSON.parse(service.polygon_coordinates);
                    // If result is still a string, it was double-encoded, parse again
                    if(typeof polygonData === 'string'){
                        polygonData = JSON.parse(polygonData);
                    }
                    let polygonCoords;
                    if(Array.isArray(polygonData) && polygonData.length > 0){
                        if(Array.isArray(polygonData[0]) && Array.isArray(polygonData[0][0]) && Array.isArray(polygonData[0][0][0])){
                            // GeoJSON MultiPolygon format [[[coords]]]
                            polygonCoords = polygonData[0][0];
                        }else 
                        if(Array.isArray(polygonData[0]) && Array.isArray(polygonData[0][0])){
                            // GeoJSON Polygon format [[coords]]
                            polygonCoords = polygonData[0];
                        }else 
                        if(Array.isArray(polygonData[0])){
                            // Simple array of coordinates
                            polygonCoords = polygonData;
                        }
                    }
                    if(polygonCoords && isPointInPolygon(point, polygonCoords)){
                        let availableVehicleTypes = [];
                        if(service.vehicle_type_ids){
                            try{
                                // Smart parsing for vehicle types too
                                let vehicleTypeIds = JSON.parse(service.vehicle_type_ids);
                                
                                // If result is still a string, it was double-encoded, parse again
                                if(typeof vehicleTypeIds === 'string'){
                                    vehicleTypeIds = JSON.parse(vehicleTypeIds);
                                }
                                
                                if(Array.isArray(vehicleTypeIds)){
                                    availableVehicleTypes = vehicleTypeIds;
                                }
                            }catch(parseVehicleError){
                                console.error(`Error parsing vehicle_type_ids for service ${service.name}:`, parseVehicleError);
                            }
                        }
                        return{ 
                            inServiceArea: true, 
                            serviceName: service.name,
                            serviceId: service.id,
                            availableVehicleTypes: availableVehicleTypes
                        };
                    }
                }catch(parseError){
                    console.error(`Error parsing polygon for service ${service.name}:`, parseError);
                }
            }
        }
        return { 
            inServiceArea: false, 
            serviceName: null, 
            availableVehicleTypes: [] 
        };
    }catch(error){
        console.error('Error checking service area:', error);
        return { inServiceArea: false, serviceName: null, availableVehicleTypes: [], error: error.message };
    }
}

// Helper Function to validate and apply coupon
async function validateAndApplyCoupon(coupon_code, user_id, fare, trip_type, vehicle_type_id, distance){
    try{
        // Find the coupon
        const coupon = await Coupon.findOne({
            where: { 
                code: coupon_code,
                status: 1
            }
        });
        if(!coupon){
            return { 
                success: false, 
                message: 'Invalid coupon code.' 
            };
        }
        // Check if coupon is active (time-based)
        const now = new Date();
        if(now < new Date(coupon.starts_at) || now > new Date(coupon.expires_at)){
            return { 
                success: false, 
                message: 'Coupon has expired or is not yet active.' 
            };
        }
        // Check minimum order value
        if(coupon.min_order_value && fare < coupon.min_order_value){
            return { 
                success: false, 
                message: `Minimum order value of ₹${coupon.min_order_value} required for this coupon.` 
            };
        }
        // Check distance restrictions
        if(coupon.min_distance && distance < coupon.min_distance){
            return { 
                success: false, 
                message: `Minimum ride distance of ${coupon.min_distance}km required for this coupon.` 
            };
        }
        if(coupon.max_distance && distance > coupon.max_distance){
            return { 
                success: false, 
                message: `Maximum ride distance of ${coupon.max_distance}km exceeded for this coupon.` 
            };
        }
        // Check vehicle type restrictions
        if(coupon.vehicle_type_restrictions){
            const allowedVehicleTypes = coupon.vehicle_type_restrictions.split(',').map(id => parseInt(id.trim()));
            if(!allowedVehicleTypes.includes(vehicle_type_id)){
                return { 
                    success: false, 
                    message: 'This coupon is not valid for the selected vehicle type.' 
                };
            }
        }
        // Check trip type restrictions
        if(coupon.trip_type_restrictions){
            const allowedTripTypes = coupon.trip_type_restrictions.split(',').map(id => parseInt(id.trim()));
            if(!allowedTripTypes.includes(trip_type)){
                const tripTypeName = trip_type === 1 ? 'intercity' : 'outstation';
                return { 
                    success: false, 
                    message: `This coupon is not valid for ${tripTypeName} trips.` 
                };
            }
        }
        // Check if user already has this coupon in user_coupons (for targeted coupons)
        const userCoupon = await UserCoupons.findOne({
            where: {
                user_id: user_id,
                promo_id: coupon.id
            }
        });
        // If coupon type is 'firstride', check if user has any previous rides
        if(coupon.coupon_type === 'firstride'){
            const previousRides = await RideRequests.count({
                where: {
                    user_id: user_id,
                    status: 'ride_completed'
                }
            });
            if(previousRides > 0){
                return { 
                    success: false, 
                    message: 'This first ride coupon can only be used on your first ride.' 
                };
            }
        }
        // Check per-user usage limit
        const userUsageCount = await PromoUsages.count({
            where: {
                user_id: user_id,
                promo_id: coupon.id
            }
        });
        if(userUsageCount >= coupon.per_user_limit){
            return { 
                success: false, 
                message: 'You have already used this coupon the maximum number of times.' 
            };
        }
        // Check total usage limit
        if(coupon.usage_limit){
            const totalUsageCount = await PromoUsages.count({
                where: {
                    promo_id: coupon.id
                }
            });
            if(totalUsageCount >= coupon.usage_limit){
                return { 
                    success: false, 
                    message: 'This coupon has reached its usage limit.' 
                };
            }
        }
        // For targeted coupons, check if user has the coupon assigned and unused
        if(['referral', 'targeted'].includes(coupon.coupon_type)){
            if(!userCoupon){
                return { 
                    success: false, 
                    message: 'You do not have access to this coupon.' 
                };
            }
            if(userCoupon.is_used){
                return { 
                    success: false, 
                    message: 'This coupon has already been used.' 
                };
            }
            // Check user-specific expiration
            if(userCoupon.valid_until && now > new Date(userCoupon.valid_until)){
                return { 
                    success: false, 
                    message: 'Your coupon has expired.' 
                };
            }
        }
        // Calculate discount amount
        let discount_amount = 0;
        if(coupon.discount_type === 'percentage'){
            discount_amount = (fare * coupon.discount_value) / 100;
            if(coupon.max_discount && discount_amount > coupon.max_discount){
                discount_amount = coupon.max_discount;
            }
        }else{ // fixed
            discount_amount = coupon.discount_value;
        }
        // Ensure discount doesn't exceed fare
        discount_amount = Math.min(discount_amount, fare);
        return {
            success: true,
            coupon_id: coupon.id,
            discount_amount: Math.round(discount_amount * 100) / 100, 
            coupon_type: coupon.coupon_type,
            user_coupon_id: userCoupon ? userCoupon.id : null
        };
    }catch(error){
        console.error('Error validating coupon:', error);
        return { success: false, message: 'Error validating coupon.' };
    }
}

// Process pending cancellation charges for a user
async function processPendingCancellationCharges(user_id, rideFare, transaction) {
    try{
        // Get user's pending cancellation charge
        const user = await User.findByPk(user_id, {
            attributes: ['id', 'pending_cancellation_charge'],
            transaction
        });
        const pendingCharge = parseFloat(user.pending_cancellation_charge || 0);
        // Check admin settings for maximum cancellation amount
        const adminSettings = await Settings.findOne({
            where: { role: 'admin' }
        });
        const maxCancellationAmt = parseFloat(adminSettings?.max_cancellation_amt || 2000);
        // Block ride requests if pending charges exceed the admin-defined max cancellation amount
        if(pendingCharge > maxCancellationAmt){
            return {
                success: false,
                blocked: true,
                hasPendingCharges: true,
                pendingAmount: pendingCharge,
                adjustedFare: rideFare,
                appliedCharge: 0,
                message: `You have pending cancellation charges of ₹${pendingCharge.toFixed(2)}. Please clear your pending charges before booking a new ride.`,
                error: 'PENDING_CHARGES_EXCEED_LIMIT'
            };
        }
        if(pendingCharge <= 0){
            return {
                success: true,
                hasPendingCharges: false,
                pendingAmount: 0,
                adjustedFare: rideFare,
                appliedCharge: 0
            };
        }
        // Calculate how much we can deduct from this ride
        const appliedCharge          = Math.min(pendingCharge, rideFare);
        const adjustedFare           = rideFare + appliedCharge;
        const remainingPendingCharge = pendingCharge - appliedCharge;
        return {
            success: true,
            hasPendingCharges: true,
            pendingAmount: pendingCharge,
            adjustedFare: adjustedFare,
            appliedCharge: appliedCharge,
            remainingPendingCharge: remainingPendingCharge,
            message: appliedCharge === pendingCharge 
                ? `Previous cancellation charge of ₹${appliedCharge.toFixed(2)} has been added to this ride`
                : `Partial cancellation charge of ₹${appliedCharge.toFixed(2)} has been added. Remaining ₹${remainingPendingCharge.toFixed(2)} will be charged on your next ride`
        };
    }catch(error){
        console.error('Error processing pending cancellation charges:', error);
        return {
            success: false,
            error: error.message,
            hasPendingCharges: false,
            pendingAmount: 0,
            adjustedFare: rideFare,
            appliedCharge: 0
        };
    }
}

// Clear pending charges after successful payment
async function clearPendingCancellationCharges(user_id, appliedCharge, transaction) {
    try{
        const user = await User.findByPk(user_id, {
            attributes: ['id', 'pending_cancellation_charge'],
            lock: true,
            transaction
        });
        const currentPending = parseFloat(user.pending_cancellation_charge || 0);
        const newPending = Math.max(0, currentPending - appliedCharge);
        await User.update({
            pending_cancellation_charge: newPending
        }, {
            where: { id: user_id },
            transaction
        });
        return {
            success: true,
            previousPending: currentPending,
            charged: appliedCharge,
            remainingPending: newPending
        };
    }catch(error){
        console.error('Error clearing pending cancellation charges:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to calculate route information
async function calculateRouteInfo(pickup, drop, stop1, stop2){
    try{
        const origins      = [`${pickup.latitude},${pickup.longitude}`];
        const destinations = [`${drop.latitude},${drop.longitude}`];
        let waypoints      = [];
        if (stop1) waypoints.push(`${stop1.latitude},${stop1.longitude}`);
        if (stop2) waypoints.push(`${stop2.latitude},${stop2.longitude}`);
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origins[0]}&destination=${destinations[0]}${
            waypoints.length > 0 ? `&waypoints=${waypoints.join('|')}` : ''
        }&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await axios.get(url);
        const data     = response.data;
        if(data.status !== 'OK'){
            return { error: 'Unable to calculate route' };
        }
        const route       = data.routes[0];
        let totalDistance = 0;
        let totalDuration = 0;
        route.legs.forEach((leg) => {
            totalDistance += leg.distance.value / 1000;
            totalDuration += leg.duration.value;
        });
        return {
            totalDistance: parseFloat(totalDistance.toFixed(2)) + ' km',
            totalDuration: Math.round(totalDuration / 60) + ' minutes',
            segments: route.legs.map((leg, index) => ({
                from: index === 0 ? 'pickup' : `stop${index}`,
                to: index === route.legs.length - 1 ? 'drop' : `stop${index + 1}`,
                distance: (leg.distance.value / 1000).toFixed(2) + ' km',
                duration: Math.round(leg.duration.value / 60) + ' min'
            }))
        };
    }catch(error){
        console.error('Error calculating route info:', error);
        return { error: 'Route calculation failed' };
    }
}

// Updated calculateInitialEstimates function
async function calculateInitialEstimates(pickup, drop, stop1, stop2, trip_id, trip_type, vehicleType, pickup_date = null, pickup_time = null, estimated_duration = null, actual_duration = null) {
    try{
        if(!GOOGLE_MAPS_API_KEY){
            return{
                success: false,
                error: 'Google Maps API key not configured'
            };
        }
        const origins      = [`${pickup.latitude},${pickup.longitude}`];
        const destinations = [`${drop.latitude},${drop.longitude}`];
        let waypoints      = [];
        if(stop1){
            waypoints.push(`${stop1.latitude},${stop1.longitude}`);
        }
        if(stop2){
            waypoints.push(`${stop2.latitude},${stop2.longitude}`);
        }
        const url      = `https://maps.googleapis.com/maps/api/directions/json?origin=${origins[0]}&destination=${destinations[0]}${
            waypoints.length > 0 ? `&waypoints=${waypoints.join('|')}` : ''
        }&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await axios.get(url, { timeout: 10000 });
        const data     = response.data;
        if(data.status !== 'OK'){
            throw new Error(`Google Maps API error: ${data.status}`);
        }
        if(!data.routes || data.routes.length === 0){
            return{
                success: false,
                error: 'No routes found for the given locations'
            };
        }
        const route       = data.routes[0];
        let totalDistance = 0;
        let totalDuration = 0;
        route.legs.forEach((leg) => {
            totalDistance += leg.distance.value / 1000; // Convert to km
            totalDuration += leg.duration.value / 60;   // Convert to minutes
        });
        // If trip_type is not provided, determine it based on distance and vehicle's outstation_km
        let finalTripType = trip_type;
        if(finalTripType === null || finalTripType === undefined){
            finalTripType = await determineTripType(totalDistance, vehicleType);
        }
        const finalEstimatedDuration = estimated_duration || Math.round(totalDuration);
        const finalActualDuration    = actual_duration || Math.round(totalDuration);
        let fareBreakdown;
        switch(trip_id){
            case 1: // One Way
                fareBreakdown = calculateOneWayFare(totalDistance, totalDuration, finalTripType, vehicleType, pickup_date, pickup_time, finalEstimatedDuration, finalActualDuration);
                break;
            case 2: // Round Trip 
                fareBreakdown = calculateRoundTripFare(totalDistance, totalDuration, finalTripType, vehicleType, pickup_date, pickup_time, finalEstimatedDuration, finalActualDuration);
                break;
            default:
                return{
                    success: false,
                    error: 'Invalid trip type'
                };
        }
        fareBreakdown.distance           = parseFloat(totalDistance.toFixed(2));
        fareBreakdown.duration           = Math.round(totalDuration);
        fareBreakdown.vehicleType        = vehicleType.name;
        fareBreakdown.tripType           = finalTripType === 1 ? 'INTERCITY' : 'OUTSTATION';
        fareBreakdown.tripId             = getTripTypeName(trip_id);
        fareBreakdown.determinedTripType = finalTripType; // Add this for reference
        return{
            success: true,
            breakdown: fareBreakdown
        };
    }catch(error){
        console.error('Error calculating estimates:', error);
        return{
            success: false,
            error: error.code === 'ECONNABORTED' ? 
                'Request timeout - Google Maps API not responding' : 
                error.response?.data?.error_message || error.message || 'Failed to calculate route estimates'
        };
    }
}

// ONE WAY FARE CALCULATION
function calculateOneWayFare(distance, duration, trip_type, vehicleType, pickup_date = null, pickup_time = null, estimated_duration = null, actual_duration = null, pickupState = null, dropState = null) {
    try{
        const isIntercity       = trip_type === 1;
        const baseFare          = parseFloat(isIntercity ? vehicleType.prices[0].intercity_base_fare : vehicleType.prices[0].outstation_base_fare || 0);
        const perKmCharge       = parseFloat(isIntercity ? vehicleType.prices[0].intercity_per_km_charges : vehicleType.prices[0].outstation_per_km_charges || 0);
        const waitingTimeCharge = parseFloat(isIntercity ? vehicleType.prices[0].intercity_waiting_charges : vehicleType.prices[0].outstation_waiting_charges || 0);
        const bataCharges       = parseFloat(isIntercity ? vehicleType.prices[0].intercity_bata_charges : vehicleType.prices[0].outstation_bata_charges || 0);
        const minFare           = parseFloat(isIntercity ? vehicleType.prices[0].intercity_minimum_fare : vehicleType.prices[0].outstation_minimum_fare || 0);

        // Calculate distance charge
        const distanceCharge = distance * perKmCharge;

        // Calculate extra time based on actual vs estimated duration
        let waitingTimeXExtraTime = 0;
        if(estimated_duration && actual_duration){
            const extraMinutes = Math.max(0, actual_duration - estimated_duration);
            if(extraMinutes > 0){
                waitingTimeXExtraTime = waitingTimeCharge * extraMinutes;
            }
        }

        // Calculate distance+duration x BATA
        const distancePlusDurationXBata = (distance + duration) * bataCharges;

        // Determine ride type based on extra minutes
        let isWaitRide     = false;
        let rideType       = 'normal';
        let extraMinutes   = 0;
        if(estimated_duration && actual_duration){
            extraMinutes   = Math.max(0, actual_duration - estimated_duration);
            if(extraMinutes > 0){
                isWaitRide = true;
                rideType   = 'wait';
            }
        }

        // Check if pickup time is in BATA hours
        let isBataTime = false;
        if(pickup_date && pickup_time){
            const pickupDateTime = new Date(`${pickup_date}T${pickup_time}:00`);
            const hour           = pickupDateTime.getHours();
            const bataStartTime  = parseInt(vehicleType.prices[0].bata_time_start || 21);
            const bataEndTime    = parseInt(vehicleType.prices[0].bata_time_end || 5);
            if(bataStartTime > bataEndTime){
                // BATA time spans midnight
                isBataTime = hour >= bataStartTime || hour < bataEndTime;
            }else{
                // BATA time within same day
                isBataTime = hour >= bataStartTime && hour < bataEndTime;
            }
        }

        // Calculate subtotal based on ride type
        let subtotal;
        if(!isWaitRide){
            // Normal ride
            subtotal = distanceCharge + baseFare;
        }else{
            // Wait ride
            subtotal = distanceCharge + baseFare + waitingTimeXExtraTime;
        }

        // Apply minimum fare if applicable
        if(minFare > 0){
            subtotal = Math.max(subtotal, minFare);
        }

        // Calculate GST breakdown
        const gstBreakdown = calculateGSTBreakdown(subtotal, vehicleType, pickupState, dropState);

        // Calculate total with GST
        const totalWithGst = subtotal + gstBreakdown.totalGstAmount;

        // Calculate total with BATA and GST if applicable
        let totalWithBataAndGst = totalWithGst;
        let bataGstBreakdown    = null;
        if(isBataTime){
            const subtotalWithBata = subtotal + distancePlusDurationXBata;
            bataGstBreakdown       = calculateGSTBreakdown(subtotalWithBata, vehicleType, pickupState, dropState);
            totalWithBataAndGst    = subtotalWithBata + bataGstBreakdown.totalGstAmount;
        }

        // Use BATA GST breakdown if BATA time, otherwise use regular GST breakdown
        const finalGstBreakdown = isBataTime ? bataGstBreakdown : gstBreakdown;

        // Round all values to 2 decimal places
        const roundTo2 = (num) => Math.round(num * 100) / 100;
        return{
            // Basic fare components
            baseFare                  : roundTo2(baseFare),
            distanceCharge            : roundTo2(distanceCharge),
            waitingTimeCharge         : roundTo2(waitingTimeCharge),
            waitingTimeXExtraTime     : roundTo2(waitingTimeXExtraTime),
            bataCharge                : roundTo2(bataCharges),

            // Calculated components
            distancePlusDurationXBata : roundTo2(distancePlusDurationXBata),
            subtotal                  : roundTo2(subtotal),

            // GST breakdown
            gstType                   : finalGstBreakdown.gstType,
            isInterstate              : finalGstBreakdown.isInterstate,
            igstRate                  : finalGstBreakdown.igstRate,
            cgstRate                  : finalGstBreakdown.cgstRate,
            sgstRate                  : finalGstBreakdown.sgstRate,
            igstAmount                : roundTo2(finalGstBreakdown.igstAmount),
            cgstAmount                : roundTo2(finalGstBreakdown.cgstAmount),
            sgstAmount                : roundTo2(finalGstBreakdown.sgstAmount),
            gstAmount                 : roundTo2(finalGstBreakdown.totalGstAmount), 
            totalGstAmount            : roundTo2(finalGstBreakdown.totalGstAmount),

            // Final totals
            totalRideFare             : roundTo2(totalWithGst),
            totalWithBataAndGst       : roundTo2(totalWithBataAndGst),

            // Additional info
            rideType                  : rideType,
            isWaitRide                : isWaitRide,
            isBataTime                : isBataTime,
            tripType                  : isIntercity ? 'INTERCITY' : 'OUTSTATION',

            // Debug info
            estimatedDuration         : estimated_duration || duration,
            actualDuration            : actual_duration || duration,
            extraMinutes              : extraMinutes,

            // Breakdown for display
            fareBreakdown             : {
                baseFare              : '₹' + roundTo2(baseFare),
                distanceCharge        : '₹' + roundTo2(distanceCharge),
                waitingTime           : '₹' + roundTo2(waitingTimeCharge),
                waitingTimeXExtraTime : '₹' + roundTo2(waitingTimeXExtraTime),
                bataCharges           : '₹' + roundTo2(isBataTime ? distancePlusDurationXBata : 0),
                subtotal              : '₹' + roundTo2(subtotal),
                gstType               : finalGstBreakdown.gstType,
                ...(finalGstBreakdown.isInterstate ? {
                    igst: finalGstBreakdown.igstRate + '% (₹' + roundTo2(finalGstBreakdown.igstAmount) + ')'
                } : {
                    cgst: finalGstBreakdown.cgstRate + '% (₹' + roundTo2(finalGstBreakdown.cgstAmount) + ')',
                    sgst: finalGstBreakdown.sgstRate + '% (₹' + roundTo2(finalGstBreakdown.sgstAmount) + ')'
                }),
                totalGst              : '₹' + roundTo2(finalGstBreakdown.totalGstAmount),
                totalRideFare         : '₹' + roundTo2(totalWithGst),
                totalRideFareInclBataCharge: '₹' + roundTo2(totalWithBataAndGst)
            }
        };
    }catch(error){
        console.error('Error in calculateOneWayFare:', error);
        return{
            success: false,
            error: error.message || 'Fare calculation failed'
        };
    }
}

// ROUND TRIP FARE CALCULATION
function calculateRoundTripFare(distance, duration, trip_type, vehicleType, pickup_date = null, pickup_time = null, estimated_duration = null, actual_duration = null, pickupState = null, dropState = null) {
    try{
        const isIntercity       = trip_type === 1;
        const baseFare          = parseFloat(isIntercity ? vehicleType.prices[0].round_intercity_base_fare : vehicleType.prices[0].round_outstation_base_fare || 0);
        const perKmCharge       = parseFloat(isIntercity ? vehicleType.prices[0].round_intercity_per_km_charges : vehicleType.prices[0].round_outstation_per_km_charges || 0);
        const waitingTimeCharge = parseFloat(isIntercity ? vehicleType.prices[0].round_intercity_waiting_charges : vehicleType.prices[0].round_outstation_waiting_charges || 0);
        const bataCharges       = parseFloat(isIntercity ? vehicleType.prices[0].round_intercity_bata_charges : vehicleType.prices[0].round_outstation_bata_charges || 0);
        const minFare           = parseFloat(isIntercity ? vehicleType.prices[0].round_intercity_minimum_fare : vehicleType.prices[0].round_outstation_minimum_fare || 0);

        // Calculate distance charge
        const distanceCharge = distance * perKmCharge;

        // Calculate extra time based on actual vs estimated duration
        let waitingTimeXExtraTime = 0;
        if(estimated_duration && actual_duration){
            const extraMinutes = Math.max(0, actual_duration - estimated_duration);
            if(extraMinutes > 0){
                waitingTimeXExtraTime = waitingTimeCharge * extraMinutes;
            }
        }

        // Calculate distance+duration x BATA
        const distancePlusDurationXBata = (distance + duration) * bataCharges;

        // Determine ride type based on extra minutes
        let isWaitRide     = false;
        let rideType       = 'normal';
        let extraMinutes   = 0;
        if(estimated_duration && actual_duration){
            extraMinutes   = Math.max(0, actual_duration - estimated_duration);
            if(extraMinutes > 0){
                isWaitRide = true;
                rideType   = 'wait';
            }
        }

        // Check if pickup time is in BATA hours
        let isBataTime = false;
        if(pickup_date && pickup_time){
            const pickupDateTime = new Date(`${pickup_date}T${pickup_time}:00`);
            const hour           = pickupDateTime.getHours();
            const bataStartTime  = parseInt(vehicleType.prices[0].bata_time_start || 21);
            const bataEndTime    = parseInt(vehicleType.prices[0].bata_time_end || 5);
            if(bataStartTime > bataEndTime){
                // BATA time spans midnight
                isBataTime = hour >= bataStartTime || hour < bataEndTime;
            }else{
                // BATA time within same day
                isBataTime = hour >= bataStartTime && hour < bataEndTime;
            }
        }

        // Calculate subtotal based on ride type
        let subtotal;
        if(!isWaitRide){
            // Normal ride
            subtotal = distanceCharge + baseFare;
        }else{
            // Wait ride
            subtotal = distanceCharge + baseFare + waitingTimeXExtraTime;
        }

        // Apply minimum fare if applicable
        if(minFare > 0){
            subtotal = Math.max(subtotal, minFare);
        }

        // Calculate GST breakdown
        const gstBreakdown = calculateGSTBreakdown(subtotal, vehicleType, pickupState, dropState);

        // Calculate total with GST
        const totalWithGst = subtotal + gstBreakdown.totalGstAmount;

        // Calculate total with BATA and GST if applicable
        let totalWithBataAndGst = totalWithGst;
        let bataGstBreakdown    = null;
        if(isBataTime){
            const subtotalWithBata = subtotal + distancePlusDurationXBata;
            bataGstBreakdown       = calculateGSTBreakdown(subtotalWithBata, vehicleType, pickupState, dropState);
            totalWithBataAndGst    = subtotalWithBata + bataGstBreakdown.totalGstAmount;
        }

        // Use BATA GST breakdown if BATA time, otherwise use regular GST breakdown
        const finalGstBreakdown = isBataTime ? bataGstBreakdown : gstBreakdown;

        // Round all values to 2 decimal places
        const roundTo2 = (num) => Math.round(num * 100) / 100;
        return{
            // Basic fare components
            baseFare                  : roundTo2(baseFare),
            distanceCharge            : roundTo2(distanceCharge),
            waitingTimeCharge         : roundTo2(waitingTimeCharge),
            waitingTimeXExtraTime     : roundTo2(waitingTimeXExtraTime),
            bataCharge                : roundTo2(bataCharges),

            // Calculated components
            distancePlusDurationXBata : roundTo2(distancePlusDurationXBata),
            subtotal                  : roundTo2(subtotal),

            // GST breakdown
            gstType                   : finalGstBreakdown.gstType,
            isInterstate              : finalGstBreakdown.isInterstate,
            igstRate                  : finalGstBreakdown.igstRate,
            cgstRate                  : finalGstBreakdown.cgstRate,
            sgstRate                  : finalGstBreakdown.sgstRate,
            igstAmount                : roundTo2(finalGstBreakdown.igstAmount),
            cgstAmount                : roundTo2(finalGstBreakdown.cgstAmount),
            sgstAmount                : roundTo2(finalGstBreakdown.sgstAmount),
            gstAmount                 : roundTo2(finalGstBreakdown.totalGstAmount), 
            totalGstAmount            : roundTo2(finalGstBreakdown.totalGstAmount),

            // Final totals
            totalRideFare             : roundTo2(totalWithGst),
            totalWithBataAndGst       : roundTo2(totalWithBataAndGst),

            // Additional info
            rideType                  : rideType,
            isWaitRide                : isWaitRide,
            isBataTime                : isBataTime,
            tripType                  : isIntercity ? 'INTERCITY' : 'OUTSTATION',

            // Debug info
            estimatedDuration         : estimated_duration || duration,
            actualDuration            : actual_duration || duration,
            extraMinutes              : extraMinutes,

            // Breakdown for display
            fareBreakdown             : {
                baseFare              : '₹' + roundTo2(baseFare),
                distanceCharge        : '₹' + roundTo2(distanceCharge),
                waitingTime           : '₹' + roundTo2(waitingTimeCharge),
                waitingTimeXExtraTime : '₹' + roundTo2(waitingTimeXExtraTime),
                bataCharges           : '₹' + roundTo2(isBataTime ? distancePlusDurationXBata : 0),
                subtotal              : '₹' + roundTo2(subtotal),
                gstType               : finalGstBreakdown.gstType,
                ...(finalGstBreakdown.isInterstate ? {
                    igst: finalGstBreakdown.igstRate + '% (₹' + roundTo2(finalGstBreakdown.igstAmount) + ')'
                } : {
                    cgst: finalGstBreakdown.cgstRate + '% (₹' + roundTo2(finalGstBreakdown.cgstAmount) + ')',
                    sgst: finalGstBreakdown.sgstRate + '% (₹' + roundTo2(finalGstBreakdown.sgstAmount) + ')'
                }),
                totalGst              : '₹' + roundTo2(finalGstBreakdown.totalGstAmount),
                totalRideFare         : '₹' + roundTo2(totalWithGst),
                totalRideFareInclBataCharge: '₹' + roundTo2(totalWithBataAndGst)
            }
        };
    }catch(error){
        console.error('Error in calculateRoundTripFare:', error);
        return{
            success: false,
            error: error.message || 'Fare calculation failed'
        };
    }
}

// RESERVATION FARE CALCULATION
function calculateReservationFare(distance, duration, trip_type, vehicleType, pickup_date = null, pickup_time = null, pickupState = null, dropState = null) {
    try{
        const baseFare       = parseFloat(vehicleType.prices[0].reservation_base_fare || 0);
        const perKmCharge    = parseFloat(vehicleType.prices[0].reservation_per_km_charges || 0);
        const packageKmLimit = vehicleType.prices[0].package_id ? parseFloat(vehicleType.prices[0].Package?.km || 0) : 0;

        // Calculate distance charge
        const distanceCharge = distance * perKmCharge;

        // Calculate subtotal (only base fare + distance charge for reservation)
        const subtotal       = baseFare + distanceCharge;

        // Calculate GST breakdown
        const gstBreakdown   = calculateGSTBreakdown(subtotal, vehicleType, pickupState, dropState);

        // Calculate total with GST
        const totalWithGst   = subtotal + gstBreakdown.totalGstAmount;

        // For reservation, no BATA charges apply
        const totalWithBataAndGst = totalWithGst;

        // Round all values to 2 decimal places
        const roundTo2 = (num) => Math.round(num * 100) / 100;
        return{
            // Basic fare components
            baseFare                    : roundTo2(baseFare),
            distanceCharge              : roundTo2(distanceCharge),
            perKmCharge                 : roundTo2(perKmCharge),
            
            // Package information
            packageKmLimit              : packageKmLimit,
            
            // No waiting or BATA charges for reservation
            waitingTimeCharge           : 0,
            waitingTimeXExtraTime       : 0,
            bataCharge                  : 0,
            distancePlusDurationXBata   : 0,

            // Calculated components
            subtotal: roundTo2(subtotal),

            // GST breakdown
            gstType                     : gstBreakdown.gstType,
            isInterstate                : gstBreakdown.isInterstate,
            igstRate                    : gstBreakdown.igstRate,
            cgstRate                    : gstBreakdown.cgstRate,
            sgstRate                    : gstBreakdown.sgstRate,
            igstAmount                  : roundTo2(gstBreakdown.igstAmount),
            cgstAmount                  : roundTo2(gstBreakdown.cgstAmount),
            sgstAmount                  : roundTo2(gstBreakdown.sgstAmount),
            gstAmount                   : roundTo2(gstBreakdown.totalGstAmount),
            totalGstAmount              : roundTo2(gstBreakdown.totalGstAmount),

            // Final totals
            totalRideFare               : roundTo2(totalWithGst),
            totalWithBataAndGst         : roundTo2(totalWithBataAndGst),

            // Additional info
            rideType                    : 'package',
            isWaitRide                  : false,
            isBataTime                  : false,
            tripType                    : 'RESERVE',

            // Distance and duration
            distance                    : distance,
            duration                    : duration,
            estimatedDuration           : duration,
            actualDuration              : duration,
            extraMinutes                : 0,

            // Breakdown for display
            fareBreakdown               : {
                baseFare                : '₹' + roundTo2(baseFare),
                perKmCharge             : '₹' + roundTo2(perKmCharge) + '/km',
                distanceCharge          : '₹' + roundTo2(distanceCharge),
                packageKmLimit          : packageKmLimit ? packageKmLimit + ' km' : 'N/A',
                waitingTime             : '₹0.00',
                waitingTimeXExtraTime   : '₹0.00',
                bataCharges             : '₹0.00',
                subtotal                : '₹' + roundTo2(subtotal),
                gstType                 : gstBreakdown.gstType,
                ...(gstBreakdown.isInterstate ? {
                    igst: gstBreakdown.igstRate + '% (₹' + roundTo2(gstBreakdown.igstAmount) + ')'
                } : {
                    cgst: gstBreakdown.cgstRate + '% (₹' + roundTo2(gstBreakdown.cgstAmount) + ')',
                    sgst: gstBreakdown.sgstRate + '% (₹' + roundTo2(gstBreakdown.sgstAmount) + ')'
                }),
                totalGst                : '₹' + roundTo2(gstBreakdown.totalGstAmount),
                totalRideFare           : '₹' + roundTo2(totalWithGst),
                totalRideFareInclBataCharge : '₹' + roundTo2(totalWithBataAndGst)
            }
        };
    }catch(error){
        console.error('Error in calculateReservationFare:', error);
        return {
            success: false,
            error: error.message || 'Reservation fare calculation failed'
        };
    }
}

// Helper function to determine GST type based on pickup and drop states
function determineGSTType(pickupState, dropState){
    const isInterstate = pickupState && dropState && pickupState.toLowerCase() !== dropState.toLowerCase();
    return{
        isInterstate,
        gstType: isInterstate ? 'IGST' : 'CGST_SGST'
    };
}

// Helper function to calculate GST breakdown
function calculateGSTBreakdown(subtotal, vehicleType, pickupState = null, dropState = null) {
    const gstInfo      = determineGSTType(pickupState, dropState);
    let igstAmount     = 0;
    let cgstAmount     = 0;
    let sgstAmount     = 0;
    let totalGstAmount = 0;
    if(gstInfo.isInterstate){
        // Interstate transaction - use IGST
        const igstRate = parseFloat(vehicleType.prices[0].igst_rate || 5);
        igstAmount     = (subtotal * igstRate) / 100;
        totalGstAmount = igstAmount;
    }else{
        // Intrastate transaction - use CGST + SGST
        const cgstRate = parseFloat(vehicleType.prices[0].cgst_rate || 2.5);
        const sgstRate = parseFloat(vehicleType.prices[0].sgst_rate || 2.5);
        cgstAmount     = (subtotal * cgstRate) / 100;
        sgstAmount     = (subtotal * sgstRate) / 100;
        totalGstAmount = cgstAmount + sgstAmount;
    }
    return{
        isInterstate   : gstInfo.isInterstate,
        gstType        : gstInfo.gstType,
        igstAmount     : Math.round(igstAmount * 100) / 100,
        cgstAmount     : Math.round(cgstAmount * 100) / 100,
        sgstAmount     : Math.round(sgstAmount * 100) / 100,
        totalGstAmount : Math.round(totalGstAmount * 100) / 100,
        igstRate       : parseFloat(vehicleType.prices[0].igst_rate || 5),
        cgstRate       : parseFloat(vehicleType.prices[0].cgst_rate || 2.5),
        sgstRate       : parseFloat(vehicleType.prices[0].sgst_rate || 2.5)
    };
}

// Helper function to get trip type name
function getTripTypeName(trip_type){
    switch (trip_type) {
        case 1: return 'ONE WAY';
        case 2: return 'ROUND TRIP';
        case 3: return 'RESERVE';
        default: return 'UNKNOWN';
    }
}

// Helper function to check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point, polygon){
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

module.exports = rideController;