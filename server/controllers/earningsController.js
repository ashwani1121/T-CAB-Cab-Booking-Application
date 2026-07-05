const User                       = require('../models/userModel');
const RideRequests               = require('../models/rideRequestModel');
const VehicleType                = require('../models/vehicleTypesModel');
const Coupon                     = require('../models/couponsModel');
const Package                    = require('../models/packagesModel');
const State                      = require('../models/stateModel');
const { Op, fn, col, literal }   = require('sequelize');
const earningsController         = {

    // GET EARNINGS LIST WITH COMPREHENSIVE FILTERS
    earningsDetails: async (req, res) => {
        try{
            const {
                page             = 1,
                limit            = 10,
                search           = '',
                date_from,
                date_to,
                driver_id,
                payment_status   = '',
                payment_method   = '',
                pickup_state_id  = '',
                dropoff_state_id = '',
                trip_type        = '',
                sort_by          = 'ride_completed_at',
                sort_order       = 'DESC'
            } = req.query;

            const pageNum        = parseInt(page, 10);
            const limitNum       = parseInt(limit, 10);
            const offset         = (pageNum - 1) * limitNum;
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: "Invalid pagination parameters"
                });
            }
            const whereClause = { status: 'ride_completed' };
            // Payment Status Filter
            const validPaymentStatuses = ['paid', 'refunded', 'pending', 'failed'];
            let paymentStatuses;
            if(!payment_status || payment_status.trim() === ''){
                paymentStatuses = validPaymentStatuses;
            }else{
                if(validPaymentStatuses.includes(payment_status)){
                    paymentStatuses = [payment_status];
                }else{
                    return res.status(400).json({
                        success: false,
                        message: "Invalid payment status"
                    });
                }
            }
            whereClause.payment_status = { [Op.in]: paymentStatuses };
            // Payment Method Filter
            const validPaymentMethods = ['cash', 'wallet', 'easebuzz'];
            if(payment_method && payment_method.trim() !== ''){
                if(validPaymentMethods.includes(payment_method)){
                    whereClause.payment_method = payment_method;
                }else{
                    return res.status(400).json({
                        success: false,
                        message: "Invalid payment method"
                    });
                }
            }
            // Trip type Filter
            if(trip_type && trip_type.trim() !== ''){
                const tripTypeNum = parseInt(trip_type, 10);
                if(!isNaN(tripTypeNum) && [1, 2].includes(tripTypeNum)){
                    whereClause.trip_type = tripTypeNum;
                }
            }
            // Driver Id Filter
            if(driver_id && driver_id.trim() !== ''){
                const driverIdNum = parseInt(driver_id, 10);
                if(!isNaN(driverIdNum) && driverIdNum > 0){
                    whereClause.driver_id = driverIdNum;
                }
            }
            // State Filters
            if(pickup_state_id && pickup_state_id.trim() !== ''){
                const stateIdNum = parseInt(pickup_state_id, 10);
                if (!isNaN(stateIdNum) && stateIdNum > 0) {
                    whereClause.pickup_state_id = stateIdNum;
                }
            }
            if(dropoff_state_id && dropoff_state_id.trim() !== ''){
                const stateIdNum = parseInt(dropoff_state_id, 10);
                if (!isNaN(stateIdNum) && stateIdNum > 0) {
                    whereClause.dropoff_state_id = stateIdNum;
                }
            }
            // Date Range Filter
            if(date_from || date_to){
                whereClause.ride_completed_at = {};
                if(date_from){
                    const fromDate = new Date(date_from);
                    if(!isNaN(fromDate.getTime())){
                        fromDate.setHours(0, 0, 0, 0);
                        whereClause.ride_completed_at[Op.gte] = fromDate;
                    }
                }
                if(date_to){
                    const toDate = new Date(date_to);
                    if(!isNaN(toDate.getTime())){
                        toDate.setHours(23, 59, 59, 999);
                        whereClause.ride_completed_at[Op.lte] = toDate;
                    }
                }
                if(Object.keys(whereClause.ride_completed_at).length === 0){
                    delete whereClause.ride_completed_at;
                }
            }
            const includes = [
                {
                    model: User,
                    as: 'passenger',
                    attributes: ['id', 'name', 'mobile', 'email'],
                    required: true
                },
                {
                    model: VehicleType,
                    as: 'vehicleType',
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: Coupon,
                    as: 'coupon',
                    attributes: ['id', 'code', 'discount_type', 'discount_value'],
                    required: false
                },
                {
                    model: Package,
                    as: 'package',
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: State,
                    as: 'pickupState',
                    attributes: ['id', 'state_name'],
                    required: false
                },
                {
                    model: State,
                    as: 'dropState',
                    attributes: ['id', 'state_name'],
                    required: false
                }
            ];
            let driverInclude;
            if(search && search.trim() !== ''){
                const searchTerm = search.trim();
                driverInclude = {
                    model: User,
                    as: 'driver',
                    attributes: ['id', 'name', 'mobile', 'email'],
                    where: {
                        [Op.or]: [
                            { name: { [Op.like]: `%${searchTerm}%` } },
                            { mobile: { [Op.like]: `%${searchTerm}%` } }
                        ]
                    },
                    required: true
                };
            }else{
                driverInclude = {
                    model: User,
                    as: 'driver',
                    attributes: ['id', 'name', 'mobile', 'email'],
                    required: false
                };
            }
            includes.push(driverInclude);
            const validSortFields = [
                'ride_completed_at',
                'final_fare',
                'commission_amount',
                'driver_payout',
                'actual_distance',
                'created_at'
            ];
            const validSortOrders = ['ASC', 'DESC'];
            const sortField       = validSortFields.includes(sort_by) ? sort_by : 'ride_completed_at';
            const sortDirection   = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';
            const { count, rows } = await RideRequests.findAndCountAll({
                where   : whereClause,
                include : includes,
                order   : [[sortField, sortDirection]],
                limit   : limitNum,
                offset  : offset,
                distinct: true
            });
            const earnings     = rows.map(ride => {
                const rideData = ride.get({ plain: true });
                return{
                    id                          : rideData.id,
                    ride_completed_at           : rideData.ride_completed_at,
                    trip_type                   : rideData.trip_type,
                    trip_type_label             : rideData.trip_type === 1 ? 'Intercity' : 'Outstation',
                    passenger                   : rideData.passenger,
                    driver                      : rideData.driver,
                    vehicle_type                : rideData.vehicleType,
                    pickup                      : {
                        address                 : rideData.pickup_address,
                        district                : rideData.pickup_district,
                        state                   : rideData.pickupState
                    },
                    dropoff                     : {
                        address                 : rideData.dropoff_address,
                        district                : rideData.dropoff_district,
                        state                   : rideData.dropState
                    },
                    distance                    : {
                        estimated               : rideData.estimated_distance,
                        actual                  : rideData.actual_distance
                    },
                    duration                    : {
                        estimated               : rideData.estimated_duration,
                        actual                  : rideData.actual_duration,
                        waiting_time            : rideData.waiting_time || 0
                    },
                    fare_details                : {
                        subtotal                : rideData.actual_subtotal,
                        gst                     : {
                            total               : rideData.actual_total_gst_amount,
                            is_interstate       : rideData.is_interstate,
                            igst                : rideData.actual_igst_amount || 0,
                            cgst                : rideData.actual_cgst_amount || 0,
                            sgst                : rideData.actual_sgst_amount || 0
                        },
                        discount                : {
                            amount              : rideData.discount_amount || 0,
                            coupon              : rideData.coupon ? { code: rideData.coupon.code,type: rideData.coupon.discount_type } : null
                        },
                        final_fare              : rideData.final_fare
                    },
                    earnings                    : {
                        commission_percentage   : rideData.commission_percentage,
                        commission_amount       : rideData.commission_amount || 0,
                        driver_payout           : rideData.driver_payout || 0,
                        tip_amount              : rideData.tip_amount || 0,
                        total_driver_earnings   : (rideData.driver_payout || 0) + (rideData.tip_amount || 0)
                    },
                    payment                     : {
                        status                  : rideData.payment_status,
                        method                  : rideData.payment_method
                    },
                    package                     : rideData.package,
                    advance_payment             : {
                        is_advance_paid         : rideData.is_advance_paid,
                        advance_amount          : rideData.advance_paid_amount || 0,
                        remaining_amount        : rideData.remaining_fare_to_pay || 0
                    }
                };
            });
            const summary = await RideRequests.findOne({
                where: whereClause,
                attributes: [
                    [fn('COUNT', col('id')), 'total_rides'],
                    [fn('SUM', col('final_fare')), 'total_revenue'],
                    [fn('SUM', col('commission_amount')), 'total_commission'],
                    [fn('SUM', col('driver_payout')), 'total_driver_payout'],
                    [fn('SUM', col('tip_amount')), 'total_tips'],
                    [fn('SUM', col('discount_amount')), 'total_discounts'],
                    [fn('AVG', col('final_fare')), 'average_fare'],
                    [fn('AVG', col('commission_amount')), 'average_commission']
                ],
                raw: true
            });
            const totalPages  = Math.ceil(count / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            return res.status(200).json({
                success                     : true,
                message                     : 'Earnings details retrieved successfully',
                data                        : {
                    earnings                : earnings,
                    summary                 : {
                        total_rides         : parseInt(summary.total_rides) || 0,
                        total_revenue       : parseFloat(summary.total_revenue) || 0,
                        total_commission    : parseFloat(summary.total_commission) || 0,
                        total_driver_payout : parseFloat(summary.total_driver_payout) || 0,
                        total_tips          : parseFloat(summary.total_tips) || 0,
                        total_discounts     : parseFloat(summary.total_discounts) || 0,
                        average_fare        : parseFloat(summary.average_fare) || 0,
                        average_commission  : parseFloat(summary.average_commission) || 0,
                        net_earnings        : (parseFloat(summary.total_revenue) || 0) - (parseFloat(summary.total_driver_payout) || 0)
                    },
                    pagination              : {
                        current_page        : pageNum,
                        per_page            : limitNum,
                        total_items         : count,
                        total_pages         : totalPages,
                        has_next_page       : hasNextPage,
                        has_prev_page       : hasPrevPage,
                        next_page           : hasNextPage ? pageNum + 1 : null,
                        prev_page           : hasPrevPage ? pageNum - 1 : null
                    }
                }
            });
        }catch(error){
            console.error('Error fetching earnings details:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch earnings details',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // GET SINGLE RIDE EARNING DETAILS WITH COMPLETE BREAKDOWN
    getEarningDetails: async (req, res) => {
        try{
            const { id } = req.params;
            if(!id || isNaN(parseInt(id))){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ride ID'
                });
            }
            const rideDetails = await RideRequests.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'passenger',
                        attributes: ['id', 'name', 'mobile', 'email']
                    },
                    {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'mobile', 'email']
                    },
                    {
                        model: VehicleType,
                        as: 'vehicleType',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Coupon,
                        as: 'coupon',
                        attributes: ['id', 'code', 'discount_type', 'discount_value']
                    },
                    {
                        model: Package,
                        as: 'package',
                        attributes: ['id', 'name']
                    },
                    {
                        model: State,
                        as: 'pickupState',
                        attributes: ['id', 'state_name']
                    },
                    {
                        model: State,
                        as: 'dropState',
                        attributes: ['id', 'state_name']
                    }
                ]
            });
            if(!rideDetails){
                return res.status(404).json({
                    success: false,
                    message: 'Ride not found'
                });
            }
            const rideData = rideDetails.get({ plain: true });
            if(rideData.status !== 'ride_completed'){
                return res.status(400).json({
                    success: false,
                    message: 'Earnings available only for completed rides'
                });
            }
            const earningDetails = {
                ride_info: {
                    id                       : rideData.id,
                    trip_type                : rideData.trip_type,
                    trip_type_label          : rideData.trip_type === 1 ? 'Intercity' : 'Outstation',
                    status                   : rideData.status,
                    is_interstate            : rideData.is_interstate,
                    is_advance_paid          : rideData.is_advance_paid
                },
                participants                 : {
                    passenger                : rideData.passenger,
                    driver                   : rideData.driver,
                    vehicle_type             : rideData.vehicleType,
                    rider_info               : {
                        name                 : rideData.rider_name,
                        mobile               : rideData.rider_mobile,
                        is_booking_for_other : rideData.is_booking_for_other,
                        relationship         : rideData.rider_relationship_to_booker
                    }
                },
                locations                    : {
                    pickup                   : {
                        address              : rideData.pickup_address,
                        district             : rideData.pickup_district,
                        state                : rideData.pickupState,
                        coordinates          : {
                            latitude         : rideData.pickup_latitude,
                            longitude        : rideData.pickup_longitude
                        }
                    },
                    dropoff                  : {
                        address              : rideData.dropoff_address,
                        district             : rideData.dropoff_district,
                        state                : rideData.dropState,
                        coordinates          : {
                            latitude         : rideData.dropoff_latitude,
                            longitude        : rideData.dropoff_longitude
                        }
                    }
                },
                metrics                      : {
                    distance                 : {
                        estimated_km         : rideData.estimated_distance,
                        actual_km            : rideData.actual_distance,
                        difference_km        : rideData.actual_distance ? (rideData.actual_distance - rideData.estimated_distance).toFixed(2): null
                    },
                    duration                 : {
                        estimated_minutes    : rideData.estimated_duration,
                        actual_minutes       : rideData.actual_duration,
                        waiting_time_minutes : rideData.waiting_time || 0
                    }
                },
                fare_breakdown               : {
                    comparison               : {
                        estimated_fare       : rideData.estimated_fare,
                        actual_fare          : rideData.actual_fare,
                        variance             : rideData.actual_fare ? (rideData.actual_fare - rideData.estimated_fare).toFixed(2): null
                    },
                    components               : {
                        base_fare            : rideData.actual_base_fare,
                        distance_charge      : rideData.actual_distance_charge,
                        waiting_charge       : rideData.actual_waiting_charge || 0,
                        bata_charge          : rideData.actual_bata_charge || 0,
                        subtotal             : rideData.actual_subtotal
                    },
                    gst                      : {
                        is_interstate        : rideData.is_interstate,
                        total_gst            : rideData.actual_total_gst_amount,
                        breakdown            : rideData.is_interstate ? {
                            igst             : rideData.actual_igst_amount,
                        } : {
                            cgst             : rideData.actual_cgst_amount,
                            sgst             : rideData.actual_sgst_amount,
                        }
                    },
                    discount                 : {
                        amount               : rideData.discount_amount || 0,
                        coupon               : rideData.coupon ? {
                            id               : rideData.coupon.id,
                            code             : rideData.coupon.code,
                            discount_type    : rideData.coupon.discount_type,
                            discount_value   : rideData.coupon.discount_value
                        } : null
                    },
                    final_fare: rideData.final_fare
                },
                earnings_distribution        : {
                    total_fare               : rideData.final_fare,
                    commission               : {
                        percentage           : rideData.commission_percentage,
                        amount               : rideData.commission_amount || 0
                    },
                    driver                   : {
                        base_payout          : rideData.driver_payout || 0,
                        tip_amount           : rideData.tip_amount || 0,
                        total_earnings       : (rideData.driver_payout || 0) + (rideData.tip_amount || 0)
                    },
                    formula                  : {
                        driver_payout        : 'Final Fare - Commission Amount',
                        total_driver_earnings: 'Driver Payout + Tip Amount',
                        commission_amount    : `(Final Fare × ${rideData.commission_percentage || 0}%) / 100`
                    }
                },
                payment                      : {
                    status                   : rideData.payment_status,
                    method                   : rideData.payment_method,
                    paid_at                  : rideData.payment_status === 'paid' ? rideData.ride_completed_at : null
                },
                reservation_details          : rideData.package ? {
                    package                  : rideData.package,
                    advance_payment          : {
                        is_advance_paid      : rideData.is_advance_paid,
                        advance_amount       : rideData.advance_paid_amount || 0,
                        remaining_amount     : rideData.remaining_fare_to_pay || 0
                    },
                    is_custom_trip           : rideData.is_custom_trip,
                    custom_details           : rideData.is_custom_trip ? {
                        kilometers           : rideData.custom_km,
                        days                 : rideData.custom_days
                    } : null
                } : null,
            };
            return res.status(200).json({
                success: true,
                message: 'Earning details retrieved successfully',
                data: earningDetails
            });
        }catch(error){
            console.error('Error fetching earning details:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch earning details',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};
module.exports = earningsController;