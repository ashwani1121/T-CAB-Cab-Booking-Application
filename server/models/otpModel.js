const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Otp           = sequelize.define(
    'Otp', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        mobile: {
            type: DataTypes.STRING(10),
            allowNull: false,
            validate: {
                is: /^[0-9]{10}$/
            }
        },
        otp: {
            type: DataTypes.STRING(6),
            allowNull: false
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
}, {
    tableName: 'otp',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
module.exports = Otp;