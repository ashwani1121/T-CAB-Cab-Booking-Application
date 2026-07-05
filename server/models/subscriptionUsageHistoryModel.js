const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const SubscriptionUsageHistory = sequelize.define('subscription_usage_history', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    subscription_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Foreign key to driver_subscriptions'
    },
    ride_request_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Foreign key to ride_requests'
    },
    used_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Timestamp when subscription was used'
    },
    commission_saved: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Commission amount saved on this ride'
    },
    ride_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Ride fare for reference'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional usage details'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'subscription_usage_history',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            name: 'idx_subscription_id',
            fields: ['subscription_id']
        },
        {
            name: 'idx_ride_request_id',
            fields: ['ride_request_id']
        },
        {
            name: 'idx_used_at',
            fields: ['used_at']
        }
    ]
});
module.exports = SubscriptionUsageHistory;