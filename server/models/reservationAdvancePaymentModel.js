const { DataTypes }             = require('sequelize');
const { sequelize }             = require('../config/db');
const ReservationAdvancePayment = sequelize.define(
    'ReservationAdvancePayment',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: 'User who made the advance payment'
        },
        transaction_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Easebuzz transaction ID (starts with ADV_)'
        },
        package_id: {
            type: DataTypes.INTEGER,
            allowNull: true, 
            references: {
                model: 'packages',
                key: 'id',
            },
            comment: 'Package for which advance is paid (NULL for custom trips)'
        },
        vehicle_type_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'vehicle_types',
                key: 'id',
            },
            comment: 'Selected vehicle type'
        },
        trip_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3,
            comment: 'Trip type (3 = Reservation)'
        },
        // NEW FIELDS FOR CUSTOM TRIPS
        is_custom_trip: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'True if this is a custom trip (not a package-based trip)'
        },
        custom_km: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Custom kilometers for custom trips'
        },
        custom_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Number of days for custom trips'
        },
        // END NEW FIELDS
        estimated_total_fare: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Total estimated fare for the trip'
        },
        advance_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Advance amount paid (from package or calculated for custom)'
        },
        remaining_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Remaining amount to be paid after trip completion'
        },
        pickup_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Scheduled pickup date'
        },
        pickup_time: {
            type: DataTypes.TIME,
            allowNull: false,
            comment: 'Scheduled pickup time'
        },
        pickup_location: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Pickup location details (JSON string with address, lat, lng, district, state)'
        },
        drop_location: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Drop location details (JSON string with address, lat, lng, district, state)'
        },
        payment_status: {
            type: DataTypes.ENUM('pending', 'success', 'failed', 'refunded'),
            allowNull: false,
            defaultValue: 'pending',
            comment: 'Payment status'
        },
        status: {
            type: DataTypes.ENUM('pending', 'paid', 'used', 'expired', 'refunded', 'failed'),
            allowNull: false,
            defaultValue: 'pending',
            comment: 'Overall status - used when ride is created'
        },
        ride_request_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'ride_requests',
                key: 'id',
            },
            comment: 'Linked ride request ID (after ride is created)'
        },
        gateway_transaction_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Easebuzz transaction ID (easepayid)'
        },
        gateway_payment_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Gateway payment ID'
        },
        bank_ref_num: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Bank reference number'
        },
        payment_response: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Complete payment gateway response (JSON)'
        },
        paid_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when payment was successful'
        },
        used_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when advance was used for ride creation'
        },
        failed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when payment failed'
        },
        refunded_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when refund was processed'
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Expiry timestamp (24 hours after payment)'
        },
        failure_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Reason if payment failed'
        },
        refund_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Reason for refund'
        },
        metadata: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Additional metadata (JSON)'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: 'reservation_advance_payments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['transaction_id'],
                name: 'uk_transaction_id',
            },
            {
                fields: ['user_id'],
                name: 'idx_user_id',
            },
            {
                fields: ['payment_status'],
                name: 'idx_payment_status',
            },
            {
                fields: ['status'],
                name: 'idx_status',
            },
            {
                fields: ['ride_request_id'],
                name: 'idx_ride_request_id',
            },
            {
                fields: ['pickup_date'],
                name: 'idx_pickup_date',
            },
            {
                fields: ['is_custom_trip'], 
                name: 'idx_is_custom_trip',
            }
        ],
        hooks: {
            beforeCreate: async (payment) => {
                payment.remaining_amount = parseFloat(payment.estimated_total_fare) - parseFloat(payment.advance_amount);
                // Set expiry (24 hours from now)
                const expiryDate   = new Date();
                expiryDate.setHours(expiryDate.getHours() + 24);
                payment.expires_at = expiryDate;
            }
        }
    }
);
module.exports = ReservationAdvancePayment;