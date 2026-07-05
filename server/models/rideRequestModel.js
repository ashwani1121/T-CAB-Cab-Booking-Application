const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const RideRequests  = sequelize.define('RideRequests', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    ride_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Unique human-readable ride identifier (e.g., RID-2024-001234)'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    trip_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'trips',
            key: 'id'
        },
        comment: '1=one_way, 2=round_trip, 3=reserve'
    },
    trip_type: {
        type: DataTypes.TINYINT(2),
        allowNull: false,
        comment: '1=intercity, 2=outstation',
        validate: {
            isIn: [[1, 2]] 
        }
    },
    vehicle_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'vehicle_types',
            key: 'id'
        }
    },
    driver_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Assigned driver'
    },
    coupon_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'promo_codes',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    coupon_code: {
        type: DataTypes.STRING(500),
        allowNull: true
    },

    // ============================================================
    // RESERVATION & ADVANCE PAYMENT FIELDS
    // ============================================================
    package_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'packages',
            key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Package ID for reservation trips'
    },
    advance_payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'reservation_advance_payments',
            key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Reference to advance payment record for reservation trips'
    },
    advance_paid_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Amount paid in advance for reservation trips'
    },
    remaining_fare_to_pay: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Remaining amount to be paid after advance payment deduction'
    },
    is_advance_paid: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Flag indicating if advance payment was made for this ride'
    },
    is_custom_trip: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Indicates if this is a custom reservation trip'
    },
    custom_km: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Custom kilometers for custom reservation trips'
    },
    custom_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Number of days for custom reservation trips'
    },

    // ============================================================
    // METER READING FIELDS (FOR RESERVATION TRIPS - TYPE 3)
    // ============================================================
    start_meter_reading: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Starting meter reading for reservation trips (trip_type = 3)'
    },
    start_meter_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL/path to starting meter reading image for reservation trips'
    },
    end_meter_reading: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Ending meter reading for reservation trips (trip_type = 3)'
    },
    end_meter_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL/path to ending meter reading image for reservation trips'
    },

    // ============================================================
    // RIDER/PASSENGER CONTACT INFORMATION
    // ============================================================
    is_booking_for_other: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'True if booking for someone else, false if user is taking the ride themselves'
    },
    rider_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Name of the person who will actually take the ride (rider/passenger)'
    },
    rider_mobile: {
        type: DataTypes.STRING(15),
        allowNull: false,
        comment: 'Mobile number of the rider - this is who the driver will contact and pickup'
    },
    rider_relationship_to_booker: {
        type: DataTypes.ENUM('self', 'family', 'friend', 'colleague', 'client', 'other'),
        allowNull: false,
        defaultValue: 'self',
        comment: 'Relationship of rider to the person who booked (user_id)'
    },

    // ============================================================
    // RIDE TRANSFER FIELDS (FOR RESERVATION TRIPS)
    // ============================================================
    is_transferred_to_admin: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Indicates if driver transferred this reservation ride back to admin'
    },
    transferred_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the ride was transferred back to admin'
    },
    transferred_by_driver_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Driver who transferred the ride back to admin'
    },

    // ============================================================
    // GST TYPE INDICATOR
    // ============================================================
    is_interstate: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Whether ride crosses state boundaries (determines IGST vs CGST+SGST)'
    },
    
    // ============================================================
    // ESTIMATED FARE BREAKDOWN
    // ============================================================
    estimated_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total estimated fare including GST - Final amount shown to user at booking'
    },
    estimated_base_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Base Price - Fixed starting fare for the vehicle type'
    },
    estimated_distance_charge: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Charge/Km - Distance-based fare (Journey Distance × Per KM rate from vehicle_types table)'
    },
    estimated_waiting_charge: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Waiting Time charge - Initially 0, calculated as (Waiting Time × per minute rate)'
    },
    estimated_bata_charge: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'BATA Charges - Fixed per trip charge from vehicle_types table'
    },
    estimated_subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Subtotal before GST - Sum of (Base Fare + Distance Charge + Waiting Charge + BATA Charge)'
    },
    
    // ============================================================
    // ESTIMATED GST BREAKDOWN - INDIAN GST STRUCTURE
    // ============================================================
    estimated_total_gst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total GST Amount (IGST or CGST+SGST combined)'
    },
    estimated_igst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'IGST amount for interstate rides (5% of subtotal)'
    },
    estimated_cgst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'CGST amount for intrastate rides (2.5% of subtotal)'
    },
    estimated_sgst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'SGST amount for intrastate rides (2.5% of subtotal)'
    },
    
    // ============================================================
    // ACTUAL FARE BREAKDOWN
    // ============================================================
    actual_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total actual fare including GST - Final amount to be charged after ride completion'
    },
    actual_base_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Actual base fare - Same as estimated unless pricing changes'
    },
    actual_distance_charge: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Actual distance charge - Based on GPS tracked actual distance × per KM rate'
    },
    actual_waiting_charge: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Actual waiting charge - Real waiting time × per minute rate'
    },
    actual_bata_charge: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Actual BATA charge - Usually same as estimated unless pricing rules change'
    },
    actual_subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Actual subtotal before GST - Sum of all actual charges before tax'
    },
    
    // ============================================================
    // ACTUAL GST BREAKDOWN - INDIAN GST STRUCTURE
    // ============================================================
    actual_total_gst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total actual GST amount (IGST or CGST+SGST combined)'
    },
    actual_igst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Actual IGST amount for interstate rides'
    },
    actual_cgst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Actual CGST amount for intrastate rides'
    },
    actual_sgst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Actual SGST amount for intrastate rides'
    },
    
    // ============================================================
    // DISCOUNTS AND FINAL AMOUNTS
    // ============================================================
    discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Total discount applied from coupon/promo codes - Deducted from fare'
    },
    final_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Final fare after discount - Amount customer actually pays (Total Including GST - Discount)'
    },

    // ============================================================
    // PENDING CANCELLATION CHARGES
    // ============================================================
    pending_cancellation_applied: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Whether pending cancellation charge was applied to this ride'
    },
    pending_cancellation_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Amount of pending cancellation charge applied to this ride'
    },
    
    // ============================================================
    // DISTANCE AND TIME
    // ============================================================
    estimated_distance: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        comment: 'Journey Distance (KM)'
    },
    actual_distance: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Actual distance (KM)'
    },
    estimated_duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Expected Time (Minutes)'
    },
    actual_duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Actual duration in minutes'
    },
    waiting_time: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Waiting Time (Minutes) - Time between driver arrival and ride start, used for waiting charges'
    },
    
    // ============================================================
    // LOCATION DATA
    // ============================================================
    pickup_address: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    pickup_district: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    pickup_state: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    pickup_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
    },
    pickup_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
    },
    dropoff_address: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    dropoff_district: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    dropoff_state: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    dropoff_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
    },
    dropoff_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
    },
    stop1_address: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    stop1_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    stop1_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    stop2_address: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    stop2_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    stop2_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },

    // ============================================================
    // STATE ID FIELDS 
    // ============================================================
    pickup_state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'states',
            key: 'id'
        },
        comment: 'State ID for pickup location'
    },
    dropoff_state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'states',
            key: 'id'
        },
        comment: 'State ID for dropoff location'
    },
    stop1_state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'states',
            key: 'id'
        },
        comment: 'State ID for stop1 location'
    },
    stop2_state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'states',
            key: 'id'
        },
        comment: 'State ID for stop2 location'
    },

    // ============================================================
    // ENHANCED VEHICLE FILTERING FIELDS 
    // ============================================================
    available_vehicle_types: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON array of vehicle type IDs available for Book Any Vehicle option based on pickup state'
    },
    
    // ============================================================
    // STATUS AND TRACKING
    // ============================================================
    status: {
        type: DataTypes.ENUM(
            'pending',              // Initial status when ride is requested
            'searching_driver',     // Looking for available drivers
            'accepted',             // Driver accepted the ride
            'arrived',              // Driver reached pickup location
            'ride_started',         // Ride is in progress
            'ride_completed',       // Ride finished successfully
            'cancelled',            // After driver acceptance (with penalties)
            'cancelled_by_user',    // Before driver acceptance
            'cancelled_by_driver',  // Driver cancellation 
            'expired',              // Ride request timed out
            'no_drivers_available', // No drivers found in area
            'timeout',              // Driver search timeout
            'scheduling_failed',    // Ride scheduling fails
            'notification_failed',  // Notification sending failed
            'driver_search_failed'  // Driver search process failed
        ),
        allowNull: false,
        defaultValue: 'pending'
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
    },
    payment_method: {
        type: DataTypes.ENUM('cash', 'wallet', 'easebuzz'),
        allowNull: true
    },

    // ============================================================
    // RIDE SHARING FIELDS (LINK SHARING)
    // ============================================================
    share_token: {
        type: DataTypes.STRING(64),
        allowNull: true,
        unique: true,
        comment: 'Unique token for real-time ride sharing link'
    },
    share_token_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when share token was generated'
    },
    is_sharing_enabled: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Flag to enable/disable ride sharing link'
    },
    
    // ============================================================
    // OTP AND VERIFICATION
    // ============================================================
    ride_otp: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    otp_generated_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    otp_verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    end_ride_otp: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    end_otp_generated_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    end_otp_verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_reservation_started: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Flag indicating if reservation ride has started (trip_type = 3 only)'
    },
    reservation_started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when reservation ride was started'
    },

    // ============================================================
    // DATE AND TIME FIELDS FOR SCHEDULED TRIPS
    // ============================================================
    is_scheduled: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Indicates if this is a scheduled ride'
    },
    pickup_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Scheduled pickup date for outstation (type 2) and round-trip (type 3) trips'
    },
    pickup_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Scheduled pickup time for outstation (type 2) and round-trip (type 3) trips'
    },
    
    // ============================================================
    // TIMESTAMPS
    // ============================================================
    requested_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When user initially requested the ride'
    },
    accepted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When driver accepted the ride request'
    },
    driver_distance_at_accept: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Distance between driver and pickup when ride was accepted'
    },
    arrived_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When driver reached the pickup location'
    },
    ride_started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When ride actually started (OTP verified or driver started trip)'
    },
    ride_completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When ride was completed and passenger dropped off'
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When ride was cancelled'
    },
    cancelled_by: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    cancellation_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Reason provided for ride cancellation'
    },

    // ============================================================
    // COMMISSION AND PAYOUT FIELDS
    // ============================================================
    tip_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Tip amount given by passenger to driver'
    },
    commission_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'DEPRECATED: Legacy field - Use commission_value instead. Commission percentage taken by admin (e.g., 15.50 for 15.5%)'
    },
    commission_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Commission value - either percentage (e.g., 15.50 for 15.5%) or fixed amount (e.g., 50.00 for ₹50)'
    },
    commission_type: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage',
        comment: 'Type of commission calculation - percentage or fixed amount'
    },
    commission_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Calculated commission amount taken by admin from total fare'
    },
    driver_payout: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Final amount paid to driver (fare - commission + tip)'
    },
    
    // ============================================================
    // ADDITIONAL DATA
    // ============================================================
    special_instructions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    rating: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '1-5 star rating',
        validate: {
            min: 1,
            max: 5
        }
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_rated: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Flag to check if the ride has been rated by the passenger'
    },
    
    // ============================================================
    // JSON STORAGE FOR COMPLETE BREAKDOWN
    // ============================================================
    fare_breakdown: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Complete estimated fare breakdown as JSON - Backup storage for calculation details and audit trail'
    },
    actual_fare_breakdown: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Complete actual fare breakdown as JSON - Final calculation after ride completion'
    },

    // ============================================================
    // DRIVER NOTIFICATION TRACKING
    // ============================================================
    drivers_notified: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of drivers notified for this ride'
    },
    notified_drivers: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON array of drivers notified with their details (driver_id, distance, notified_at)'
    },
    search_started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When driver search began'
    },
    search_restarted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When driver search was restarted after driver cancellation'
    },
    search_restart_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of times driver search has been restarted (max 1)'
    },

    // ============================================================
    // METADATA FOR ADVANCED TRACKING
    // ============================================================
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Stores cancelled_drivers array, restart_attempts counter, and cancellation details'
    },
    
    // ============================================================
    // BOOK ANY VEHICLE
    // ============================================================
    is_book_any_vehicle: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Indicates if the ride was requested with Book Any Vehicle option'
    },
    eligible_vehicle_type_ids: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON array of eligible vehicle type IDs for Book Any Vehicle requests'
    },
    
    // ============================================================
    // STANDARD TIMESTAMPS
    // ============================================================
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'ride_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            name: 'idx_user_id',
            fields: ['user_id']
        },
        {
            name: 'idx_driver_id',
            fields: ['driver_id']
        },
        {
            name: 'idx_status',
            fields: ['status']
        },
        {
            name: 'idx_requested_at',
            fields: ['requested_at']
        },
        {
            name: 'idx_pickup_location',
            fields: ['pickup_latitude', 'pickup_longitude']
        },
        {
            name: 'idx_dropoff_location',
            fields: ['dropoff_latitude', 'dropoff_longitude']
        },
        {
            name: 'idx_status_created',
            fields: ['status', 'created_at']
        },
        {
            name: 'idx_trip_type',
            fields: ['trip_type']
        },
        {
            name: 'idx_payment_status',
            fields: ['payment_status']
        },
        {
            name: 'idx_fare_range',
            fields: ['final_fare']
        },
        {
            name: 'idx_distance_range',
            fields: ['estimated_distance', 'actual_distance']
        },
        {
            name: 'idx_pickup_schedule',
            fields: ['pickup_date', 'pickup_time']
        },
        {
            name: 'idx_trip_type_date',
            fields: ['trip_type', 'pickup_date']
        },
        {
            name: 'idx_pending_cancellation',
            fields: ['pending_cancellation_applied', 'pending_cancellation_amount']
        },
        {
            name: 'idx_search_restart',
            fields: ['search_restart_count', 'status']
        },
        {
            name: 'idx_advance_payment_id',
            fields: ['advance_payment_id']
        },
        {
            name: 'idx_package_id',
            fields: ['package_id']
        },
        {
            name: 'idx_is_advance_paid',
            fields: ['is_advance_paid']
        },
        {
            name: 'idx_transferred_rides',
            fields: ['is_transferred_to_admin', 'transferred_at']
        },
        {
            name: 'idx_transferred_by_driver',
            fields: ['transferred_by_driver_id']
        },
        {
            name: 'idx_ride_number',
            fields: ['ride_number'],
            unique: true
        }
    ]
});

module.exports = RideRequests;