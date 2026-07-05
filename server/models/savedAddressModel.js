const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const SavedAddress  = sequelize.define(
    'SavedAddress', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.BIGINT, 
            allowNull: false,
            references: {
                model: 'users', 
                key: 'id'
            }
        },
        type: {
            type: DataTypes.ENUM('search','home', 'work', 'other'),
            allowNull: false,
            defaultValue: 'other'
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true
        },
        frequency_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        last_used_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        status: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        }
}, {
    tableName: 'saved_address',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
module.exports = SavedAddress;