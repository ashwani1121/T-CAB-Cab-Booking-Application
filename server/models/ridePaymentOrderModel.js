const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const RidePaymentOrder = sequelize.define('RidePaymentOrder', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    order_id: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        comment: 'Unique order identifier (e.g., RIDE_123_abc123)'
    },
    ride_request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ride_requests',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Reference to the ride request'
    },
    transaction_id: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        comment: 'Payment gateway transaction ID (txnid)'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Payment amount'
    },
    payment_type: {
        type: DataTypes.ENUM('ride_fare', 'extra_charges', 'full_payment'),
        defaultValue: 'ride_fare',
        comment: 'Type of payment: ride_fare (remaining after advance), extra_charges, or full_payment'
    },
    customer_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Customer name for payment'
    },
    customer_email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Customer email for payment'
    },
    customer_phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Customer phone number'
    },
    payment_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Easebuzz payment URL for completing payment'
    },
    qr_code: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Base64 encoded QR code image data URL'
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'success', 'failed', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Current status of the payment'
    },
    gateway_transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Easebuzz transaction ID (easepayid) from gateway response'
    },
    gateway_payment_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Additional payment ID from gateway if provided'
    },
    breakdown: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Fare breakdown JSON: base_fare, distance_charge, waiting_charge, bata_charge, gst, etc.'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional metadata: ride details, user info, webhook responses, etc.'
    },
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when payment was successfully completed'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Payment link expiry time (typically 24 hours from creation)'
    },
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
    tableName: 'ride_payment_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            name: 'idx_order_id',
            fields: ['order_id']
        },
        {
            name: 'idx_transaction_id',
            fields: ['transaction_id']
        },
        {
            name: 'idx_ride_request_id',
            fields: ['ride_request_id']
        },
        {
            name: 'idx_payment_status',
            fields: ['payment_status']
        },
        {
            name: 'idx_gateway_transaction_id',
            fields: ['gateway_transaction_id']
        },
        {
            name: 'idx_created_at',
            fields: ['created_at']
        },
        {
            name: 'idx_expires_at',
            fields: ['expires_at']
        }
    ]
});

module.exports = RidePaymentOrder;