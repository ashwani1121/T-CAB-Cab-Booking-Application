const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const CancellationPolicy = sequelize.define(
    'CancellationPolicy', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        hours: {
            type: DataTypes.INTEGER, 
            allowNull: false
        },
        percentage: {
            type: DataTypes.INTEGER, 
            allowNull: false
        },
        status: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        }
    }, {
        tableName: 'cancellation_policy',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
module.exports = CancellationPolicy;
