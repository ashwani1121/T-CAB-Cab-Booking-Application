const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User          = sequelize.define(
    'User', {
        id: {
            type: DataTypes.BIGINT, 
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: false
        },
        gender: {
            type: DataTypes.ENUM('Male', 'Female', 'Others'),
            allowNull: false
        },
        profile: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true
        },
        fcm_token: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        remember_token: {
            type: DataTypes.STRING,
            allowNull: true
        },
        pending_cancellation_charge: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Pending cancellation charge to be deducted from next ride'
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1, 
            validate: {
                isIn: [[0, 1]], 
            },
        }
    },
    {
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
module.exports = User;