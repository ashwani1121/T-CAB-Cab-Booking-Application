const User                  = require('../models/userModel');
const UserRole              = require('../models/userRoleModel');
const RideRequests          = require('../models/rideRequestModel');
const DriverDetails         = require('../models/driverDetailsModel');
const { Op }                = require('sequelize');
const BASE_URL              = process.env.BASE_URL || 'http://localhost:5000';
const reservationController = {

    // Get all reservation ride requests with pagination, search, and filters
    reservationRideDetails: async (req, res) => {
        try{
            const { 
                page              = 1, 
                limit             = 10, 
                search            = '', 
                status            = '', 
                payment_status    = '',
                is_custom_trip    = '',
                is_transferred    = '',
                date_from         = '', 
                date_to           = '', 
                pickup_state_id   = '', 
                dropoff_state_id  = '',
                sort_by           = 'created_at', 
                sort_order        = 'DESC' 
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
            const whereConditions = {
                trip_id: 3  // ONLY RESERVATION TRIPS
            };
            // Custom trip filter
            if(is_custom_trip && is_custom_trip.trim() !== ''){
                whereConditions.is_custom_trip = is_custom_trip === 'true';
            }
            // Transferred rides filter
            if(is_transferred && is_transferred.trim() !== ''){
                whereConditions.is_transferred_to_admin = is_transferred === 'true';
            }
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
            // Payment status filter
            if(payment_status && payment_status.trim() !== ''){
                const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
                if(validPaymentStatuses.includes(payment_status)){
                    whereConditions.payment_status = payment_status;
                }
            }
            // State filters
            if(pickup_state_id && pickup_state_id.trim() !== ''){
                const stateIdNum = parseInt(pickup_state_id, 10);
                if(!isNaN(stateIdNum)){
                    whereConditions.pickup_state_id = stateIdNum;
                }
            }
            if(dropoff_state_id && dropoff_state_id.trim() !== ''){
                const stateIdNum = parseInt(dropoff_state_id, 10);
                if(!isNaN(stateIdNum)){
                    whereConditions.dropoff_state_id = stateIdNum;
                }
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
                    { rider_name: { [Op.like]: `%${searchTerm}%` } },
                    { rider_mobile: { [Op.like]: `%${searchTerm}%` } }
                );
            }
            if(searchConditions.length > 0){
                whereConditions[Op.or] = searchConditions;
            }
            // Validate sort_by parameter
            const validSortFields = [ 
                'created_at', 'updated_at', 'final_fare', 'status', 
                'pickup_date', 'advance_paid_amount' 
            ];
            const sortField       = validSortFields.includes(sort_by) ? sort_by : 'created_at';
            const sortDirection   = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            // Fetch reservation ride requests
            const { count, rows: rideRequests } = await RideRequests.findAndCountAll({
                where: whereConditions,
                include: [
                    {
                        model      : User,
                        as         : 'passenger',
                        attributes : [ 'id', 'name', 'email', 'mobile' ],
                    },
                    {
                        model      : User,
                        as         : 'driver',
                        attributes : [ 'id', 'name', 'email', 'mobile' ],
                        required   : false
                    }
                ],
                limit   : limitNum,
                offset  : offset,
                order   : [[sortField, sortDirection]],
                distinct: true
            });
            const formattedRideRequests = rideRequests.map(ride => {
                const rideData = ride.get({ plain: true });
                return {
                    id                       : rideData.id,
                    trip                     : 'Reserve', 
                    status                   : rideData.status,
                    passenger                : rideData.passenger ? {
                        id                   : rideData.passenger.id,
                        name                 : rideData.passenger.name,
                        email                : rideData.passenger.email,
                        mobile               : rideData.passenger.mobile
                    } : null,
                    driver                   : rideData.driver ? {
                        id                   : rideData.driver.id,
                        name                 : rideData.driver.name,
                        email                : rideData.driver.email,
                        mobile               : rideData.driver.mobile
                    } : null,
                    rider                    : {
                        name                 : rideData.rider_name,
                        mobile               : rideData.rider_mobile,
                        relationship         : rideData.rider_relationship_to_booker,
                        is_booking_for_other : rideData.is_booking_for_other
                    },
                    pickup                   : rideData.pickup_address,
                    dropoff                  : rideData.dropoff_address,
                    stop1                    : rideData.stop1_address ? { 
                        address              : rideData.stop1_address 
                    } : null,
                    stop2                    : rideData.stop2_address ? { 
                        address              : rideData.stop2_address 
                    } : null,
                    package_id               : rideData.package_id,
                    is_custom_trip           : rideData.is_custom_trip,
                    custom_km                : rideData.custom_km,
                    custom_days              : rideData.custom_days,
                    is_transferred_to_admin  : rideData.is_transferred_to_admin,
                    transferred_at           : rideData.transferred_at,
                    transferred_by_driver_id : rideData.transferred_by_driver_id,
                    pickup_date              : rideData.pickup_date,
                    pickup_time              : rideData.pickup_time,
                    is_scheduled             : rideData.is_scheduled,
                    is_advance_paid          : rideData.is_advance_paid,
                    advance_payment_id       : rideData.advance_payment_id,
                    advance_paid_amount      : rideData.advance_paid_amount,
                    remaining_fare_to_pay    : rideData.remaining_fare_to_pay,
                    start_meter_reading      : rideData.start_meter_reading,
                    start_meter_image        : rideData.start_meter_image ? `${BASE_URL}/uploads/meter/${rideData.start_meter_image}` : null,
                    end_meter_reading        : rideData.end_meter_reading,
                    end_meter_image          : rideData.end_meter_image ? `${BASE_URL}/uploads/meter/${rideData.end_meter_image}` : null,
                    estimated_fare           : rideData.estimated_fare,
                    actual_fare              : rideData.actual_fare,
                    discount                 : rideData.discount_amount,
                    final_fare               : rideData.final_fare,
                    payment_status           : rideData.payment_status,
                    payment_method           : rideData.payment_method,
                    created_at               : rideData.created_at,
                    requested_at             : rideData.requested_at,
                    accepted_at              : rideData.accepted_at,
                    ride_started_at          : rideData.ride_started_at,
                    ride_completed_at        : rideData.ride_completed_at
                };
            });
            const totalPages  = Math.ceil(count / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            return res.status(200).json({
                success : true,
                message : 'Reservation rides retrieved successfully',
                data    : {
                    reservations      : formattedRideRequests,
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
            console.error('getReservationRides error:', err);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get particular reservation ride details 
    getReservationDetails: async (req, res) => {
        try{
            const { id } = req.params;
            // Find single reservation ride by primary key
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
                    message: "Reservation ride not found"
                });
            }
            const rideData = rideDetails.get({ plain: true });
            // Verify it's a reservation trip
            if(rideData.trip_id !== 3){
                return res.status(400).json({
                    success: false,
                    message: "This is not a reservation trip"
                });
            }
            // Add profile URLs if profiles exist
            if(rideData.passenger && rideData.passenger.profile){
                rideData.passenger.profile_url = `${BASE_URL}/uploads/profile/${rideData.passenger.profile}`;
            }
            if(rideData.driver && rideData.driver.profile){
                rideData.driver.profile_url = `${BASE_URL}/uploads/profile/${rideData.driver.profile}`;
            }
            // Format the reservation ride details
            const formattedReservationDetails = {
                id                       : rideData.id,
                trip                     : 'Reserve',
                booker                   : rideData.passenger,  
                driver                   : rideData.driver,
                rider                    : {
                    name                 : rideData.rider_name,
                    mobile               : rideData.rider_mobile,
                    relationship         : rideData.rider_relationship_to_booker,
                    is_booking_for_other : rideData.is_booking_for_other
                },
                status                   : rideData.status,
                payment_status           : rideData.payment_status,
                payment_method           : rideData.payment_method,
                reservation_details      : {
                    package_id           : rideData.package_id,
                    is_custom_trip       : rideData.is_custom_trip,
                    custom_km            : rideData.custom_km,
                    custom_days          : rideData.custom_days,
                    pickup_date          : rideData.pickup_date,
                    pickup_time          : rideData.pickup_time,
                    is_scheduled         : rideData.is_scheduled
                },
                advance_payment          : {
                    is_advance_paid      : rideData.is_advance_paid,
                    payment_id           : rideData.advance_payment_id,
                    amount_paid          : rideData.advance_paid_amount,
                    remaining_to_pay     : rideData.remaining_fare_to_pay
                },
                meter_readings           : {
                    start                : {
                        reading          : rideData.start_meter_reading,
                        image            : rideData.start_meter_image ? `${BASE_URL}/uploads/meter/${rideData.start_meter_image}` : null
                    },
                    end                  : {
                        reading          : rideData.end_meter_reading,
                        image            : rideData.end_meter_image ? `${BASE_URL}/uploads/meter/${rideData.end_meter_image}` : null
                    }
                },
                distance_time_info       : {
                    estimated_distance   : rideData.estimated_distance,
                    actual_distance      : rideData.actual_distance,
                    estimated_duration   : rideData.estimated_duration ? `${Math.floor(rideData.estimated_duration / 60)}h ${rideData.estimated_duration % 60}m` : null,
                    actual_duration      : rideData.actual_duration ? `${Math.floor(rideData.actual_duration / 60)}h ${rideData.actual_duration % 60}m` : null,
                    waiting_time         : rideData.waiting_time ? `${Math.floor(rideData.waiting_time / 60)}h ${rideData.waiting_time % 60}m` : '0m'
                },
                pickup                   : {
                    address              : rideData.pickup_address,
                    district             : rideData.pickup_district,
                    state                : rideData.pickup_state,
                    state_id             : rideData.pickup_state_id,
                    latitude             : rideData.pickup_latitude,
                    longitude            : rideData.pickup_longitude
                },
                dropoff                  : {
                    address              : rideData.dropoff_address,
                    district             : rideData.dropoff_district,
                    state                : rideData.dropoff_state,
                    state_id             : rideData.dropoff_state_id,
                    latitude             : rideData.dropoff_latitude,
                    longitude            : rideData.dropoff_longitude
                },
                stops                    : {
                    stop1                : rideData.stop1_address ? {
                        address          : rideData.stop1_address,
                        state_id         : rideData.stop1_state_id,
                        latitude         : rideData.stop1_latitude,
                        longitude        : rideData.stop1_longitude
                    } : null,
                    stop2                : rideData.stop2_address ? {
                        address          : rideData.stop2_address,
                        state_id         : rideData.stop2_state_id,
                        latitude         : rideData.stop2_latitude,
                        longitude        : rideData.stop2_longitude
                    } : null
                },
                gst_info                 : {
                    is_interstate        : rideData.is_interstate
                },
                estimated_breakdown      : {
                    base_fare            : rideData.estimated_base_fare,
                    distance_charge      : rideData.estimated_distance_charge,
                    waiting_charge       : rideData.estimated_waiting_charge,
                    bata_charge          : rideData.estimated_bata_charge,
                    subtotal             : rideData.estimated_subtotal,
                    total_gst            : rideData.estimated_total_gst_amount,
                    igst                 : rideData.estimated_igst_amount,
                    cgst                 : rideData.estimated_cgst_amount,
                    sgst                 : rideData.estimated_sgst_amount,
                    total                : rideData.estimated_fare
                },
                actual_breakdown         : {
                    base_fare            : rideData.actual_base_fare,
                    distance_charge      : rideData.actual_distance_charge,
                    waiting_charge       : rideData.actual_waiting_charge,
                    bata_charge          : rideData.actual_bata_charge,
                    subtotal             : rideData.actual_subtotal,
                    total_gst            : rideData.actual_total_gst_amount,
                    igst                 : rideData.actual_igst_amount,
                    cgst                 : rideData.actual_cgst_amount,
                    sgst                 : rideData.actual_sgst_amount,
                    total                : rideData.actual_fare
                },
                payment_summary          : {
                    estimated_fare       : rideData.estimated_fare,
                    actual_fare          : rideData.actual_fare,
                    discount             : rideData.discount_amount,
                    final_fare           : rideData.final_fare,
                    coupon_code          : rideData.coupon_code,
                    tip_amount           : rideData.tip_amount
                },
                commission_info          : {
                    percentage           : rideData.commission_percentage,
                    amount               : rideData.commission_amount,
                    driver_payout        : rideData.driver_payout
                },
                verification             : {
                    otp                  : rideData.ride_otp,
                    generated_at         : rideData.otp_generated_at,
                    verified_at          : rideData.otp_verified_at,
                    otp_verified         : !!rideData.otp_verified_at
                },
                feedback                 : {
                    rating               : rideData.rating,
                    feedback             : rideData.feedback,
                    is_rated             : rideData.is_rated
                },
                cancellation             : {
                    cancelled_at         : rideData.cancelled_at,
                    cancelled_by         : rideData.cancelled_by,
                    reason               : rideData.cancellation_reason
                },
                special_instructions     : rideData.special_instructions,
                timestamps               : {
                    created_at           : rideData.created_at,
                    updated_at           : rideData.updated_at,
                    requested_at         : rideData.requested_at,
                    accepted_at          : rideData.accepted_at,
                    arrived_at           : rideData.arrived_at,
                    started_at           : rideData.ride_started_at,
                    completed_at         : rideData.ride_completed_at,
                    cancelled_at         : rideData.cancelled_at
                }
            };
            return res.status(200).json({
                success : true,
                message : 'Reservation details retrieved successfully',
                data    : formattedReservationDetails
            });
        }catch(err){
            console.error('getReservationDetails error:', err);
            return res.status(500).json({
                success : false,
                message : 'Something went wrong. Please try again later!'
            });
        }
    },

    // Assign driver to custom reservation trip
    assignDriverToReservation: async (req, res) => {
        try{
            const { id }        = req.params;
            const { driver_id } = req.body;
            if(!driver_id){
                return res.status(400).json({
                    success: false,
                    message: 'Driver ID is required'
                });
            }
            // Find the reservation
            const reservation = await RideRequests.findByPk(id);
            if(!reservation){
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found'
                });
            }
            // Verify it's a reservation trip
            if(reservation.trip_id !== 3){
                return res.status(400).json({
                    success: false,
                    message: 'This is not a reservation trip'
                });
            }
            // Verify it's a custom trip
            if(!reservation.is_custom_trip && !reservation.is_transferred_to_admin){
                return res.status(400).json({
                    success: false,
                    message: 'Driver can only be assigned to custom reservation trips or transferred rides'
                });
            }
            // Check if driver is already assigned
            if(reservation.driver_id){
                return res.status(400).json({
                    success: false,
                    message: 'A driver is already assigned to this reservation'
                });
            }
            // Check if reservation is in valid status for driver assignment
            const validStatuses = ['pending', 'searching_driver'];
            if(!validStatuses.includes(reservation.status)){
                return res.status(400).json({
                    success: false,
                    message: `Cannot assign driver to reservation with status: ${reservation.status}`
                });
            }
            // Find driver and verify they have driver role (role_id: 3)
            const driver = await User.findOne({
                where: { id: driver_id },
                include: [
                    {
                        model: UserRole,
                        where: { role_id: 3 },
                        required: true
                    }
                ]
            });
            if(!driver){
                return res.status(404).json({
                    success: false,
                    message: 'Driver not found or user is not a driver'
                });
            }
            // Check if driver is active
            if(driver.status !== 1){
                return res.status(400).json({
                    success: false,
                    message: 'Driver is not active'
                });
            }
            const driverDetails = await DriverDetails.findOne({
                where: { user_id: driver_id, status:"approved" }
            });
            if(!driverDetails){
                return res.status(400).json({
                    success: false,
                    message: 'Driver details not found. Driver must complete vehicle registration'
                });
            }
            if(reservation.vehicle_type_id && driverDetails.vehicle_type_id !== reservation.vehicle_type_id){
                return res.status(400).json({
                    success: false,
                    message: 'Driver vehicle type does not match reservation requirement'
                });
            }
            // Update reservation with driver assignment
            await reservation.update({
                driver_id                   : driver_id,
                status                      : 'accepted',
                accepted_at                 : new Date(),
                driver_distance_at_accept   : 0, 
                updated_at                  : new Date()
            });
            // Fetch updated reservation with driver details
            const updatedReservation = await RideRequests.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'passenger',
                        attributes: ['id', 'name', 'email', 'mobile']
                    },
                    {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'email', 'mobile', 'profile'],
                        required: false
                    }
                ]
            });
            const rideData = updatedReservation.get({ plain: true });
            // Add profile URL if driver has profile
            if(rideData.driver && rideData.driver.profile){
                rideData.driver.profile_url = `${BASE_URL}/uploads/profile/${rideData.driver.profile}`;
            }
            return res.status(200).json({
                success: true,
                message: 'Driver assigned successfully',
                data: {
                    reservation_id: rideData.id,
                    status: rideData.status,
                    driver: rideData.driver,
                    assigned_at: rideData.accepted_at
                }
            });
        }catch(err){
            console.error('assignDriverToReservation error:', err);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Unassign driver from custom reservation trip
    unassignDriverFromReservation: async (req, res) => {
        try{
            const { id } = req.params;
            // Find the reservation
            const reservation = await RideRequests.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'email', 'mobile']
                    }
                ]
            });
            if(!reservation){
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found'
                });
            }
            // Verify it's a custom reservation trip
            if(reservation.trip_id !== 3){
                return res.status(400).json({
                    success: false,
                    message: 'This is not a reservation trip'
                });
            }
            if(!reservation.is_custom_trip && !reservation.is_transferred_to_admin){
                return res.status(400).json({
                    success: false,
                    message: 'Can only unassign drivers from custom reservation trips or transferred rides'
                });
            }
            // Check if driver is assigned
            if(!reservation.driver_id){
                return res.status(400).json({
                    success: false,
                    message: 'No driver is currently assigned to this reservation'
                });
            }
            // Check if ride has started or completed
            const invalidStatuses = ['ride_started', 'ride_completed'];
            if(invalidStatuses.includes(reservation.status)){
                return res.status(400).json({
                    success: false,
                    message: 'Cannot unassign driver from an ongoing or completed ride'
                });
            }
            // Store driver info for notification
            const previousDriverId = reservation.driver_id;
            const driverInfo = reservation.driver;
            // Unassign driver
            await reservation.update({
                driver_id: null,
                status: 'pending',
                accepted_at: null,
                driver_distance_at_accept: null,
                updated_at: new Date()
            });
            return res.status(200).json({
                success: true,
                message: 'Driver unassigned successfully',
                data: {
                    reservation_id: reservation.id,
                    status: reservation.status,
                    unassigned_driver: driverInfo,
                    unassigned_at: new Date()
                }
            });
        }catch(err){
            console.error('unassignDriverFromReservation error:', err);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    }
};
module.exports = reservationController;