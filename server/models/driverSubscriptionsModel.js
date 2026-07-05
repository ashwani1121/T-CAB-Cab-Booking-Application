const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const DriverSubscriptions = sequelize.define('driver_subscriptions', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    driver_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Foreign key to users table'
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Foreign key to subscription_plans'
    },
    transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique transaction identifier'
    },
    subscription_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Human-readable subscription number'
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Subscription start date'
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Subscription end date (for duration_type=days)'
    },
    rides_remaining: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Remaining rides (for duration_type=rides)'
    },
    rides_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of rides used'
    },
    total_rides: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total rides included (for duration_type=rides)'
    },
    amount_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Amount paid for subscription'
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
    },
    payment_method: {
        type: DataTypes.ENUM('cash', 'easebuzz', 'wallet', 'bank_transfer'),
        allowNull: true
    },
    payment_gateway: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'easebuzz'
    },
    gateway_transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    gateway_payment_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    gateway_order_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'cancelled', 'suspended'),
        allowNull: false,
        defaultValue: 'active'
    },
    auto_renew: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: 'Auto-renewal enabled'
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Cancellation timestamp'
    },
    cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional subscription details'
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
    tableName: 'driver_subscriptions',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'idx_driver_id',
            fields: ['driver_id']
        },
        {
            name: 'idx_plan_id',
            fields: ['plan_id']
        },
        {
            name: 'idx_status',
            fields: ['status']
        },
        {
            name: 'idx_payment_status',
            fields: ['payment_status']
        },
        {
            name: 'idx_start_end_date',
            fields: ['start_date', 'end_date']
        },
        {
            name: 'idx_active_subscriptions',
            fields: ['driver_id', 'status', 'end_date']
        }
    ]
});
module.exports = DriverSubscriptions;