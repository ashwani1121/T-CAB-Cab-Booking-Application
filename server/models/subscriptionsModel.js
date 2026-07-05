const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Subscription  = sequelize.define(
    'Subscription',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Plan name (e.g., Basic, Premium, Gold)'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Plan description and benefits'
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Subscription price'
        },
        duration_type: {
            type: DataTypes.ENUM('days', 'rides'),
            allowNull: false,
            defaultValue: 'days',
            comment: 'Subscription type: days or ride count'
        },
        duration_value: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Number of days or rides included'
        },
        commission_waiver: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether commission is waived (1=yes, 0=no)'
        },
        max_daily_rides: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Maximum rides per day (NULL = unlimited)'
        },
        is_popular: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            comment: 'Mark as popular plan'
        },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            comment: 'Display order'
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        updated_by: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'archived'),
            allowNull: false,
            defaultValue: 'active'
        }
    },
    {
        tableName: 'subscription_plans',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['status'] },
            { fields: ['duration_type'] },
            { fields: ['sort_order'] }
        ]
    }
);
module.exports = Subscription;