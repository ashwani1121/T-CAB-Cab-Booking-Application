const User                  = require('../models/userModel');
const RideRequests          = require('../models/rideRequestModel');
const { Op }                = require('sequelize');
const FirebaseService       = require('../services/firebase'); 
const BASE_URL              = process.env.BASE_URL || 'http://localhost:5000';
const rideRequestController = {

    // Get all ride requests with pagination, search, and filters
    rideRequestDetails: async (req, res) => {
        try{
            const { page = 1, limit = 10, search = '', status = '', trip_type = '', payment_status = '',
                date_from  = '', date_to = '', pickup_state_id = '', sort_by = 'created_at', sort_order = 'DESC' 
            } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const offset   = (pageNum - 1) * limitNum;
            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: "Invalid pagination parameters"
                });
            }
            const whereConditions = {};
            // Status filter
            if(status && status.trim() !== ''){
                const validStatuses = [
                    'pending', 'searching_driver', 'accepted', 'arrived',
                    'ride_started', 'ride_completed', 'cancelled', 'expired',
                    'no_drivers_available', 'timeout'
                ];
                if(validStatuses.includes(status)){
                    whereConditions.status = status;
                }
            }
            // Trip type filter
            if(trip_type && trip_type.trim() !== ''){
                const tripTypeNum = parseInt(trip_type, 10);
                if([1, 2].includes(tripTypeNum)){
                    whereConditions.trip_type = tripTypeNum;
                }
            }
            // Payment status filter
            if(payment_status && payment_status.trim() !== ''){
                const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
                if(validPaymentStatuses.includes(payment_status)){
                    whereConditions.payment_status = payment_status;
                }
            }
            // State filter
            if(pickup_state_id && pickup_state_id.trim() !== ''){
                const stateIdNum = parseInt(pickup_state_id, 10);
                whereConditions.pickup_state_id = stateIdNum;
            }
            // Date range filter
            if(date_from && date_to){
                const fromDate = new Date(date_from);
                const toDate   = new Date(date_to);
                if(!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())){
                    fromDate.setHours(0, 0, 0, 0);
                    toDate.setHours(23, 59, 59, 999);
                    whereConditions.created_at = {
                        [Op.between]: [fromDate, toDate]
                    };
                }
            }else 
            if(date_from){
                const fromDate = new Date(date_from);
                if(!isNaN(fromDate.getTime())){
                    fromDate.setHours(0, 0, 0, 0);
                    whereConditions.created_at = {
                        [Op.gte]: fromDate
                    };
                }
            }else 
            if(date_to){
                const toDate = new Date(date_to);
                if(!isNaN(toDate.getTime())){
                    toDate.setHours(23, 59, 59, 999);
                    whereConditions.created_at = {
                        [Op.lte]: toDate
                    };
                }
            }
            // Search conditions
            const searchConditions = [];
            if(search && search.trim() !== '') {
                const searchTerm = search.trim();
                searchConditions.push(
                    { pickup_address: { [Op.like]: `%${searchTerm}%` } },
                    { dropoff_address: { [Op.like]: `%${searchTerm}%` } },
                );
            }
            if(searchConditions.length > 0){
                whereConditions[Op.or] = searchConditions;
            }
            // Validate sort_by parameter
            const validSortFields = [ 'created_at', 'updated_at','final_fare', 'status', 'trip_type' ];
            const sortField       = validSortFields.includes(sort_by) ? sort_by : 'created_at';
            const sortDirection   = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            // Fetch ride requests with all associations and complete details
            const { count, rows: rideRequests } = await RideRequests.findAndCountAll({
                where: whereConditions,
                include: [
                    {
                        model      : User,
                        as         : 'passenger',
                        attributes : [ 'name' ],
                    },
                    {
                        model      : User,
                        as         : 'driver',
                        attributes : [ 'name' ],
                        required   : false
                    }
                ],
                limit   : limitNum,
                offset  : offset,
                order   : [[sortField, sortDirection]],
                distinct: true
            });
            const formattedRideRequests = rideRequests.map(ride => {
                const rideData  = ride.get({ plain: true });
                const tripNames = {
                    1: 'One way',
                    2: 'Round', 
                    3: 'Reserve'
                };
                const tripTypeNames = {
                    1: 'Intercity',
                    2: 'Outstation'
                };
                return{
                    id        : rideData.id,
                    trip      : tripNames[rideData.trip_id] || 'Unknown',
                    trip_type : tripTypeNames[rideData.trip_type] || 'Unknown',
                    status    : rideData.status,
                    passenger : rideData.passenger ? rideData.passenger.name : '-',
                    driver    : rideData.driver ? rideData.driver.name : 'Not Assigned',
                    pickup    : rideData.pickup_address,
                    dropoff   : rideData.dropoff_address,
                    stop1     : rideData.stop1_address ? { address: rideData.stop1_address } : null,
                    stop2     : rideData.stop2_address ? { address: rideData.stop2_address } : null,
                    fare      : rideData.final_fare
                };
            });
            const totalPages  = Math.ceil(count / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            return res.status(200).json({
                success : true,
                message : 'Ride requests retrieved successfully',
                data    : {
                    rides             : formattedRideRequests,
                    pagination        : {
                        current_page  : pageNum,
                        per_page      : limitNum,
                        total_items   : count,
                        total_pages   : totalPages,
                        has_next_page : hasNextPage,
                        has_prev_page : hasPrevPage,
                        next_page     : hasNextPage ? pageNum + 1 : null,
                        prev_page     : hasPrevPage ? pageNum - 1 : null
                    }
                }
            });
        }catch(err){
            console.error('getRideRequest error:', err);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get particular ride details 
    getRideDetails: async (req, res) => {
        try{
            const { id } = req.params;
            // Find single ride by primary key
            let rideDetails = await RideRequests.findByPk(id, {
                include: [
                    {
                        model      : User,
                        as         : 'passenger',
                        attributes : [
                            'id', 'name', 'email', 'mobile', 'profile', 
                            'gender', 'status', 'created_at'
                        ],
                        foreignKey : 'user_id'
                    },
                    {
                        model      : User,
                        as         : 'driver',
                        attributes : [
                            'id', 'name', 'email', 'mobile', 'profile', 
                            'gender', 'status', 'created_at'
                        ],
                        foreignKey : 'driver_id',
                        required   : false
                    }
                ]
            });
            if(!rideDetails){
                return res.status(404).json({
                    success: false,
                    message: "Ride Details record not found"
                });
            }
            const rideData  = rideDetails.get({ plain: true });
            const tripNames = {
                1: 'One way',
                2: 'Round', 
                3: 'Reserve'
            };
            const tripTypeNames = {
                1: 'Intercity',
                2: 'Outstation'
            };

            // Safely get driver location with null check
            let driver_location = null;
            if(rideData.driver_id){
                try{
                    driver_location = await FirebaseService.getDriverLocation(rideData.driver_id);
                }catch(err){
                    console.warn(`Failed to get driver location for driver_id ${rideData.driver_id}:`, err.message);
                }
            }
            
            // Add profile URLs if profiles exist
            if(rideData.passenger && rideData.passenger.profile){
                rideData.passenger.profile_url = `${BASE_URL}/uploads/profile/${rideData.passenger.profile}`;
            }
            if(rideData.driver && rideData.driver.profile){
                rideData.driver.profile_url = `${BASE_URL}/uploads/profile/${rideData.driver.profile}`;
            }

            // Safely assign driver location with fallback to null
            if(rideData.driver){
                rideData.driver.latitude  = driver_location?.current_latitude || null;
                rideData.driver.longitude = driver_location?.current_longitude || null;
            }
            
            // Determine if ride is scheduled or immediate
            const isScheduledRide = rideData.pickup_date && rideData.pickup_time;
            const scheduleInfo  = {
                is_scheduled    : isScheduledRide,
                pickup_datetime : isScheduledRide ? `${rideData.pickup_date} ${rideData.pickup_time}` : null
            };
            // Format the single ride object
            const formattedRideDetails = {
                id                     : rideData.id,
                trip                   : tripNames[rideData.trip_id] || 'Unknown',
                trip_type              : tripTypeNames[rideData.trip_type] || 'Unknown',
                user                   : rideData.passenger,
                driver                 : rideData.driver,
                status                 : rideData.status,
                payment_status         : rideData.payment_status,
                payment_method         : rideData.payment_method,
                distance_time_info     : {
                    estimated_distance : rideData.estimated_distance,
                    actual_distance    : rideData.actual_distance,
                    estimated_duration : rideData.estimated_duration ? `${Math.floor(rideData.estimated_duration / 60)}h ${rideData.estimated_duration % 60}m` : null,
                    actual_duration    : rideData.actual_duration ? `${Math.floor(rideData.actual_duration / 60)}h ${rideData.actual_duration % 60}m` : null,
                    waiting_time       : rideData.waiting_time ? `${Math.floor(rideData.waiting_time / 60)}h ${rideData.waiting_time % 60}m` : '0m'
                },
                pickup                 : {
                    address            : rideData.pickup_address,
                    latitude           : rideData.pickup_latitude,
                    longitude          : rideData.pickup_longitude
                },
                dropoff                : {
                    address            : rideData.dropoff_address,
                    latitude           : rideData.dropoff_latitude,
                    longitude          : rideData.dropoff_longitude
                },
                stops                  : {
                    stop1              : rideData.stop1_address ? {
                        address        : rideData.stop1_address,
                        latitude       : rideData.stop1_latitude,
                        longitude      : rideData.stop1_longitude
                    } : null,
                    stop2              : rideData.stop2_address ? {
                        address        : rideData.stop2_address,
                        latitude       : rideData.stop2_latitude,
                        longitude      : rideData.stop2_longitude
                    } : null
                }, 
                schedule               : scheduleInfo,  
                payment_summary        : {
                    estimated_fare     : rideData.estimated_fare,
                    actual_fare        : rideData.actual_fare,
                    discount           : rideData.discount_amount,
                    final_fare         : rideData.final_fare,
                    coupon_code        : rideData.coupon_code
                },                
                verification           : {
                    otp                : rideData.ride_otp,
                    generated_at       : rideData.otp_generated_at,
                    verified_at        : rideData.otp_verified_at,
                    otp_verified       : !!rideData.otp_verified_at
                },
                feedback               : {
                    rating             : rideData.rating,
                    feedback           : rideData.feedback,
                    is_rated           : rideData.is_rated
                },
                cancellation           : {
                    cancelled_at       : rideData.cancelled_at,
                    reason             : rideData.cancellation_reason,
                },
                timestamps             : {
                    created_at         : rideData.created_at,
                    updated_at         : rideData.updated_at,
                    requested_at       : rideData.requested_at,
                    accepted_at        : rideData.accepted_at,
                    arrived_at         : rideData.arrived_at,
                    started_at         : rideData.ride_started_at,
                    completed_at       : rideData.ride_completed_at,
                    cancelled_at       : rideData.cancelled_at
                }
            };
            return res.status(200).json({
                success : true,
                message : 'Ride details retrieved successfully',
                data    : formattedRideDetails 
            });
        }catch(err){
            console.error('getRideDetails error:', err);
            return res.status(500).json({
                success : false,
                message : 'Something went wrong. Please try again later!'
            });
        }
    }
};

module.exports = rideRequestController;